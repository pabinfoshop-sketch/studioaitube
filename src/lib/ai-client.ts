// ── Client-side AI calls ──────────────────────────────────────────
// Bypasses server function timeouts by calling AI providers directly
// from the browser. Keys come from (in priority order):
//   1) VITE_* env vars injected at build (vite.config.ts define mapping)
//   2) /_env.json static file (generated at build time by vite.config.ts)
//   3) /api/env endpoint as runtime fallback
//   4) localStorage (user-configured via Settings modal)

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
  try {
    const r = await fetch("/api/env", { signal: AbortSignal.timeout(5000) });
    if (r.ok) return await r.json();
  } catch { /* ignore */ }
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

    // 3) Se ainda faltam chaves, tenta /api/env (server-side fallback)
    if (!_openRouterKey || !_replicateKey) {
      const apiEnv = await loadFromApiEnv();
      if (!_openRouterKey) _openRouterKey = apiEnv.OPENROUTER_API_KEY || "";
      if (!_replicateKey) _replicateKey = apiEnv.REPLICATE_API_KEY || "";
      if (!_elevenLabsKey) _elevenLabsKey = apiEnv.ELEVENLABS_API_KEY || "";
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
  const k = hasKeys();
  const result: Record<string, any> = {
    free: { provider: "free", ok: true, statusLabel: "TTS grátis ativo", raw: { tts: "google-free" } },
    openrouter: { provider: "openrouter", ok: false, error: k.openrouter ? "verificando..." : "sem chave" },
    replicate: { provider: "replicate", ok: false, error: k.replicate ? "verificando..." : "sem chave" },
    order: ["free", "openrouter-free", "openrouter-cheap", "replicate-video"],
  };

  // 1) PRIMEIRO: tenta /api/balance (server-side, sem CORS)
  try {
    const r = await fetch("/api/balance", { signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const server: any = await r.json();
      if (server.openrouter?.ok) result.openrouter = { provider: "openrouter", ...server.openrouter };
      if (server.replicate?.ok) result.replicate = { provider: "replicate", ...server.replicate };
    }
  } catch { /* server endpoint indisponível — tenta direto */ }

  // 2) FALLBACK: chamada direta do browser (OpenRouter aceita CORS)
  if (!result.openrouter.ok && k.openrouter) {
    // Tenta /v1/credits primeiro (saldo real)
    try {
      const r = await fetch("https://openrouter.ai/api/v1/credits", {
        headers: orHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d: any = await r.json();
        result.openrouter = { provider: "openrouter", ...parseOpenRouterCredits(d.data ?? {}) };
      } else {
        throw new Error(`credits ${r.status}`);
      }
    } catch {
      // Fallback para /v1/auth/key
      try {
        const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: orHeaders(),
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const d: any = await r.json();
          result.openrouter = { provider: "openrouter", ...parseOpenRouterData(d.data ?? {}) };
        }
      } catch (e: any) {
        result.openrouter = { ok: false, error: e?.message || "falha de rede" };
      }
    }
  }

  // Replicate NUNCA funciona via browser (CORS bloqueado)
  if (!result.replicate.ok && k.replicate) {
    result.replicate = { ok: false, error: "proxy indisponível" };
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
  await ensureKeys();
  if (!_openRouterKey) throw new Error("Chave OpenRouter não configurada. Adicione OPENROUTER_API_KEY nas variáveis de ambiente.");

  const prompt = `Você é roteirista e especialista em SEO de canais dark do YouTube (mistério, terror, sobrenatural, true crime).
Crie um roteiro em ${language} sobre: "${topic}".
Divida em exatamente ${sceneCount} cenas. Cada narração tem 3 a 5 frases densas, atmosfera sombria, ritmo cinematográfico e ganchos.
Para cada cena escreva também um imagePrompt em INGLÊS descrevendo uma imagem cinematográfica dark, atmosférica, 16:9, sem texto na imagem.

Também gere metadados otimizados para RANKEAR no YouTube:
- seoTitle: máx 70 caracteres, com curiosity gap + emoji + palavra-chave forte
- seoDescription: 3 parágrafos — 1º com hook + palavra-chave; 2º expandindo o mistério; 3º com CTA "Inscreva-se" + 5 hashtags
- tags: array de 15-20 tags misturando palavra-chave principal, long-tail em português e termos do nicho
- thumbnailPrompt em INGLÊS: cena impactante, expressão facial marcante, cores contrastantes, sem texto, YouTube thumbnail style
- thumbnailText: 3-6 palavras EM CAIXA ALTA para sobrepor na thumb

Responda APENAS com JSON válido, sem markdown, no formato:
{"title":"","hook":"","seoTitle":"","seoDescription":"","tags":[],"thumbnailPrompt":"","thumbnailText":"","scenes":[{"title":"","narration":"","imagePrompt":""}]}`;

  const errors: string[] = [];
  for (const model of SCRIPT_MODELS) {
    try {
      const r = await fetch(OR_URL, {
        method: "POST",
        headers: orHeaders(),
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        errors.push(`${model}: ${r.status} ${t.slice(0, 80)}`);
        continue;
      }
      const j = await r.json();
      const text: string = j?.choices?.[0]?.message?.content ?? "";
      if (!text) { errors.push(`${model}: resposta vazia`); continue; }
      const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) { errors.push(`${model}: sem JSON`); continue; }
      return { ...JSON.parse(match[0]), modelUsed: `openrouter/${model}` };
    } catch (e: any) {
      errors.push(`${model}: ${e?.message || "erro"}`);
    }
  }
  throw new Error(`Todos os modelos falharam: ${errors.join(" | ")}`);
}

// ── Image Generation ──

const IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image",
];

export async function clientImage(prompt: string): Promise<{ b64: string; mime: string; modelUsed: string }> {
  await ensureKeys();
  if (!_openRouterKey) throw new Error("Chave OpenRouter não configurada. Adicione OPENROUTER_API_KEY nas variáveis de ambiente.");

  const fullPrompt = `Cinematic dark atmospheric 16:9 image, no text: ${prompt}`;
  const errors: string[] = [];
  for (const model of IMAGE_MODELS) {
    try {
      const r = await fetch(OR_URL, {
        method: "POST",
        headers: orHeaders(),
        body: JSON.stringify({ model, messages: [{ role: "user", content: fullPrompt }], modalities: ["image", "text"] }),
      });
      if (!r.ok) {
        errors.push(`${model}: ${r.status}`);
        continue;
      }
      const j: any = await r.json();
      const imgs = j?.choices?.[0]?.message?.images;
      const url: string | undefined = imgs?.[0]?.image_url?.url;
      if (url?.startsWith("data:image")) {
        const b64 = url.split(",")[1];
        return { b64, mime: "image/png", modelUsed: `openrouter/${model}` };
      }
      errors.push(`${model}: sem imagem no retorno`);
    } catch (e: any) {
      errors.push(`${model}: ${e?.message || "erro"}`);
    }
  }
  throw new Error(`Falha ao gerar imagem: ${errors.join(" | ")}`);
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
  await ensureKeys();
  if (!_replicateKey) throw new Error("Chave Replicate não configurada. Adicione REPLICATE_API_KEY nas variáveis de ambiente do Netlify.");

  // 1) Upload image
  onProgress?.("Enviando imagem para Replicate...");
  const { blob } = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append("content", blob, "frame.png");
  const upRes = await fetch(`${REPLICATE_URL}/files`, { method: "POST", headers: rpHeaders(), body: form });
  if (!upRes.ok) throw new Error(`Upload Replicate: ${upRes.status}`);
  const upJson: any = await upRes.json();
  const imageUrl: string = upJson?.urls?.get;
  if (!imageUrl) throw new Error("Upload sem URL.");

  // 2) Create prediction
  onProgress?.("Criando predição de vídeo...");
  const createRes = await fetch(`${REPLICATE_URL}/models/${REPLICATE_MODEL}/predictions`, {
    method: "POST",
    headers: { ...rpHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ input: { image: imageUrl, prompt: prompt || "cinematic subtle motion, camera drift, atmospheric" } }),
  });
  if (createRes.status === 402) throw new Error("Conta Replicate sem créditos. Ative billing em replicate.com/account/billing.");
  if (!createRes.ok) throw new Error(`Replicate ${createRes.status}`);
  const pred: any = await createRes.json();
  const id = pred?.id;
  if (!id) throw new Error("Sem id de predição.");

  // 3) Poll
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
    onProgress?.(`Gerando vídeo... (${i + 1}/${Math.min(40, 80)})`);
    const r = await fetch(`${REPLICATE_URL}/predictions/${id}`, { headers: rpHeaders() });
    const j: any = await r.json();
    if (j.status === "succeeded") {
      const out = Array.isArray(j.output) ? j.output[0] : j.output;
      if (!out) throw new Error("Sem output de vídeo.");
      return { videoUrl: out, modelUsed: `replicate/${REPLICATE_MODEL}` };
    }
    if (j.status === "failed" || j.status === "canceled") throw new Error(`Predição ${j.status}: ${j?.error ?? "sem detalhe"}`);
  }
  throw new Error("Timeout aguardando vídeo.");
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