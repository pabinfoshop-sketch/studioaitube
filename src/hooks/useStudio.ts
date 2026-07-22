"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { assembleVideo } from "@/lib/assembleVideo";
import { clientScript, clientImage, clientTts, clientAnimate, clientCaptions, clientMusic } from "@/lib/ai-client";
import {
  DEFAULT_TIKTOK_AI, MUSIC_MOODS,
  type TikTokAIOptions,
} from "@/lib/tiktok-ai-effects";
import type { CaptionSegment } from "@/lib/ai-client";
import { updateAssembleProgress, type AssembleProgressState } from "@/components/studio/AssembleProgress";
import type { HistoryItem } from "@/components/ChannelPlanner";
import type { Scene } from "@/components/studio/SceneCard";

/* ── Shared types ── */

export type VoiceId = "onyx" | "echo" | "fable" | "alloy" | "nova" | "shimmer";

export const VOICES: { id: VoiceId; label: string; desc: string; tags: string[] }[] = [
  { id: "onyx", label: "Onyx — grave e sombrio", desc: "Ideal para terror, mistério, oculto", tags: ["terror", "mistério", "assombr", "sobrenatural", "oculto", "ritual", "amaldiço", "exorcis", "fantasma", "demo", "sombr", "dark"] },
  { id: "echo", label: "Echo — sério e investigativo", desc: "Ideal para true crime, conspiração", tags: ["crime", "serial", "killer", "assassin", "caso", "polic", "conspir", "desaparec", "investig", "secret"] },
  { id: "fable", label: "Fable — narrador clássico", desc: "Ideal para lendas, mitologia, história", tags: ["lenda", "mito", "história", "medieval", "antig", "civiliza", "rei", "guerra"] },
  { id: "alloy", label: "Alloy — neutro e equilibrado", desc: "Uso geral", tags: [] },
  { id: "nova", label: "Nova — feminina clara", desc: "Documentário leve", tags: [] },
  { id: "shimmer", label: "Shimmer — feminina suave", desc: "Contos, ASMR", tags: ["asmr", "conto", "sussurr"] },
];

export type Script = {
  title: string; hook: string; scenes: Scene[]; notice?: string; modelUsed?: string;
  seoTitle?: string; seoDescription?: string; tags?: string[];
  thumbnailPrompt?: string; thumbnailText?: string;
};

const LS_HISTORY = "aidc.history";

function suggestVoice(topic: string): VoiceId {
  const t = topic.toLowerCase();
  for (const v of VOICES) if (v.tags.some((k) => t.includes(k))) return v.id;
  return "onyx";
}

/* ── Hook ── */

export function useStudio() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const [images, setImages] = useState<Record<number, { url: string; final: boolean; modelUsed?: string }>>({});
  const [audios, setAudios] = useState<Record<number, string>>({});
  const [videos, setVideos] = useState<Record<number, { url: string; modelUsed?: string }>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [assembling, setAssembling] = useState(false);
  const [assembleMsg, setAssembleMsg] = useState("");
  const [assembleProgress, setAssembleProgress] = useState<AssembleProgressState | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [voice, setVoice] = useState<VoiceId>("onyx");
  const [voiceTouched, setVoiceTouched] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // TikTok AI State
  const [tiktokAI, setTiktokAI] = useState<TikTokAIOptions>(DEFAULT_TIKTOK_AI);
  const [tiktokPanelOpen, setTiktokPanelOpen] = useState(false);
  const [sceneCaptions, setSceneCaptions] = useState<Record<number, CaptionSegment[]>>({});
  const [captionBusy, setCaptionBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicBlob, setMusicBlob] = useState<Blob | null>(null);

  /* ── History ── */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const saveHistory = useCallback((next: HistoryItem[]) => {
    setHistory(next);
    localStorage.setItem(LS_HISTORY, JSON.stringify(next.slice(-50)));
  }, []);

  /* ── Voice suggestion ── */

  useEffect(() => {
    if (!voiceTouched && topic.trim().length > 4) {
      setVoice(suggestVoice(topic));
    }
  }, [topic, voiceTouched]);

  /* ── Generate script ── */

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true); setScript(null); setImages({}); setAudios({}); setVideos({}); setVideoUrl(null);
    try {
      const s = await clientScript(topic, count, "pt-BR");
      setScript(s as Script);
      saveHistory([...history, {
        id: crypto.randomUUID(), title: s.title, topic, createdAt: Date.now(), scenes: (s.scenes ?? []).length,
      }]);
      toast.success("Roteiro gerado!");
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao gerar roteiro");
    } finally { setLoading(false); }
  }

  /* ── Scene helpers ── */

  function sceneNarration(scene: Scene, index: number, topic: string) {
    const clean = scene.narration.trim();
    if (clean) return clean;
    return `Na cena ${index + 1}, a história de ${topic || scene.title || "este mistério"} revela uma nova camada sombria. O silêncio do ambiente aumenta a tensão enquanto pequenos detalhes começam a se conectar. Cada pista parece aproximar o público de uma verdade que ninguém queria encontrar.`;
  }

  /* ── Generate image ── */

  async function genImage(i: number, prompt: string) {
    setBusy((b) => ({ ...b, [`img${i}`]: true }));
    try {
      const result = await clientImage(prompt);
      const url = `data:${result.mime};base64,${result.b64}`;
      setImages((im) => ({ ...im, [i]: { url, final: true, modelUsed: result.modelUsed } }));
    } catch (err: any) {
      toast.error(`Cena ${i + 1}: ${err.message}`);
    } finally { setBusy((b) => ({ ...b, [`img${i}`]: false })); }
  }

  /* ── Generate audio ── */

  async function genAudio(i: number, text: string) {
    const cleanText = text.trim();
    if (!cleanText) {
      toast.error(`Cena ${i + 1}: narração vazia. Gere o roteiro novamente.`);
      return;
    }
    setBusy((b) => ({ ...b, [`aud${i}`]: true }));
    try {
      const blob = await clientTts(cleanText, voice);
      setAudios((a) => ({ ...a, [i]: URL.createObjectURL(blob) }));
    } catch (err: any) {
      toast.error(`Áudio cena ${i + 1}: ${err.message}`);
    } finally { setBusy((b) => ({ ...b, [`aud${i}`]: false })); }
  }

  /* ── Animate scene ── */

  async function genAnimate(i: number, prompt: string) {
    const img = images[i];
    if (!img?.final) {
      toast.error(`Cena ${i + 1}: gere a imagem primeiro.`);
      return;
    }
    setBusy((b) => ({ ...b, [`vid${i}`]: true }));
    try {
      const j = await clientAnimate(img.url, prompt, (msg) => toast.info(`Cena ${i + 1}: ${msg}`));
      setVideos((v) => ({ ...v, [i]: { url: j.videoUrl, modelUsed: j.modelUsed } }));
      toast.success(`Cena ${i + 1} animada!`);
    } catch (err: any) {
      toast.error(`Animar cena ${i + 1}: ${err.message}`, { duration: 8000 });
    } finally { setBusy((b) => ({ ...b, [`vid${i}`]: false })); }
  }

  /* ── Generate all ── */

  async function genAll() {
    if (!script) return;
    for (let i = 0; i < script.scenes.length; i++) {
      await Promise.all([
        genImage(i, script.scenes[i].imagePrompt),
        genAudio(i, sceneNarration(script.scenes[i], i, script.title)),
      ]);
    }
    toast.success("Tudo pronto!");
  }

  /* ── Key scene indexes ── */

  function keySceneIndexes(total: number): number[] {
    if (total <= 0) return [];
    if (total <= 3) return Array.from({ length: total }, (_, i) => i);
    const cnt = Math.max(2, Math.ceil(total * 0.2));
    const set = new Set<number>([0, total - 1]);
    const middleSlots = cnt - 2;
    for (let k = 1; k <= middleSlots; k++) {
      set.add(Math.round((k * (total - 1)) / (middleSlots + 1)));
    }
    return [...set].sort((a, b) => a - b);
  }

  /* ── Animate key scenes ── */

  async function animateKeyScenes() {
    if (!script) return;
    const idxs = keySceneIndexes(script.scenes.length);
    const missing = idxs.filter((i) => !images[i]?.final);
    if (missing.length) {
      toast.error(`Gere primeiro as imagens das cenas: ${missing.map((i) => i + 1).join(", ")}`);
      return;
    }
    toast.info(`Animando ${idxs.length} cenas-chave (~${(idxs.length * 0.05).toFixed(2)} USD)…`);
    for (const i of idxs) {
      if (videos[i]) continue;
      await genAnimate(i, script.scenes[i].imagePrompt);
    }
    toast.success("Cenas-chave animadas!");
  }

  /* ── Generate thumbnail ── */

  async function genThumbnail() {
    if (!script) return;
    setThumbBusy(true);
    setThumbnail(null);
    try {
      let brand: { primaryColor?: string; strokeColor?: string; moodKeywords?: string; fontStyle?: string } = {};
      try { brand = JSON.parse(localStorage.getItem("aidc.brand") ?? "{}"); } catch { /* noop */ }
      const fillColor = brand.primaryColor || "#FFEA00";
      const strokeColor = brand.strokeColor || "#000000";
      const mood = brand.moodKeywords || "dark cinematic, high contrast, moody";
      const fontFam = brand.fontStyle === "serif"
        ? "'Georgia', 'Times New Roman', serif"
        : brand.fontStyle === "condensed"
          ? "'Bebas Neue', 'Oswald', 'Impact', sans-serif"
          : "'Impact', 'Arial Black', sans-serif";

      const prompt = (script.thumbnailPrompt || `dark dramatic YouTube thumbnail about ${script.title}, cinematic, high contrast, no text, 16:9`) + `, ${mood}`;
      const thumbResult = await clientImage(prompt);
      const baseUrl = `data:${thumbResult.mime};base64,${thumbResult.b64}`;
      if (!baseUrl) throw new Error("Sem imagem base");

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Falha ao carregar imagem")); img.src = baseUrl; });

      const canvas = document.createElement("canvas");
      canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext("2d")!;
      const scale = Math.max(1280 / img.width, 720 / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (1280 - dw) / 2, (720 - dh) / 2, dw, dh);
      const grad = ctx.createLinearGradient(0, 300, 0, 720);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      const text = (script.thumbnailText || script.title).toUpperCase().slice(0, 45);
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      ctx.font = `900 96px ${fontFam}`;
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > 1180 && cur) { lines.push(cur); cur = w; } else { cur = test; }
      }
      if (cur) lines.push(cur);

      const lineH = 100;
      const startY = 720 - 60 - (lines.length - 1) * lineH;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      lines.forEach((ln, idx) => {
        const y = startY + idx * lineH;
        ctx.lineWidth = 12;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(ln, 640, y);
        ctx.fillStyle = fillColor;
        ctx.fillText(ln, 640, y);
      });

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setThumbnail(dataUrl);
      toast.success(brand.primaryColor ? "Thumbnail gerada com identidade do canal!" : "Thumbnail gerada!");
    } catch (err: any) {
      toast.error(`Thumbnail: ${err.message}`);
    } finally { setThumbBusy(false); }
  }

  /* ── TikTok AI: Generate Captions ── */

  async function genAllCaptions() {
    if (!script) return;
    const scenesWithAudio = script.scenes
      .map((_, i) => i)
      .filter((i) => audios[i]);
    if (scenesWithAudio.length === 0) {
      toast.error("Gere os áudios das cenas primeiro.");
      return;
    }
    setCaptionBusy(true);
    try {
      toast.info(`Gerando legendas para ${scenesWithAudio.length} cenas…`);
      const newCaps: Record<number, CaptionSegment[]> = {};
      for (const i of scenesWithAudio) {
        try {
          toast.info(`Transcrevendo cena ${i + 1}…`);
          const result = await clientCaptions(audios[i], (msg) => console.log(`[captions ${i + 1}]`, msg));
          newCaps[i] = (result.captions ?? []).map((s) => ({
            ...s,
            start: s.start - (result.captions[0]?.start ?? 0),
            end: s.end - (result.captions[0]?.start ?? 0),
          }));
          toast.success(`Cena ${i + 1}: ${newCaps[i].length} segmentos`);
        } catch (err: any) {
          toast.error(`Cena ${i + 1}: ${err.message}`);
        }
      }
      setSceneCaptions(newCaps);
      setTiktokAI((prev) => ({
        ...prev,
        captions: { ...prev.captions, enabled: true, segments: [] },
      }));
      toast.success("Legendas geradas!");
    } catch (err: any) {
      toast.error(`Legendas: ${err.message}`);
    } finally {
      setCaptionBusy(false);
    }
  }

  /* ── TikTok AI: Generate Music ── */

  async function genBackgroundMusic() {
    setMusicBusy(true);
    try {
      const moodObj = MUSIC_MOODS.find((m) => m.id === tiktokAI.music.mood);
      const prompt = moodObj?.prompt ?? "dark suspense horror";
      const totalDuration = Math.min(30, Math.max(10, (script?.scenes.length ?? 8) * 8));
      toast.info(`Gerando música ${moodObj?.label} (${totalDuration}s)…`);
      const result = await clientMusic(prompt, totalDuration, moodObj?.prompt, (msg) => {
        toast.info(msg);
      });
      const audioRes = await fetch(result.audioUrl);
      const blob = await audioRes.blob();
      setMusicBlob(blob);
      setTiktokAI((prev) => ({
        ...prev,
        music: { ...prev.music, enabled: true, audioUrl: result.audioUrl },
      }));
      toast.success("Música de fundo gerada!");
    } catch (err: any) {
      toast.error(`Música: ${err.message}`);
    } finally {
      setMusicBusy(false);
    }
  }

  /* ── TikTok AI: Update helpers ── */

  function updateTikTokAI(patch: Partial<TikTokAIOptions>) {
    setTiktokAI((prev) => ({ ...prev, ...patch }));
  }

  function updateTikTokCaption(patch: Partial<TikTokAIOptions["captions"]>) {
    setTiktokAI((prev) => ({
      ...prev,
      captions: { ...prev.captions, ...patch },
    }));
  }

  function updateTikTokMusic(patch: Partial<TikTokAIOptions["music"]>) {
    setTiktokAI((prev) => ({
      ...prev,
      music: { ...prev.music, ...patch },
    }));
  }

  /* ── Assemble video ── */

  async function onAssemble() {
    if (!script) return;
    const missing = script.scenes.some((_, i) => !images[i]?.final || !audios[i]);
    if (missing) {
      toast.error("Gere imagem e áudio de todas as cenas primeiro.");
      return;
    }
    const initialProgress: AssembleProgressState = { message: "Iniciando...", phase: "Preparando", currentIndex: null, total: script.scenes.length, completed: 0, logs: [], startTime: Date.now(), downloadItem: "", downloadPct: 0, scenePct: 0, ffmpegPct: 0 };
    setAssembling(true);
    setAssembleMsg("Iniciando…");
    setAssembleProgress(initialProgress);
    setVideoUrl(null);
    try {
      const hasTikTokAI = tiktokAI.visualEffect !== "none" ||
        tiktokAI.captions.enabled ||
        tiktokAI.voiceEffect !== "none" ||
        tiktokAI.music.enabled ||
        tiktokAI.transition !== "none";

      const blob = await assembleVideo(
        script.scenes.map((_, i) => ({ imageUrl: images[i].url, audioUrl: audios[i], videoUrl: videos[i]?.url })),
        (message, event) => {
          setAssembleMsg(message);
          setAssembleProgress((prev) => updateAssembleProgress(prev ?? initialProgress, message, event));
        },
        hasTikTokAI ? {
          tiktokAI: {
            ...tiktokAI,
            captions: { ...tiktokAI.captions, segments: [] },
          },
          sceneCaptions: tiktokAI.captions.enabled ? sceneCaptions : undefined,
          musicBlob: tiktokAI.music.enabled ? musicBlob : null,
        } : undefined,
      );
      setVideoUrl(URL.createObjectURL(blob));
      toast.success("Vídeo pronto!");
    } catch (err: any) {
      console.error("[assemble]", err);
      toast.error(err?.message ?? "Falha ao montar vídeo", { duration: 8000 });
    } finally {
      setAssembling(false);
    }
  }

  /* ── Reset TikTok AI ── */

  function resetTikTokAI() {
    setTiktokAI(DEFAULT_TIKTOK_AI);
    setSceneCaptions({});
    setMusicBlob(null);
    toast.info("TikTok AI: configurações resetadas");
  }

  /* ── Derived state ── */

  const keyScenes = script ? keySceneIndexes(script.scenes.length) : [];

  return {
    // State
    topic, setTopic, count, setCount, loading, script, setScript,
    images, audios, videos, busy, assembling, assembleMsg, assembleProgress,
    videoUrl, thumbnail, thumbBusy, voice, setVoice, voiceTouched, setVoiceTouched,
    history, saveHistory,
    // TikTok AI
    tiktokAI, tiktokPanelOpen, setTiktokPanelOpen, sceneCaptions,
    captionBusy, musicBusy, musicBlob,
    // Functions
    onGenerate, genImage, genAudio, genAnimate, genAll, animateKeyScenes,
    genThumbnail, genAllCaptions, genBackgroundMusic,
    updateTikTokAI, updateTikTokCaption, updateTikTokMusic, resetTikTokAI,
    onAssemble, sceneNarration, keyScenes,
  };
}