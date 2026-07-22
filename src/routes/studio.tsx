import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { assembleVideo } from "@/lib/assembleVideo";
import { clientScript, clientImage, clientTts, clientAnimate, clientCaptions, clientMusic } from "@/lib/ai-client";
import {
  VISUAL_EFFECTS, TRANSITION_EFFECTS, VOICE_EFFECTS, CAPTION_STYLES, MUSIC_MOODS,
  DEFAULT_TIKTOK_AI,
  type TikTokAIOptions, type VisualEffect, type TransitionEffect, type VoiceEffect, type CaptionStyle, type MusicMood,
} from "@/lib/tiktok-ai-effects";
import type { CaptionSegment } from "@/lib/ai-client";
import { Sparkles, Wand2, Film, Mic2, Loader2, TrendingUp, Music, Captions, Wand, Check, Copy } from "lucide-react";

/* ── Copy to clipboard helpers ── */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  }
  return (
    <button onClick={doCopy} title={label ?? "Copiar"} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition ml-1">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      <span className="text-[10px]">{copied ? "copiado!" : label ?? "copiar"}</span>
    </button>
  );
}

function CopyableText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className="group flex items-start gap-1">
      <p className={className}>{text}</p>
      <CopyButton text={text} />
    </div>
  );
}
import { ChannelPlanner, type HistoryItem } from "@/components/ChannelPlanner";
import { BalanceWidget } from "@/components/studio/BalanceWidget";
import { AgentWorkingPreview } from "@/components/studio/AgentWorkingPreview";
import { AssembleProgress, updateAssembleProgress, type AssembleProgressState } from "@/components/studio/AssembleProgress";
import { SceneCard, type Scene } from "@/components/studio/SceneCard";

const LS_HISTORY = "aidc.history";

export const Route = createFileRoute("/studio")({
  component: Studio,
  head: () => ({
    meta: [
      { title: "StudioAITube — Gerar roteiro, narração e cenas" },
      { name: "description", content: "Gere roteiros dark, narração TTS e imagens cinematográficas por cena para seu canal do YouTube." },
    ],
  }),
});

type Script = {
  title: string; hook: string; scenes: Scene[]; notice?: string; modelUsed?: string;
  seoTitle?: string; seoDescription?: string; tags?: string[];
  thumbnailPrompt?: string; thumbnailText?: string;
};

type VoiceId = "onyx" | "echo" | "fable" | "alloy" | "nova" | "shimmer";
const VOICES: { id: VoiceId; label: string; desc: string; tags: string[] }[] = [
  { id: "onyx", label: "Onyx — grave e sombrio", desc: "Ideal para terror, mistério, oculto", tags: ["terror", "mistério", "assombr", "sobrenatural", "oculto", "ritual", "amaldiço", "exorcis", "fantasma", "demo", "sombr", "dark"] },
  { id: "echo", label: "Echo — sério e investigativo", desc: "Ideal para true crime, conspiração", tags: ["crime", "serial", "killer", "assassin", "caso", "polic", "conspir", "desaparec", "investig", "secret"] },
  { id: "fable", label: "Fable — narrador clássico", desc: "Ideal para lendas, mitologia, história", tags: ["lenda", "mito", "história", "medieval", "antig", "civiliza", "rei", "guerra"] },
  { id: "alloy", label: "Alloy — neutro e equilibrado", desc: "Uso geral", tags: [] },
  { id: "nova", label: "Nova — feminina clara", desc: "Documentário leve", tags: [] },
  { id: "shimmer", label: "Shimmer — feminina suave", desc: "Contos, ASMR", tags: ["asmr", "conto", "sussurr"] },
];

function suggestVoice(topic: string): VoiceId {
  const t = topic.toLowerCase();
  for (const v of VOICES) if (v.tags.some((k) => t.includes(k))) return v.id;
  return "onyx";
}

function sceneNarration(scene: Scene, index: number, topic: string) {
  const clean = scene.narration.trim();
  if (clean) return clean;
  return `Na cena ${index + 1}, a história de ${topic || scene.title || "este mistério"} revela uma nova camada sombria. O silêncio do ambiente aumenta a tensão enquanto pequenos detalhes começam a se conectar. Cada pista parece aproximar o público de uma verdade que ninguém queria encontrar.`;
}

function Studio() {
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

  // ── TikTok AI State ──
  const [tiktokAI, setTiktokAI] = useState<TikTokAIOptions>(DEFAULT_TIKTOK_AI);
  const [tiktokPanelOpen, setTiktokPanelOpen] = useState(false);
  const [sceneCaptions, setSceneCaptions] = useState<Record<number, CaptionSegment[]>>({});
  const [captionBusy, setCaptionBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicBlob, setMusicBlob] = useState<Blob | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  function saveHistory(next: HistoryItem[]) {
    setHistory(next);
    localStorage.setItem(LS_HISTORY, JSON.stringify(next.slice(-50)));
  }

  useEffect(() => {
    if (!voiceTouched && topic.trim().length > 4) {
      setVoice(suggestVoice(topic));
    }
  }, [topic, voiceTouched]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true); setScript(null); setImages({}); setAudios({});
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

  function keySceneIndexes(total: number): number[] {
    if (total <= 0) return [];
    if (total <= 3) return Array.from({ length: total }, (_, i) => i);
    const count = Math.max(2, Math.ceil(total * 0.2)); // ~20%, min 2
    const set = new Set<number>([0, total - 1]);
    const middleSlots = count - 2;
    for (let k = 1; k <= middleSlots; k++) {
      set.add(Math.round((k * (total - 1)) / (middleSlots + 1)));
    }
    return [...set].sort((a, b) => a - b);
  }

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

  async function genThumbnail() {
    if (!script) return;
    setThumbBusy(true);
    setThumbnail(null);
    try {
      // Brand identity capturada do canal (via /api/trends analisar)
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
      let baseUrl = "";
      const thumbResult = await clientImage(prompt);
      baseUrl = `data:${thumbResult.mime};base64,${thumbResult.b64}`;
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

  // ── TikTok AI: Generate Captions ──
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
          // Adjust timestamps to start at 0 for each scene
          const offset = newCaps[i]?.length ? 0 : 0;
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

  // ── TikTok AI: Generate Music ──
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
      // Fetch the music blob
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
            captions: { ...tiktokAI.captions, segments: [] }, // per-scene via sceneCaptions
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

  const keyScenes = script ? keySceneIndexes(script.scenes.length) : [];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>
      <header className="relative border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <Link to="/" className="font-bold text-base sm:text-lg flex items-center gap-2 shrink-0 min-w-0">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <span className="truncate">StudioAITube</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BalanceWidget />
          <span className="hidden sm:inline text-xs uppercase tracking-widest text-muted-foreground">Studio</span>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Agente IA online — pronto para criar
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
            Criar vídeo dark
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Tema, roteiro, imagens, narração, efeitos e montagem — tudo gerado por IA direto no navegador.
          </p>
        </div>

        <form onSubmit={onGenerate} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-2xl">
          <label className="block text-sm font-medium">Tema do vídeo</label>
          <textarea
            value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex.: A verdadeira história por trás da casa mais assombrada dos EUA"
            className="w-full min-h-24 rounded-lg bg-black/40 border border-white/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm flex items-center gap-1 shrink-0"><Film className="w-4 h-4" />Cenas:</label>
            <div className="inline-flex items-stretch rounded-md border border-white/10 bg-black/40 overflow-hidden shrink-0">
              <button
                type="button"
                aria-label="Diminuir cenas"
                onClick={() => setCount(Math.max(1, (Number(count) || 1) - 1))}
                className="px-3 text-lg leading-none hover:bg-white/10 active:bg-white/20 select-none"
              >−</button>
              <input
                type="number" inputMode="numeric" min={1} max={50} value={count}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") { setCount(0 as any); return; }
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) setCount(Math.min(50, Math.max(1, n)));
                }}
                onBlur={(e) => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 3) setCount(8); }}
                className="w-14 text-center bg-transparent border-x border-white/10 p-2 text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label="Aumentar cenas"
                onClick={() => setCount(Math.min(50, (Number(count) || 0) + 1))}
                className="px-3 text-lg leading-none hover:bg-white/10 active:bg-white/20 select-none"
              >+</button>
            </div>
            <button disabled={loading} className="w-full sm:w-auto sm:ml-auto rounded-lg btn-blue-gradient px-5 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando…</> : <><Wand2 className="w-4 h-4" />Gerar roteiro</>}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <label className="text-sm flex items-center gap-1"><Mic2 className="w-4 h-4" />Voz:</label>
            <select
              value={voice}
              onChange={(e) => { setVoice(e.target.value as VoiceId); setVoiceTouched(true); }}
              className="rounded-md bg-black/40 border border-white/10 p-2 text-sm flex-1 min-w-56"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.label} — {v.desc}</option>
              ))}
            </select>
            {!voiceTouched && topic.trim().length > 4 && (
              <span className="text-xs text-primary/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> sugerida pelo tema
              </span>
            )}
          </div>
        </form>

        {loading && <AgentWorkingPreview modelUsed={script?.modelUsed} />}

        {!loading && (
          <ChannelPlanner
            onPick={(t) => { setTopic(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            history={history}
            onDeleteHistory={(id) => saveHistory(history.filter((h) => h.id !== id))}
          />
        )}

        {script && (
          <section className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              {script.notice && (
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  {script.notice}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs uppercase text-muted-foreground">Título</div>
                {script.modelUsed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                    <Sparkles className="w-3 h-3" /> Roteiro por {script.modelUsed}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold">{script.title}</h2>
              {script.seoTitle && (
                <>
                  <div className="mt-3 text-xs uppercase text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Título SEO ({script.seoTitle.length}/70)</div>
                  <CopyableText text={script.seoTitle} className="text-sm font-medium text-primary" />
                </>
              )}
              <div className="mt-3 text-xs uppercase text-muted-foreground">Hook</div>
              <CopyableText text={script.hook} className="text-sm" />
              {script.tags && script.tags.length > 0 && (
                <>
                  <div className="mt-3 text-xs uppercase text-muted-foreground flex items-center gap-1">Tags SEO ({script.tags.length}) <CopyButton text={script.tags.join(", ")} /></div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {script.tags.map((t) => (
                      <span key={t} className="text-[10px] rounded-full bg-white/10 border border-white/10 px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </>
              )}
              {script.seoDescription && (
                <>
                  <div className="mt-3 text-xs uppercase text-muted-foreground flex items-center gap-1">Descrição SEO <CopyButton text={script.seoDescription} /></div>
                  <div className="rounded-lg bg-black/30 border border-white/5 p-3 text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto scrollbar-thin whitespace-pre-line">{script.seoDescription}</div>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={genAll} className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium">
                  Gerar todas imagens + áudios
                </button>
                <button
                  onClick={genThumbnail}
                  disabled={thumbBusy}
                  className="rounded-md border border-primary/40 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {thumbBusy ? "🎨 Gerando thumb…" : thumbnail ? "🎨 Regerar Thumbnail" : "🎨 Gerar Thumbnail"}
                </button>
                <button
                  onClick={animateKeyScenes}
                  className="rounded-md border border-accent/40 bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2 text-sm font-medium"
                >
                  🚀 Animar cenas-chave (~{(keyScenes.length * 0.05).toFixed(2)} USD)
                </button>
                <button
                  onClick={() => setTiktokPanelOpen(!tiktokPanelOpen)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition flex items-center gap-1.5 ${
                    tiktokPanelOpen
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : (tiktokAI.visualEffect !== "none" || tiktokAI.captions.enabled || tiktokAI.voiceEffect !== "none" || tiktokAI.music.enabled || tiktokAI.transition !== "none")
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Wand className="w-4 h-4" />
                  TikTok AI
                  {(tiktokAI.visualEffect !== "none" || tiktokAI.captions.enabled || tiktokAI.voiceEffect !== "none" || tiktokAI.music.enabled || tiktokAI.transition !== "none") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
                <button
                  onClick={onAssemble}
                  disabled={assembling}
                  className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {assembling ? `Montando… ${assembleMsg}` : "Montar Vídeo"}
                </button>
              </div>

              {/* ── TikTok AI Panel ── */}
              {tiktokPanelOpen && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-black/40 to-accent/5 p-5 space-y-5 animate-fade-in relative overflow-hidden">
                  {/* Glow decorations */}
                  <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Wand className="w-4 h-4 text-primary" />
                        TikTok AI — Efeitos Inteligentes
                      </h3>
                      <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                        {[
                          tiktokAI.visualEffect !== "none" ? 1 : 0,
                          tiktokAI.captions.enabled ? 1 : 0,
                          tiktokAI.voiceEffect !== "none" ? 1 : 0,
                          tiktokAI.music.enabled ? 1 : 0,
                          tiktokAI.transition !== "none" ? 1 : 0,
                        ].reduce((a, b) => a + b, 0)} ativo(s)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Efeitos visuais, legendas automáticas, música de fundo e transições estilo TikTok para seu vídeo dark.</p>
                  </div>

                  {/* Visual Effect */}
                  <div className="relative space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-primary" /> Efeito Visual
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {VISUAL_EFFECTS.map((ef) => (
                        <button
                          key={ef.id}
                          onClick={() => updateTikTokAI({ visualEffect: ef.id as VisualEffect })}
                          className={`rounded-lg border px-3 py-2 text-left transition text-xs ${
                            tiktokAI.visualEffect === ef.id
                              ? "border-primary/60 bg-primary/20 text-primary ring-1 ring-primary/30"
                              : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                          }`}
                        >
                          <span className="text-base block mb-0.5">{ef.emoji}</span>
                          <span className="font-medium block">{ef.label}</span>
                          <span className="text-[10px] opacity-70 block">{ef.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transition */}
                  <div className="relative space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" /> Transição entre cenas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {TRANSITION_EFFECTS.map((tr) => (
                        <button
                          key={tr.id}
                          onClick={() => updateTikTokAI({ transition: tr.id as TransitionEffect })}
                          className={`rounded-lg border px-3 py-2 text-left transition text-xs ${
                            tiktokAI.transition === tr.id
                              ? "border-accent/60 bg-accent/20 text-accent ring-1 ring-accent/30"
                              : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                          }`}
                        >
                          <span className="text-base block mb-0.5">{tr.emoji}</span>
                          <span className="font-medium">{tr.label}</span>
                          <span className="text-[10px] opacity-70 block">{tr.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Effect */}
                  <div className="relative space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Mic2 className="w-3.5 h-3.5 text-primary" /> Efeito de Voz
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {VOICE_EFFECTS.map((ve) => (
                        <button
                          key={ve.id}
                          onClick={() => updateTikTokAI({ voiceEffect: ve.id as VoiceEffect })}
                          className={`rounded-lg border px-3 py-2 text-left transition text-xs ${
                            tiktokAI.voiceEffect === ve.id
                              ? "border-primary/60 bg-primary/20 text-primary ring-1 ring-primary/30"
                              : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                          }`}
                        >
                          <span className="text-base block mb-0.5">{ve.emoji}</span>
                          <span className="font-medium">{ve.label}</span>
                          <span className="text-[10px] opacity-70 block">{ve.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Captions */}
                  <div className="relative space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Captions className="w-3.5 h-3.5 text-primary" /> Legendas Automáticas (Whisper IA)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateTikTokCaption({ enabled: !tiktokAI.captions.enabled })}
                          className={`w-10 h-5 rounded-full transition-all relative ${tiktokAI.captions.enabled ? "bg-primary" : "bg-white/20"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${tiktokAI.captions.enabled ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                    </div>
                    {tiktokAI.captions.enabled && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {CAPTION_STYLES.map((cs) => (
                            <button
                              key={cs.id}
                              onClick={() => updateTikTokCaption({ style: cs.id as CaptionStyle })}
                              className={`rounded-lg border px-3 py-2 text-left transition text-xs ${
                                tiktokAI.captions.style === cs.id
                                  ? "border-primary/60 bg-primary/20 text-primary ring-1 ring-primary/30"
                                  : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                              }`}
                            >
                              <span className="text-base block mb-0.5">{cs.emoji}</span>
                              <span className="font-medium">{cs.label}</span>
                              <span className="text-[10px] opacity-70 block">{cs.desc}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={genAllCaptions}
                            disabled={captionBusy || !script?.scenes.some((_, i) => audios[i])}
                            className="rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary px-3 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {captionBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Captions className="w-3.5 h-3.5" />}
                            {captionBusy ? "Gerando legendas…" : "Gerar Legendas (Whisper IA)"}
                          </button>
                          {Object.keys(sceneCaptions).length > 0 && (
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {Object.keys(sceneCaptions).length} cenas transcritas
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Background Music */}
                  <div className="relative space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-accent" /> Música de Fundo (IA)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateTikTokMusic({ enabled: !tiktokAI.music.enabled })}
                          className={`w-10 h-5 rounded-full transition-all relative ${tiktokAI.music.enabled ? "bg-accent" : "bg-white/20"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${tiktokAI.music.enabled ? "left-5" : "left-0.5"}`} />
                        </button>
                      </div>
                    </div>
                    {tiktokAI.music.enabled && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {MUSIC_MOODS.map((mm) => (
                            <button
                              key={mm.id}
                              onClick={() => updateTikTokMusic({ mood: mm.id as MusicMood })}
                              className={`rounded-lg border px-3 py-2 text-left transition text-xs ${
                                tiktokAI.music.mood === mm.id
                                  ? "border-accent/60 bg-accent/20 text-accent ring-1 ring-accent/30"
                                  : "border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                              }`}
                            >
                              <span className="text-base block mb-0.5">{mm.emoji}</span>
                              <span className="font-medium">{mm.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={genBackgroundMusic}
                            disabled={musicBusy}
                            className="rounded-md bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent px-3 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {musicBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music className="w-3.5 h-3.5" />}
                            {musicBusy ? "Gerando música…" : "Gerar Música (MusicGen IA)"}
                          </button>
                          {musicBlob && (
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Música pronta ({(musicBlob.size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          )}
                        </div>
                        {/* Volume slider */}
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground w-12 shrink-0">Volume</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={tiktokAI.music.volume}
                            onChange={(e) => updateTikTokMusic({ volume: parseFloat(e.target.value) })}
                            className="flex-1 h-1.5 accent-accent"
                          />
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(tiktokAI.music.volume * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reset button */}
                  <div className="relative pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        setTiktokAI(DEFAULT_TIKTOK_AI);
                        setSceneCaptions({});
                        setMusicBlob(null);
                        toast.info("TikTok AI: configurações resetadas");
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition underline"
                    >
                      Resetar todas as configurações TikTok AI
                    </button>
                  </div>
                </div>
              )}
              {thumbnail && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">Thumbnail 1280x720</div>
                  <img src={thumbnail} alt="Thumbnail" className="w-full max-w-md rounded-lg border border-white/10" />
                  <a href={thumbnail} download="thumbnail.jpg" className="text-xs underline">Baixar thumbnail JPG</a>
                </div>
              )}
              {assembling && assembleProgress && <AssembleProgress state={assembleProgress} images={images} />}
              {videoUrl && (
                <div className="mt-4 space-y-2">
                  <video controls src={videoUrl} className="w-full rounded-md" />
                  <div className="flex flex-wrap gap-2">
                    <a href={videoUrl} download="video-final.webm" className="inline-block rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium">
                      ⬇ Baixar vídeo final
                    </a>
                    <PublishToMake videoUrl={videoUrl} script={script} thumbnail={thumbnail} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {script.scenes.map((sc, i) => (
                <SceneCard
                  key={i}
                  scene={sc}
                  index={i}
                  isKeyScene={keyScenes.includes(i)}
                  busy={busy}
                  image={images[i]}
                  audio={audios[i]}
                  video={videos[i]}
                  onTitleChange={(value) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, title: value } : s) })}
                  onNarrationChange={(value) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, narration: value } : s) })}
                  onImagePromptChange={(value) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, imagePrompt: value } : s) })}
                  onGenerateImage={() => genImage(i, sc.imagePrompt)}
                  onGenerateVariantImage={() => {
                    const seed = Math.floor(Math.random() * 9999);
                    const variants = ["different angle", "alternative composition", "new lighting", "wider shot", "closer shot", "different mood"];
                    const v = variants[seed % variants.length];
                    genImage(i, `${sc.imagePrompt}, ${v}, variation ${seed}`);
                  }}
                  onGenerateAudio={() => genAudio(i, sceneNarration(sc, i, script.title))}
                  onAnimate={() => genAnimate(i, sc.imagePrompt)}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Após gerar todas imagens + áudios, clique em "Montar Vídeo". A montagem usa Canvas nativo do navegador — sem download de engine.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

const LS_MAKE_WEBHOOK = "aidc.makeWebhook";

function PublishToMake({ videoUrl, script, thumbnail }: { videoUrl: string; script: Script; thumbnail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [webhook, setWebhook] = useState(() => (typeof window !== "undefined" ? localStorage.getItem(LS_MAKE_WEBHOOK) ?? "" : ""));
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  // datetime-local com valor default = agora + 1h, formatado local
  const defaultWhen = (() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  const [when, setWhen] = useState(defaultWhen);

  async function uploadToLitterbox(blob: Blob, filename: string) {
    const up = new FormData();
    up.append("reqtype", "fileupload");
    up.append("time", "24h");
    up.append("fileToUpload", blob, filename);
    const r = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: up });
    const url = (await r.text()).trim();
    if (!r.ok || !url.startsWith("http")) throw new Error(`Falha ao hospedar ${filename}: ${url.slice(0, 200)}`);
    return url;
  }

  async function publish() {
    if (!webhook.startsWith("https://hook.")) {
      toast.error("Cole a URL do webhook do Make (começa com https://hook.…)");
      return;
    }
    let publishAtISO = "";
    let privacy: "public" | "private" = "public";
    if (scheduleMode === "later") {
      const dt = new Date(when);
      if (isNaN(dt.getTime()) || dt.getTime() < Date.now() + 10 * 60 * 1000) {
        toast.error("Escolha uma data/hora pelo menos 10 minutos no futuro.");
        return;
      }
      publishAtISO = dt.toISOString(); // YouTube exige ISO 8601 UTC
      privacy = "private"; // requisito do YouTube para agendamento
    }

    try {
      setSending(true);
      setStatus("Preparando vídeo…");
      localStorage.setItem(LS_MAKE_WEBHOOK, webhook);

      toast.info("Hospedando vídeo…");
      const videoBlob = await (await fetch(videoUrl)).blob();
      setStatus("Subindo MP4…");
      const hostedVideoUrl = await uploadToLitterbox(videoBlob, "video-final.mp4");

      let hostedThumbUrl = "";
      if (thumbnail) {
        setStatus("Subindo thumbnail…");
        const thumbBlob = await (await fetch(thumbnail)).blob();
        hostedThumbUrl = await uploadToLitterbox(thumbBlob, "thumbnail.jpg");
      }

      toast.info("Enviando ao Make…");
      setStatus("Enviando campos ao Make…");
      const makePayload = new FormData();
      makePayload.append("title", (script.seoTitle || script.title).slice(0, 100));
      makePayload.append("description",
        (script.seoDescription || `${script.hook}\n\n${script.scenes.map((s) => s.narration).join("\n\n")}`).slice(0, 4900)
      );
      makePayload.append("tags", (script.tags?.length ? script.tags : ["darkcesar", "mistério", "terror"]).join(","));
      makePayload.append("videoUrl", hostedVideoUrl);
      makePayload.append("thumbnailUrl", hostedThumbUrl);
      makePayload.append("privacyStatus", privacy);
      makePayload.append("publishAt", publishAtISO); // vazio = publicar agora
      await fetch(webhook, { method: "POST", mode: "no-cors", body: makePayload });
      toast.success(
        scheduleMode === "later"
          ? `Agendado para ${new Date(when).toLocaleString("pt-BR")}`
          : "Enviado para publicação imediata!"
      );
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar ao Make", { duration: 9000 });
    } finally {
      setSending(false);
      setStatus("");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-block rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-medium">
        📤 Publicar no YouTube (Make)
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-white/10 bg-white/5 p-3 space-y-3">
      <label className="text-xs text-muted-foreground">URL do webhook do Make.com</label>
      <input
        type="url"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://hook.eu2.make.com/abc123..."
        className="w-full rounded-md bg-background border border-white/10 px-3 py-2 text-sm"
      />

      {/* Modo de publicação */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScheduleMode("now")}
          className={`rounded-full px-3 py-1 text-xs border transition ${scheduleMode === "now" ? "bg-primary/30 border-primary/60 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
        >
          🚀 Publicar agora
        </button>
        <button
          type="button"
          onClick={() => setScheduleMode("later")}
          className={`rounded-full px-3 py-1 text-xs border transition ${scheduleMode === "later" ? "bg-accent/30 border-accent/60 text-accent" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
        >
          ⏰ Agendar
        </button>
      </div>

      {scheduleMode === "later" && (
        <div className="space-y-1 animate-fade-in">
          <label className="text-xs text-muted-foreground">Data e hora (fuso local)</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            min={defaultWhen}
            className="w-full rounded-md bg-background border border-white/10 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={publish} disabled={sending} className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium disabled:opacity-50">
          {sending ? "Enviando…" : scheduleMode === "later" ? "Agendar no YouTube" : "Publicar agora"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-white/20 px-4 py-2 text-sm">Cancelar</button>
      </div>
      {status && <p className="text-[11px] text-primary">{status}</p>}
      <div className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
        <p>
          O Make recebe campos extras: <code>privacyStatus</code> (<i>public</i> ou <i>private</i>) e <code>publishAt</code> (ISO 8601, vazio = agora).
        </p>
        <p>
          <b>Para agendamento funcionar</b>, no módulo <b>YouTube → Upload a Video</b> mapeie:
          <br />• <b>Privacy Status</b> = <code>{`{{1.privacyStatus}}`}</code>
          <br />• <b>Publish At</b> = <code>{`{{1.publishAt}}`}</code> (deixe vazio se for "agora")
        </p>
      </div>
    </div>
  );
}