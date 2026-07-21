import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_VERSION = "0.12.10";
const FFMPEG_SOURCES = [
  {
    label: "jsdelivr",
    coreURL: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.js`,
    wasmURL: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.wasm`,
  },
  {
    label: "unpkg",
    coreURL: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.js`,
    wasmURL: `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/esm/ffmpeg-core.wasm`,
  },
];

let ffmpegInstance: FFmpeg | null = null;
let currentSceneIndex = 0;

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

/**
 * Check if a URL is cross-origin (needs server proxy under COEP)
 */
function isCrossOrigin(url: string): boolean {
  try {
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return false;
    const u = new URL(url, window.location.origin);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Fetch a URL as Uint8Array, proxying through /api/proxy for cross-origin resources
 * to avoid COEP blocking.
 */
async function safeFetchFile(url: string, onProgress?: ProgressHandler, label?: string): Promise<Uint8Array> {
  if (isCrossOrigin(url)) {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch (proxyErr) {
      console.warn("[proxy failed, trying direct]", proxyErr);
      // Fallback to direct fetch
    }
  }
  return fetchFile(url);
}

async function fetchAsBlobURL(url: string, mime: string, onProgress?: ProgressHandler, label?: string) {
  // Direct fetch with streaming progress (avoids toBlobURL which gives no progress feedback)
  // COEP credentialless allows cross-origin CDN fetches
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    // CDN often serves gzip — content-length is compressed size, actual bytes are larger.
    // Use the larger of content-length or 35MB (expected wasm size) for accurate %.
    const total = Math.max(contentLength, 35 * 1_048_576);
    if (res.body && onProgress) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        const pct = Math.min(99, Math.round((loaded / total) * 100));
        const mb = (loaded / 1_048_576).toFixed(1);
        onProgress(`Baixando ${label ?? "engine"}… ${mb}MB (${pct}%)`, { type: "engine-download", pct, mb });
      }
      // Build buffer from all chunks
      const buf = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) { buf.set(chunk, offset); offset += chunk.byteLength; }
      return URL.createObjectURL(new Blob([buf], { type: mime }));
    }
    const buf = await res.arrayBuffer();
    return URL.createObjectURL(new Blob([buf], { type: mime }));
  } catch (err) {
    console.warn("[direct fetch failed, trying toBlobURL]", err);
  }
  // Fallback: toBlobURL from @ffmpeg/util
  try {
    return await toBlobURL(url, mime);
  } catch (err) {
    console.warn("[toBlobURL failed, trying proxy]", err);
  }
  // Last resort: proxy
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const buf = await res.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

async function getFFmpeg(
  onLog?: (m: string) => void,
  onProgress?: ProgressHandler,
) {
  if (ffmpegInstance) return ffmpegInstance;

  // Check SharedArrayBuffer availability
  if (typeof SharedArrayBuffer === "undefined") {
    throw new Error(
      "SharedArrayBuffer não disponível. O navegador bloqueou o ffmpeg.wasm. " +
      "Certifique-se de que o servidor envia os headers Cross-Origin-Opener-Policy e Cross-Origin-Embedder-Policy."
    );
  }

  const ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));

  // Track ffmpeg progress events — index is set by assembleVideo per scene
  ffmpeg.on("progress", ({ progress, time }) => {
    const pct = Math.round(progress * 100);
    onProgress?.(`Renderizando cena ${currentSceneIndex + 1}… ${pct}%`, {
      type: "ffmpeg-progress",
      progress,
      time: time / 1_000_000,
      index: currentSceneIndex,
    });
  });

  let lastErr: unknown;
  for (const source of FFMPEG_SOURCES) {
    try {
      const label = source.label === "local" ? "local" : new URL(source.coreURL).host;
      onProgress?.(`Carregando engine de vídeo (${label})…`, { type: "engine", source: label });
      const coreURL = await fetchAsBlobURL(source.coreURL, "text/javascript", onProgress, `${label} core`);
      const wasmURL = await fetchAsBlobURL(source.wasmURL, "application/wasm", onProgress, `${label} wasm`);
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (err) {
      lastErr = err;
      console.error("[ffmpeg load failed]", source.label, err);
      onProgress?.(`Falha em ${source.label}: ${err instanceof Error ? err.message : String(err)}`, {
        type: "log",
        message: `Falha em ${source.label}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  throw new Error(
    `Falha ao carregar o engine de vídeo (ffmpeg.wasm). Verifique sua conexão e tente novamente. Detalhe: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

export type SceneAsset = { imageUrl: string; audioUrl: string; videoUrl?: string };

async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    a.src = url;
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (!isFinite(d) || d <= 0) reject(new Error("duração inválida"));
      else resolve(d);
    };
    a.onerror = () => reject(new Error("falha ao ler áudio"));
  });
}

export async function assembleVideo(
  scenes: SceneAsset[],
  onProgress: ProgressHandler,
): Promise<Blob> {
  const startTime = Date.now();
  emit(onProgress, "Iniciando montagem…");

  const ffmpeg = await getFFmpeg(
    (m) => {
      console.log("[ffmpeg]", m);
      onProgress(m, { type: "log", message: m });
    },
    onProgress,
  );

  const sceneFiles: string[] = [];
  const FPS = 24;

  for (let i = 0; i < scenes.length; i++) {
    currentSceneIndex = i;
    const sceneStart = Date.now();
    emit(onProgress, `Baixando cena ${i + 1}/${scenes.length}…`, { type: "scene-download", index: i, total: scenes.length, item: "áudio", pct: 0 });

    // Download audio (through proxy if needed)
    const audName = `aud${i}.mp3`;
    try {
      const audioData = await safeFetchFile(scenes[i].audioUrl, onProgress, `áudio cena ${i + 1}`);
      await ffmpeg.writeFile(audName, audioData);
    } catch (err: any) {
      throw new Error(`Falha ao baixar áudio da cena ${i + 1}: ${err?.message ?? String(err)}`);
    }

    emit(onProgress, `Preparando cena ${i + 1}/${scenes.length}…`, { type: "scene-start", index: i, total: scenes.length });

    let durSec = 8;
    try {
      durSec = await getAudioDuration(scenes[i].audioUrl);
    } catch { /* fallback */ }

    const outName = `scene${i}.mp4`;

    if (scenes[i].videoUrl) {
      // Cena com vídeo animado (Replicate) — loopa o vídeo até cobrir o áudio
      emit(onProgress, `Baixando vídeo cena ${i + 1}/${scenes.length}…`, { type: "scene-download", index: i, total: scenes.length, item: "vídeo", pct: 50 });
      const vidName = `vid${i}.mp4`;
      try {
        const videoData = await safeFetchFile(scenes[i].videoUrl!, onProgress, `vídeo cena ${i + 1}`);
        await ffmpeg.writeFile(vidName, videoData);
      } catch (err: any) {
        // If video download fails, fall back to static image
        console.warn(`[assemble] video download failed for scene ${i + 1}, falling back to image:`, err);
        emit(onProgress, `Vídeo indisponível na cena ${i + 1}, usando imagem estática…`, { type: "log", message: `fallback to image for scene ${i + 1}` });
        await processStaticScene(ffmpeg, i, scenes[i].imageUrl, audName, outName, durSec, FPS, onProgress, scenes.length);
        sceneFiles.push(outName);
        emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta.`, { type: "scene-done", index: i, total: scenes.length });
        await ffmpeg.deleteFile(audName);
        continue;
      }

      emit(onProgress, `Renderizando cena ${i + 1}/${scenes.length} (vídeo animado)…`, { type: "scene-render", index: i, total: scenes.length });
      try {
        await ffmpeg.exec([
          "-stream_loop", "-1",
          "-i", vidName,
          "-i", audName,
          "-t", String(durSec),
          "-vf", `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=${FPS}`,
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-b:v", "2500k",
          "-maxrate", "2800k",
          "-bufsize", "5000k",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          "-r", String(FPS),
          outName,
        ]);
      } catch (err: any) {
        throw new Error(`Erro ao renderizar cena ${i + 1} (vídeo): ${err?.message ?? String(err)}`);
      }
      await ffmpeg.deleteFile(vidName);
    } else {
      // Cena com imagem estática + Ken Burns
      await processStaticScene(ffmpeg, i, scenes[i].imageUrl, audName, outName, durSec, FPS, onProgress, scenes.length);
    }

    sceneFiles.push(outName);
    const elapsed = ((Date.now() - sceneStart) / 1000).toFixed(1);
    emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta (${elapsed}s).`, { type: "scene-done", index: i, total: scenes.length });
    await ffmpeg.deleteFile(audName);
  }

  emit(onProgress, "Unindo todas as cenas…", { type: "concat", total: scenes.length });
  const listContent = sceneFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listContent));

  try {
    await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "list.txt",
      "-c", "copy",
      "final.mp4",
    ]);
  } catch (err: any) {
    throw new Error(`Erro ao unir cenas: ${err?.message ?? String(err)}`);
  }

  emit(onProgress, "Gerando arquivo final…");
  const data = (await ffmpeg.readFile("final.mp4")) as Uint8Array;
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);

  for (const f of sceneFiles) await ffmpeg.deleteFile(f);
  await ffmpeg.deleteFile("list.txt");
  await ffmpeg.deleteFile("final.mp4");

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  emit(onProgress, `Vídeo pronto em ${totalElapsed}s!`, { type: "done" });
  return new Blob([buf], { type: "video/mp4" });
}

/**
 * Process a static image scene with Ken Burns effect
 */
async function processStaticScene(
  ffmpeg: FFmpeg,
  index: number,
  imageUrl: string,
  audName: string,
  outName: string,
  durSec: number,
  fps: number,
  onProgress: ProgressHandler,
  total: number,
) {
  emit(onProgress, `Baixando imagem cena ${index + 1}/${total}…`, { type: "scene-download", index, total, item: "imagem", pct: 25 });
  const imgName = `img${index}.png`;
  try {
    const imgData = await safeFetchFile(imageUrl, onProgress, `imagem cena ${index + 1}`);
    await ffmpeg.writeFile(imgName, imgData);
  } catch (err: any) {
    throw new Error(`Falha ao baixar imagem da cena ${index + 1}: ${err?.message ?? String(err)}`);
  }

  const totalFrames = Math.max(24, Math.round(durSec * fps));
  const style = index % 5;
  const zExpr =
    style === 0 ? `min(zoom+0.0008,1.35)` :
    style === 1 ? `if(lte(zoom,1.0),1.35,max(1.001,zoom-0.0008))` :
    style === 2 ? `1.25` :
    style === 3 ? `1.25` :
                  `min(zoom+0.0006,1.30)`;
  const xExpr =
    style === 0 ? `iw/2-(iw/zoom/2)` :
    style === 1 ? `iw/2-(iw/zoom/2)` :
    style === 2 ? `(iw-iw/zoom)*(on/${totalFrames})` :
    style === 3 ? `(iw-iw/zoom)*(1-on/${totalFrames})` :
                  `(iw-iw/zoom)*(on/${totalFrames})`;
  const yExpr =
    style === 4 ? `(ih-ih/zoom)*(on/${totalFrames})` : `ih/2-(ih/zoom/2)`;
  // 1440x810 headroom (faster than 1920x1080, enough for 1280x720 zoompan)
  const vf = [
    `scale=1440:810:force_original_aspect_ratio=increase`,
    `crop=1440:810`,
    `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=1280x720:fps=${fps}`,
    `setsar=1`,
  ].join(",");
  emit(onProgress, `Renderizando cena ${index + 1}/${total} (Ken Burns)…`, { type: "scene-render", index, total });

  try {
    await ffmpeg.exec([
      "-loop", "1",
      "-i", imgName,
      "-i", audName,
      "-t", String(durSec),
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-b:v", "2500k",
      "-maxrate", "2800k",
      "-bufsize", "5000k",
      "-pix_fmt", "yuv420p",
      "-vf", vf,
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-r", String(fps),
      outName,
    ]);
  } catch (err: any) {
    throw new Error(`Erro ao renderizar cena ${index + 1}: ${err?.message ?? String(err)}`);
  }
  await ffmpeg.deleteFile(imgName);
}