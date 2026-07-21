/**
 * Canvas + MediaRecorder video assembler
 * Replaces ffmpeg.wasm — no 30MB download, works on mobile, much faster.
 * Outputs WebM (accepted by YouTube).
 */

export type AssembleEvent =
  | { type: "message"; message: string }
  | { type: "log"; message: string }
  | { type: "engine"; source: string }
  | { type: "scene-start"; index: number; total: number }
  | { type: "scene-render"; index: number; total: number }
  | { type: "scene-download"; index: number; total: number; item: string; pct: number }
  | { type: "scene-done"; index: number; total: number }
  | { type: "concat"; total: number }
  | { type: "done" }
  | { type: "ffmpeg-progress"; progress: number; time: number; index: number }
  | { type: "engine-download"; pct: number; mb: string };

type ProgressHandler = (msg: string, event?: AssembleEvent) => void;

function emit(onProgress: ProgressHandler, message: string, event?: AssembleEvent) {
  onProgress(message, event ?? { type: "message", message });
}

function isCrossOrigin(url: string): boolean {
  try {
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return false;
    const u = new URL(url, window.location.origin);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

async function fetchImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url.slice(0, 80)}`));
    img.src = isCrossOrigin(url) ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
  });
}

async function fetchAudioBlob(url: string): Promise<Blob> {
  if (isCrossOrigin(url)) {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      return await res.blob();
    } catch (e) {
      console.warn("[proxy audio failed, trying direct]", e);
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Áudio HTTP ${res.status}`);
  return await res.blob();
}

function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = url;
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (isFinite(d) && d > 0) resolve(d);
      else reject(new Error("duração inválida"));
    };
    a.onerror = () => reject(new Error("falha ao ler áudio"));
  });
}

/** Ken Burns styles */
const KB_STYLES = [
  { zoom: (t: number) => 1.0 + t * 0.3,  ox: (t: number, _: number) => 0, oy: (t: number, _: number) => 0 },       // zoom in center
  { zoom: (t: number) => 1.35 - t * 0.3, ox: (_: number, __: number) => 0, oy: (_: number, __: number) => 0 },      // zoom out center
  { zoom: (_: number) => 1.25,           ox: (t: number) => -t * 0.2,  oy: (_: number) => 0 },                    // pan right
  { zoom: (_: number) => 1.25,           ox: (t: number) => -(1 - t) * 0.2, oy: (_: number) => 0 },              // pan left
  { zoom: (_: number) => 1.25,           ox: (_: number) => 0, oy: (t: number) => -t * 0.15 },                   // pan down
];

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number, H: number,
  t: number, styleIndex: number,
) {
  const style = KB_STYLES[styleIndex % KB_STYLES.length];
  const zoom = style.zoom(t);
  const ox = style.ox(t, zoom);
  const oy = style.oy(t, zoom);

  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Calculate cover dimensions
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = W / H;
  let drawW: number, drawH: number;
  if (imgAspect > canvasAspect) {
    drawH = H * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = W * zoom;
    drawH = drawW / imgAspect;
  }

  const x = (W - drawW) / 2 + ox * W;
  const y = (H - drawH) / 2 + oy * H;
  ctx.drawImage(img, x, y, drawW, drawH);

  // Subtle vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Cinematic bars
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H * 0.06);
  ctx.fillRect(0, H * 0.94, W, H * 0.06);
}

export type SceneAsset = { imageUrl: string; audioUrl: string; videoUrl?: string };

/**
 * Render a single scene (image + Ken Burns) to a video Blob
 */
async function renderSceneToBlob(
  index: number,
  scene: SceneAsset,
  durationSec: number,
  onProgress: ProgressHandler,
  totalScenes: number,
): Promise<Blob> {
  const FPS = 24;
  const W = 1280;
  const H = 720;
  const totalFrames = Math.round(durationSec * FPS);

  // Load image
  emit(onProgress, `Baixando imagem cena ${index + 1}/${totalScenes}…`, { type: "scene-download", index, total: totalScenes, item: "imagem", pct: 20 });
  const img = await fetchImage(scene.imageUrl);

  // Load audio as blob
  emit(onProgress, `Baixando áudio cena ${index + 1}/${totalScenes}…`, { type: "scene-download", index, total: totalScenes, item: "áudio", pct: 50 });
  const audioBlob = await fetchAudioBlob(scene.audioUrl);
  const audioUrl = URL.createObjectURL(audioBlob);

  // Setup canvas
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Setup MediaRecorder with audio
  const stream = canvas.captureStream(FPS);
  const audioEl = new Audio(audioUrl);
  audioEl.crossOrigin = "anonymous";
  let audioCtx: AudioContext | null = null;
  let audioSource: MediaStreamAudioSourceNode | null = null;

  try {
    audioCtx = new AudioContext();
    audioSource = audioCtx.createMediaElementSource(audioEl);
    const dest = audioCtx.createMediaStreamDestination();
    audioSource.connect(dest);
    audioSource.connect(audioCtx.destination);
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch (e) {
    console.warn("[audio context failed, recording without audio track]", e);
  }

  // Try VP9 first (better quality), fall back to VP8
  const mimeVP9 = "video/webm;codecs=vp9,opus";
  const mimeVP8 = "video/webm;codecs=vp8,opus";
  const mime = MediaRecorder.isTypeSupported(mimeVP9) ? mimeVP9 : mimeVP8;
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (e) => reject(new Error(`MediaRecorder erro: ${e}`));
    recorder.onstop = () => {
      URL.revokeObjectURL(audioUrl);
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    emit(onProgress, `Renderizando cena ${index + 1}/${totalScenes}…`, { type: "scene-render", index, total: totalScenes });
    recorder.start(100); // collect data every 100ms

    // Start audio playback synced with rendering
    audioEl.play().catch(() => {});

    let frame = 0;
    const intervalMs = 1000 / FPS;

    function renderLoop() {
      if (frame >= totalFrames) {
        audioEl.pause();
        audioEl.currentTime = 0;
        if (audioSource) { audioSource.disconnect(); }
        if (audioCtx) { audioCtx.close().catch(() => {}); }
        recorder.stop();
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const t = frame / totalFrames; // 0..1 normalized progress
      drawFrame(ctx, img, W, H, t, index);

      // Report progress
      const pct = Math.round((frame / totalFrames) * 100);
      emit(onProgress, `Renderizando cena ${index + 1}/${totalScenes}… ${pct}%`, {
        type: "ffmpeg-progress",
        progress: frame / totalFrames,
        time: frame / FPS,
        index,
      });

      frame++;
      setTimeout(renderLoop, intervalMs);
    }

    renderLoop();
  });
}

export async function assembleVideo(
  scenes: SceneAsset[],
  onProgress: ProgressHandler,
): Promise<Blob> {
  const startTime = Date.now();
  emit(onProgress, "Iniciando montagem… (Canvas nativo, sem download de engine)", { type: "engine", source: "Canvas + MediaRecorder" });
  emit(onProgress, "Preparando…", { type: "engine-download", pct: 100, mb: "0" });

  const sceneBlobs: Blob[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sceneStart = Date.now();
    emit(onProgress, `Preparando cena ${i + 1}/${scenes.length}…`, { type: "scene-start", index: i, total: scenes.length });

    let durSec = 8;
    try {
      durSec = await getAudioDuration(scenes[i].audioUrl);
    } catch { /* fallback */ }

    // For animated video scenes (Replicate), download directly as blob
    if (scenes[i].videoUrl) {
      emit(onProgress, `Baixando vídeo cena ${i + 1}/${scenes.length}…`, { type: "scene-download", index: i, total: scenes.length, item: "vídeo", pct: 50 });
      try {
        const vidBlob = await fetchAudioBlob(scenes[i].videoUrl);
        sceneBlobs.push(vidBlob);
        emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta.`, { type: "scene-done", index: i, total: scenes.length });
        continue;
      } catch {
        console.warn(`Video download failed for scene ${i + 1}, falling back to image`);
      }
    }

    const blob = await renderSceneToBlob(i, scenes[i], durSec, onProgress, scenes.length);
    sceneBlobs.push(blob);

    const elapsed = ((Date.now() - sceneStart) / 1000).toFixed(1);
    emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta (${elapsed}s).`, { type: "scene-done", index: i, total: scenes.length });
  }

  // Concatenate all scene blobs into one
  emit(onProgress, "Unindo todas as cenas…", { type: "concat", total: scenes.length });
  const finalBlob = new Blob(sceneBlobs, { type: "video/webm" });

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  emit(onProgress, `Vídeo pronto em ${totalElapsed}s!`, { type: "done" });
  return finalBlob;
}