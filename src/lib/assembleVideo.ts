/**
 * Canvas + MediaRecorder video assembler
 * Replaces ffmpeg.wasm — no 30MB download, works on mobile, much faster.
 * Outputs WebM (accepted by YouTube).
 *
 * TikTok AI Features:
 * - Visual effects (glitch, VHS, paranormal, noir, red-tint, film-grain, shadow-pulse)
 * - Caption rendering (TikTok, cinematic, karaoke, glitch-text)
 * - Voice effects (echo, reverb, deep, whisper, radio) via Web Audio API
 * - Background music mixing
 * - Transitions between scenes
 */

import type { CaptionSegment } from "@/lib/ai-client";
import {
  applyVisualEffect,
  renderCaption,
  applyVoiceEffect,
  renderTransition,
  type TikTokAIOptions,
} from "@/lib/tiktok-ai-effects";

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

/** Per-scene caption data (offset-adjusted for each scene) */
type SceneCaptions = { segments: CaptionSegment[]; style: NonNullable<TikTokAIOptions["captions"]>["style"] };

/**
 * Render a single scene (image + Ken Burns + TikTok AI effects) to a video Blob
 */
async function renderSceneToBlob(
  index: number,
  scene: SceneAsset,
  durationSec: number,
  onProgress: ProgressHandler,
  totalScenes: number,
  tiktokOpts: TikTokAIOptions,
  sceneCaptions: SceneCaptions | null,
  musicBlob: Blob | null,
  musicVolume: number,
  nextImg: HTMLImageElement | null,
  transitionDurationSec: number,
): Promise<Blob> {
  const FPS = 24;
  const W = 1280;
  const H = 720;
  const totalFrames = Math.round(durationSec * FPS);
  const transFrames = Math.round(transitionDurationSec * FPS);
  const hasEffect = tiktokOpts.visualEffect !== "none";
  const hasCaptions = tiktokOpts.captions.enabled && sceneCaptions && sceneCaptions.segments.length > 0;
  const hasVoiceEffect = tiktokOpts.voiceEffect !== "none";
  const hasMusic = !!musicBlob && tiktokOpts.music.enabled;
  const hasTransition = tiktokOpts.transition !== "none" && transFrames > 0 && nextImg;

  // Load image
  emit(onProgress, `Baixando imagem cena ${index + 1}/${totalScenes}…`, { type: "scene-download", index, total: totalScenes, item: "imagem", pct: 20 });
  const img = await fetchImage(scene.imageUrl);

  // Load audio as blob
  emit(onProgress, `Baixando áudio cena ${index + 1}/${totalScenes}…`, { type: "scene-download", index, total: totalScenes, item: "áudio", pct: 50 });
  const audioBlob = await fetchAudioBlob(scene.audioUrl);
  const audioUrl = URL.createObjectURL(audioBlob);

  // Load music if provided
  let musicAudioEl: HTMLAudioElement | null = null;
  let musicUrl = "";
  if (hasMusic && musicBlob) {
    musicUrl = URL.createObjectURL(musicBlob);
    musicAudioEl = new Audio(musicUrl);
    musicAudioEl.crossOrigin = "anonymous";
    musicAudioEl.loop = true;
    musicAudioEl.volume = musicVolume;
  }

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
  let audioSource: MediaElementAudioSourceNode | null = null;

  try {
    audioCtx = new AudioContext();
    audioSource = audioCtx.createMediaElementSource(audioEl);

    // Apply voice effect if enabled
    const dest = audioCtx.createMediaStreamDestination();
    if (hasVoiceEffect) {
      const { destination: effectDest } = applyVoiceEffect(
        audioCtx,
        audioSource,
        tiktokOpts.voiceEffect,
      );
      (effectDest as MediaStreamAudioDestinationNode).stream.getAudioTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));
    } else {
      audioSource.connect(dest);
      audioSource.connect(audioCtx.destination);
    }
    dest.stream.getAudioTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));

    // Mix background music if provided
    if (hasMusic && musicAudioEl) {
      const musicSource = audioCtx.createMediaElementSource(musicAudioEl);
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = musicVolume;
      const musicDest = audioCtx.createMediaStreamDestination();
      musicSource.connect(musicGain);
      musicGain.connect(musicDest);
      musicDest.stream.getAudioTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));
    }
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

  const tiktokLabel = [
    hasEffect ? `efeito ${tiktokOpts.visualEffect}` : "",
    hasCaptions ? `legendas ${sceneCaptions!.style}` : "",
    hasVoiceEffect ? `voz ${tiktokOpts.voiceEffect}` : "",
    hasMusic ? "música IA" : "",
    hasTransition ? `transição ${tiktokOpts.transition}` : "",
  ].filter(Boolean).join(", ");

  if (tiktokLabel) {
    emit(onProgress, `TikTok AI: ${tiktokLabel}`, { type: "log", message: tiktokLabel });
  }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (e) => reject(new Error(`MediaRecorder erro: ${e}`));
    recorder.onstop = () => {
      URL.revokeObjectURL(audioUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    emit(onProgress, `Renderizando cena ${index + 1}/${totalScenes}…`, { type: "scene-render", index, total: totalScenes });
    recorder.start(100); // collect data every 100ms

    // Start audio playback synced with rendering
    audioEl.play().catch(() => {});
    musicAudioEl?.play().catch(() => {});

    let frame = 0;
    const intervalMs = 1000 / FPS;

    function renderLoop() {
      if (frame >= totalFrames) {
        audioEl.pause();
        audioEl.currentTime = 0;
        musicAudioEl?.pause();
        musicAudioEl && (musicAudioEl.currentTime = 0);
        if (audioSource) { audioSource.disconnect(); }
        if (audioCtx) { audioCtx.close().catch(() => {}); }
        recorder.stop();
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const t = frame / totalFrames; // 0..1 normalized progress
      const currentTimeSec = frame / FPS;

      // 1. Draw base Ken Burns frame
      drawFrame(ctx, img, W, H, t, index);

      // 2. Apply TikTok AI visual effect
      if (hasEffect) {
        applyVisualEffect(ctx, W, H, t, frame, tiktokOpts.visualEffect);
      }

      // 3. Render transition at end of scene (last N frames)
      if (hasTransition && frame >= totalFrames - transFrames) {
        const transT = (frame - (totalFrames - transFrames)) / transFrames;
        renderTransition(ctx, W, H, transT, tiktokOpts.transition, nextImg ?? undefined, (index + 1) % KB_STYLES.length);
      }

      // 4. Render captions
      if (hasCaptions && sceneCaptions) {
        renderCaption(ctx, W, H, currentTimeSec, sceneCaptions.segments, sceneCaptions.style, frame);
      }

      // Report progress
      const pct = Math.round((frame / totalFrames) * 100);
      emit(onProgress, `Renderizando cena ${index + 1}/${totalScenes}… ${pct}%`, {
        type: "ffmpeg-progress",
        progress: frame / totalFrames,
        time: currentTimeSec,
        index,
      });

      frame++;
      setTimeout(renderLoop, intervalMs);
    }

    renderLoop();
  });
}

export type AssembleOptions = {
  tiktokAI?: TikTokAIOptions;
  /** Per-scene caption segments (keyed by scene index, already offset to 0-based per scene) */
  sceneCaptions?: Record<number, CaptionSegment[]>;
  /** Background music blob */
  musicBlob?: Blob | null;
};

export async function assembleVideo(
  scenes: SceneAsset[],
  onProgress: ProgressHandler,
  options?: AssembleOptions,
): Promise<Blob> {
  const tiktokOpts = options?.tiktokAI;
  const sceneCaps = options?.sceneCaptions;
  const musicBlob = options?.musicBlob ?? null;

  const startTime = Date.now();
  const engineLabel = tiktokOpts && (
    tiktokOpts.visualEffect !== "none" ||
    tiktokOpts.captions.enabled ||
    tiktokOpts.voiceEffect !== "none" ||
    tiktokOpts.music.enabled ||
    tiktokOpts.transition !== "none"
  )
    ? "Canvas + MediaRecorder + TikTok AI"
    : "Canvas + MediaRecorder";

  emit(onProgress, `Iniciando montagem… (${engineLabel})`, { type: "engine", source: engineLabel });
  emit(onProgress, "Preparando…", { type: "engine-download", pct: 100, mb: "0" });

  // Log active TikTok AI features
  if (tiktokOpts) {
    const features: string[] = [];
    if (tiktokOpts.visualEffect !== "none") features.push(`Efeito visual: ${tiktokOpts.visualEffect}`);
    if (tiktokOpts.captions.enabled) features.push(`Legendas: ${tiktokOpts.captions.style}`);
    if (tiktokOpts.voiceEffect !== "none") features.push(`Efeito de voz: ${tiktokOpts.voiceEffect}`);
    if (tiktokOpts.music.enabled && tiktokOpts.music.audioUrl) features.push(`Música: ${tiktokOpts.music.mood}`);
    if (tiktokOpts.transition !== "none") features.push(`Transição: ${tiktokOpts.transition}`);
    if (features.length) {
      emit(onProgress, `TikTok AI ativo: ${features.join(" | ")}`, { type: "log", message: features.join(" | ") });
    }
  }

  // Pre-load all images for transition support
  emit(onProgress, "Pré-carregando imagens para transições…");
  const loadedImages: (HTMLImageElement | null)[] = [];
  for (let i = 0; i < scenes.length; i++) {
    try {
      loadedImages.push(await fetchImage(scenes[i].imageUrl));
    } catch {
      loadedImages.push(null);
    }
  }

  // Fetch music blob if URL provided
  let resolvedMusicBlob = musicBlob;
  if (!resolvedMusicBlob && tiktokOpts?.music.enabled && tiktokOpts.music.audioUrl) {
    try {
      emit(onProgress, "Baixando música de fundo…");
      resolvedMusicBlob = await fetchAudioBlob(tiktokOpts.music.audioUrl);
    } catch (e) {
      console.warn("[music download failed]", e);
      resolvedMusicBlob = null;
    }
  }

  const TRANSITION_DURATION = 0.5; // seconds for transition at end of scene
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
        const vidBlob = await fetchAudioBlob(scenes[i].videoUrl!);
        sceneBlobs.push(vidBlob);
        emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta.`, { type: "scene-done", index: i, total: scenes.length });
        continue;
      } catch {
        console.warn(`Video download failed for scene ${i + 1}, falling back to image`);
      }
    }

    // Build per-scene captions
    const caps = (tiktokOpts?.captions.enabled && sceneCaps?.[i])
      ? { segments: sceneCaps[i], style: tiktokOpts.captions.style }
      : null;

    // Next image for transition
    const nextImage = (i < scenes.length - 1) ? loadedImages[i + 1] : null;

    const blob = await renderSceneToBlob(
      i,
      scenes[i],
      durSec,
      onProgress,
      scenes.length,
      tiktokOpts ?? {
        captions: { enabled: false, style: "tiktok", segments: [] },
        music: { enabled: false, audioUrl: null, volume: 0.15, mood: "dark-suspense" },
        visualEffect: "none",
        voiceEffect: "none",
        transition: "none",
      },
      caps,
      resolvedMusicBlob,
      tiktokOpts?.music.volume ?? 0.15,
      nextImage,
      tiktokOpts?.transition !== "none" ? TRANSITION_DURATION : 0,
    );
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