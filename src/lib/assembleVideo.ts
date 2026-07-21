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

export type AssembleEvent =
  | { type: "message"; message: string }
  | { type: "log"; message: string }
  | { type: "engine"; source: string }
  | { type: "scene-start"; index: number; total: number }
  | { type: "scene-render"; index: number; total: number }
  | { type: "scene-done"; index: number; total: number }
  | { type: "concat"; total: number }
  | { type: "done" };

type ProgressHandler = (msg: string, event?: AssembleEvent) => void;

function emit(onProgress: ProgressHandler, message: string, event?: AssembleEvent) {
  onProgress(message, event ?? { type: "message", message });
}

async function fetchAsBlobURL(url: string, mime: string, onProgress?: ProgressHandler, label?: string) {
  try {
    return await toBlobURL(url, mime);
  } catch {
    // Fallback: manual fetch → Blob (more reliable em mobile / service workers)
    const res = await fetch(url, { credentials: "omit", cache: "force-cache" });
    if (!res.ok) throw new Error(`${label ?? url}: HTTP ${res.status}`);
    const total = Number(res.headers.get("content-length") ?? 0);
    if (res.body && total > 0 && onProgress) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        const pct = Math.round((loaded / total) * 100);
        onProgress(`Baixando engine (${pct}%)…`, { type: "message", message: `Baixando engine (${pct}%)…` });
      }
      return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: mime }));
    }
    const buf = await res.arrayBuffer();
    return URL.createObjectURL(new Blob([buf], { type: mime }));
  }
}

async function getFFmpeg(
  onLog?: (m: string) => void,
  onProgress?: ProgressHandler,
) {
  if (ffmpegInstance) return ffmpegInstance;
  const ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on("log", ({ message }) => onLog(message));

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
  emit(onProgress, "Iniciando…");
  const ffmpeg = await getFFmpeg(
    (m) => {
      console.log("[ffmpeg]", m);
      onProgress(m, { type: "log", message: m });
    },
    onProgress,
  );

  const sceneFiles: string[] = [];
  const FPS = 30;
  for (let i = 0; i < scenes.length; i++) {
    emit(onProgress, `Preparando cena ${i + 1}/${scenes.length}…`, { type: "scene-start", index: i, total: scenes.length });
    const audName = `aud${i}.mp3`;
    const outName = `scene${i}.mp4`;
    await ffmpeg.writeFile(audName, await fetchFile(scenes[i].audioUrl));

    let durSec = 8;
    try {
      durSec = await getAudioDuration(scenes[i].audioUrl);
    } catch { /* fallback */ }

    if (scenes[i].videoUrl) {
      // Cena com vídeo animado (Replicate) — loopa o vídeo até cobrir o áudio
      const vidName = `vid${i}.mp4`;
      await ffmpeg.writeFile(vidName, await fetchFile(scenes[i].videoUrl!));
      emit(onProgress, `Renderizando cena ${i + 1}/${scenes.length} (vídeo animado)…`, { type: "scene-render", index: i, total: scenes.length });
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
      await ffmpeg.deleteFile(vidName);
    } else {
      const imgName = `img${i}.png`;
      await ffmpeg.writeFile(imgName, await fetchFile(scenes[i].imageUrl));
      const totalFrames = Math.max(30, Math.round(durSec * FPS));
      const style = i % 5;
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
      const vf = [
        `scale=2560:1440:force_original_aspect_ratio=increase`,
        `crop=2560:1440`,
        `zoompan=z='${zExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=1280x720:fps=${FPS}`,
        `setsar=1`,
      ].join(",");
      emit(onProgress, `Renderizando cena ${i + 1}/${scenes.length} (Ken Burns)…`, { type: "scene-render", index: i, total: scenes.length });
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
        "-r", String(FPS),
        outName,
      ]);
      await ffmpeg.deleteFile(imgName);
    }

    sceneFiles.push(outName);
    emit(onProgress, `Cena ${i + 1}/${scenes.length} pronta.`, { type: "scene-done", index: i, total: scenes.length });
    await ffmpeg.deleteFile(audName);
  }

  emit(onProgress, "Unindo cenas…", { type: "concat", total: scenes.length });
  const listContent = sceneFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listContent));
  await ffmpeg.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "list.txt",
    "-c", "copy",
    "final.mp4",
  ]);

  const data = (await ffmpeg.readFile("final.mp4")) as Uint8Array;
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);

  for (const f of sceneFiles) await ffmpeg.deleteFile(f);
  await ffmpeg.deleteFile("list.txt");
  await ffmpeg.deleteFile("final.mp4");

  emit(onProgress, "Pronto!", { type: "done" });
  return new Blob([buf], { type: "video/mp4" });
}