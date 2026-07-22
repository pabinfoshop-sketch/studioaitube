// ── Client-side AI calls ──────────────────────────────────────────
// Browser helpers call local API routes so private AI credentials stay server-side.

// ── Lazy key loading ───────────────────────────────────────────────

const LS_KEYS = "aidc.api_keys";
let _keysLoaded = false;
let _keysLoading: Promise<void> | null = null;
let _openRouterKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || "";
let _replicateKey = (import.meta as any).env?.VITE_REPLICATE_API_KEY || "";
let _elevenLabsKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || "";

function loadFromLocalStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEYS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

/** Save keys to localStorage for persistence across sessions */
export function saveKeysToLocalStorage(keys: { openrouter?: string; replicate?: string; elevenlabs?: string }) {
  const existing = loadFromLocalStorage();
  if (keys.openrouter !== undefined) existing.OPENROUTER_API_KEY = keys.openrouter;
  if (keys.replicate !== undefined) existing.REPLICATE_API_KEY = keys.replicate;
  if (keys.elevenlabs !== undefined) existing.ELEVENLABS_API_KEY = keys.elevenlabs;
  localStorage.setItem(LS_KEYS, JSON.stringify(existing));
  // Update in-memory keys immediately
  if (keys.openrouter !== undefined) _openRouterKey = keys.openrouter;
  if (keys.replicate !== undefined) _replicateKey = keys.replicate;
  if (keys.elevenlabs !== undefined) _elevenLabsKey = keys.elevenlabs;
  _keysLoaded = true; // Force reload next time
}

/** Get current in-memory keys (for Settings UI) */
export function getCurrentKeys() {
  return { openrouter: _openRouterKey, replicate: _replicateKey, elevenlabs: _elevenLabsKey };
}

async function loadFromEnvJson(): Promise<Record<string, string>> {
  try {
    const r = await fetch("/_env.json", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (r.ok) return await r.json();
  } catch { /* ignore */ }
  return {};
}

async function loadFromApiEnv(): Promise<Record<string, string>> {
  return {};
}

async function ensureKeys(): Promise<void> {
  if (_keysLoaded) return;
  if (_keysLoading) return _keysLoading;

  // Se as chaves já foram injetadas no build, não precisa buscar
  if (_openRouterKey && _replicateKey) {
    _keysLoaded = true;
    return;
  }

  _keysLoading = (async () => {
    // 1) Tenta localStorage (user-configured keys — highest runtime priority)
    const lsKeys = loadFromLocalStorage();
    if (!_openRouterKey) _openRouterKey = lsKeys.OPENROUTER_API_KEY || "";
    if (!_replicateKey) _replicateKey = lsKeys.REPLICATE_API_KEY || "";
    if (!_elevenLabsKey) _elevenLabsKey = lsKeys.ELEVENLABS_API_KEY || "";

    // 2) Tenta _env.json (arquivo estático gerado no build — funciona em qualquer plataforma)
    if (!_openRouterKey || !_replicateKey) {
      const envJson = await loadFromEnvJson();
      if (!_openRouterKey) _openRouterKey = envJson.OPENROUTER_API_KEY || "";
      if (!_replicateKey) _replicateKey = envJson.REPLICATE_API_KEY || "";
      if (!_elevenLabsKey) _elevenLabsKey = envJson.ELEVENLABS_API_KEY || "";
    }

    _keysLoaded = true;
    _keysLoading = null;
  })();
  return _keysLoading;
}

function hasKeys() {
  return { openrouter: !!_openRouterKey, replicate: !!_replicateKey, elevenlabs: !!_elevenLabsKey };
}

// ── Dynamic headers (built after keys are loaded) ──

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

function orHeaders(): Record<string, string> {
  return _openRouterKey
    ? { Authorization: `Bearer ${_openRouterKey}`, "Content-Type": "application/json", "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://studioaitube.pages.dev", "X-Title": "StudioAITube" }
    : {};
}

const REPLICATE_URL = "https://api.replicate.com/v1";

function rpHeaders(): Record<string, string> {
  return _replicateKey
    ? { Authorization: `Bearer ${_replicateKey}` }
    : {};
}

// ── Balance (server-side first, browser fallback) ──

function parseOpenRouterCredits(data: any) {
  const credits = Number(data.total_credits ?? 0);
  const usage = Number(data.total_usage ?? 0);
  const balanceUsd = Math.max(0, credits - usage);
  return { ok: true as const, balanceUsd, usageUsd: usage, limitUsd: credits, isFreeTier: false, statusLabel: `$${balanceUsd.toFixed(2)}` };
}

function parseOpenRouterData(data: any) {
  const isFree = !!data.is_free_tier;
  const hasLimit = data.limit != null;
  const balanceUsd = hasLimit ? Number(data.limit_remaining) : null;
  const usageUsd = Number(data.usage ?? 0);
  const limitUsd = hasLimit ? Number(data.limit) : null;
  const statusLabel = isFree
    ? "grátis / uso ilimitado"
    : hasLimit
      ? `saldo $${balanceUsd!.toFixed(2)}`
      : `usado $${usageUsd < 0.01 ? usageUsd.toFixed(4) : usageUsd.toFixed(2)} este mês`;
  return { ok: true as const, balanceUsd, usageUsd, limitUsd, isFreeTier: isFree, statusLabel };
}

export async function clientBalance(): Promise<Record<string, any>> {
  await ensureKeys();
  const result: Record<string, any> = {
    free: { provider: "free", ok: true, statusLabel: "TTS grátis ativo", raw: { tts: "google-free" } },
    openrouter: { provider: "openrouter", ok: false, error: "verificando..." },
    replicate: { provider: "replicate", ok: false, error: "verificando..." },
    order: ["free", "openrouter-free", "openrouter-cheap", "replicate-video"],
  };

  // Chaves ficam no backend; retorna também erros do servidor para não mascarar credenciais inválidas.
  try {
    const r = await fetch("/api/balance", { signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const server: any = await r.json();
      result.openrouter = { provider: "openrouter", ...(server.openrouter ?? { ok: false, error: "sem resposta" }) };
      result.replicate = { provider: "replicate", ...(server.replicate ?? { ok: false, error: "sem resposta" }) };
      return result;
    }
  } catch (e: any) {
    result.openrouter = { ok: false, error: e?.message || "falha de rede" };
    result.replicate = { ok: false, error: e?.message || "falha de rede" };
  }

  return result;
}

// ── Script Generation ──

const SCRIPT_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3.1",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-4o-mini",
  "google/gemini-2.5-flash",
];

export async function clientScript(topic: string, sceneCount: number, language = "pt-BR") {
  const r = await fetch("/api/script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, sceneCount, language }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(await r.text().catch(() => "Falha ao gerar roteiro"));
  return await r.json();
}

// ── Image Generation ──

const IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image",
];

export async function clientImage(prompt: string): Promise<{ b64: string; mime: string; modelUsed: string }> {
  const r = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(await r.text().catch(() => "Falha ao gerar imagem"));
  return await r.json();
}

// ── TTS (usa /api/tts server-side como proxy — sem CORS) ──

export async function clientTts(text: string, voice?: string): Promise<Blob> {
  // Tenta server-side primeiro (Google TTS sem CORS + ElevenLabs fallback)
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const provider = r.headers.get("X-TTS-Provider");
      if (provider) console.log(`[TTS] gerado via ${provider}`);
      return await r.blob();
    }
    console.warn(`[TTS] server retornou ${r.status}:`, await r.text().catch(() => ""));
  } catch (e: any) {
    console.warn("[TTS] server indisponível:", e?.message);
  }

  // Fallback direto: ElevenLabs (aceita CORS)
  if (_elevenLabsKey) {
    const VOICE_MAP: Record<string, string> = { onyx: "JBFqnCBsd6RMkjVDRZzb", alloy: "EXAVITQu4vr4xnSDxMaL", echo: "TX3LPaxmHKxFdv7VOQHJ" };
    const voiceId = VOICE_MAP[voice || "onyx"] || VOICE_MAP.onyx;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": _elevenLabsKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
      });
      if (r.ok) return await r.blob();
    } catch { /* ignore */ }
  }

  throw new Error("Falha ao gerar áudio. Servidor TTS indisponível.");
}

// ── Animate (Replicate image→video, client-side polling) ──

const REPLICATE_MODEL = "wan-video/wan-2.2-i2v-fast";

function dataUrlToBlob(dataUrl: string): { blob: Blob; name: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("imageDataUrl inválido");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const mime = m[1];
  const ext = mime.includes("png") ? "png" : "jpg";
  return { blob: new Blob([bytes], { type: mime }), name: `frame.${ext}` };
}

export async function clientAnimate(imageDataUrl: string, prompt: string, onProgress?: (msg: string) => void): Promise<{ videoUrl: string; modelUsed: string }> {
  onProgress?.("Gerando vídeo no backend...");
  const r = await fetch("/api/animate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, prompt }),
    signal: AbortSignal.timeout(300000),
  });
  if (!r.ok) throw new Error(await r.text().catch(() => "Falha ao animar cena"));
  return await r.json();
}

// ── TikTok AI: Auto-Captions (Whisper via server proxy) ──

export type CaptionSegment = { start: number; end: number; text: string; words?: { word: string; start: number; end: number }[] };

export async function clientCaptions(audioBlobOrUrl: Blob | string, onProgress?: (msg: string) => void): Promise<{ captions: CaptionSegment[]; modelUsed: string }> {
  onProgress?.("Preparando áudio para transcrição…");

  let audioUrl: string;
  if (typeof audioBlobOrUrl === "string") {
    audioUrl = audioBlobOrUrl;
  } else {
    // Upload audio blob to a temp host first, then send URL to server
    onProgress?.("Hospedando áudio temporário…");
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time", "1h");
    form.append("fileToUpload", audioBlobOrUrl, "audio.mp3");
    const upRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: form });
    const uploadedUrl = (await upRes.text()).trim();
    if (!uploadedUrl.startsWith("http")) throw new Error("Falha ao hospedar áudio para transcrição.");
    audioUrl = uploadedUrl;
  }

  onProgress?.("Gerando legendas com IA…");
  const r = await fetch("/api/captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioUrl, language: "pt" }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Legendas: ${err}`);
  }
  const data: any = await r.json();
  onProgress?.("Legendas geradas!");
  return { captions: data.captions ?? [], modelUsed: data.modelUsed ?? "replicate/whisper" };
}

// ── TikTok AI: Background Music (MusicGen via server proxy) ──

export async function clientMusic(prompt: string, duration: number, mood: string = "dark suspense horror", onProgress?: (msg: string) => void): Promise<{ audioUrl: string; modelUsed: string }> {
  onProgress?.("Gerando música de fundo com IA…");
  const r = await fetch("/api/music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, duration, mood }),
    signal: AbortSignal.timeout(300000),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Música: ${err}`);
  }
  const data: any = await r.json();
  onProgress?.("Música gerada!");
  return { audioUrl: data.audioUrl, modelUsed: data.modelUsed ?? "replicate/musicgen" };
}