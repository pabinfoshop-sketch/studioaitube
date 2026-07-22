// Browser helpers call local API routes so private AI credentials stay server-side.

// ── Balance ──

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

  throw new Error("Falha ao gerar áudio. Servidor TTS indisponível.");
}

// ── Animate (Replicate image→video via server proxy) ──

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