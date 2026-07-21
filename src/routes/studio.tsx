import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { assembleVideo, type AssembleEvent } from "@/lib/assembleVideo";
import { clientBalance, clientScript, clientImage, clientTts, clientAnimate, saveKeysToLocalStorage, getCurrentKeys } from "@/lib/ai-client";
import { Sparkles, Wand2, Film, Mic2, Image as ImageIcon, Loader2, TrendingUp, Settings, Eye, EyeOff, Check, X } from "lucide-react";
import { ChannelPlanner, type HistoryItem } from "@/components/ChannelPlanner";

const LS_HISTORY = "aidc.history";

export const Route = createFileRoute("/studio")({
  component: Studio,
  head: () => ({
    meta: [
      { title: "AIDarkCesar Studio — Gerar roteiro, narração e cenas" },
      { name: "description", content: "Gere roteiros dark, narração TTS e imagens cinematográficas por cena para seu canal do YouTube." },
    ],
  }),
});

type Scene = { title: string; narration: string; imagePrompt: string };
type Script = {
  title: string; hook: string; scenes: Scene[]; notice?: string; modelUsed?: string;
  seoTitle?: string; seoDescription?: string; tags?: string[];
  thumbnailPrompt?: string; thumbnailText?: string;
};
type AssembleProgressState = {
  message: string;
  phase: string;
  currentIndex: number | null;
  total: number;
  completed: number;
  logs: string[];
  startTime: number;
  downloadItem: string;
  downloadPct: number;
  scenePct: number;
  ffmpegPct: number;
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

const TRENDING_TOPICS = [
  { emoji: "👻", title: "A verdadeira história do Hotel Cecil", tag: "Mistério" },
  { emoji: "🔪", title: "O caso Elisa Lam: o que ninguém contou", tag: "True Crime" },
  { emoji: "🌑", title: "Rituais esquecidos da Idade Média", tag: "Oculto" },
  { emoji: "🕯️", title: "Lugares mais assombrados do Brasil", tag: "Sobrenatural" },
  { emoji: "👁️", title: "Sociedades secretas que mudaram o mundo", tag: "Conspiração" },
  { emoji: "🩸", title: "Serial killers que nunca foram capturados", tag: "True Crime" },
  { emoji: "🌌", title: "Desaparecimentos inexplicáveis no Triângulo das Bermudas", tag: "Mistério" },
  { emoji: "⛪", title: "Exorcismos reais documentados pela Igreja", tag: "Sobrenatural" },
  { emoji: "🏚️", title: "A cidade fantasma que apareceu do nada", tag: "Mistério" },
  { emoji: "📼", title: "Fitas VHS amaldiçoadas que causaram mortes", tag: "Terror" },
];

const AGENT_STEPS = [
  "Pesquisando o tema…",
  "Estruturando arco narrativo…",
  "Escrevendo o gancho de abertura…",
  "Desenvolvendo as cenas…",
  "Refinando atmosfera cinematográfica…",
  "Gerando prompts visuais…",
  "Finalizando o roteiro…",
];

function AnimatedBot({ label }: { label?: string }) {
  return (
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" />
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl animate-[bounce_2s_ease-in-out_infinite]">
        <div className="relative w-10 h-10 rounded-xl bg-black/70 flex items-center justify-center">
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-2 bg-primary rounded-full" />
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:200ms]" />
          </div>
          <span className="absolute bottom-1 w-3 h-0.5 bg-primary/70 rounded animate-pulse" />
        </div>
      </div>
      {label && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-widest text-primary/90">
          {label}
        </div>
      )}
    </div>
  );
}

type BalanceResp = {
  free?: { ok: boolean; statusLabel?: string; error?: string };
  lovable?: { ok: boolean; statusLabel?: string; error?: string };
  openrouter: { ok: boolean; balanceUsd?: number; usageUsd?: number; limitUsd?: number | null; statusLabel?: string; isFreeTier?: boolean; error?: string };
  replicate: { ok: boolean; raw?: any; statusLabel?: string; error?: string };
  order?: string[];
};

function BalanceWidget() {
  const [data, setData] = useState<BalanceResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  async function refresh() {
    setLoading(true);
    try { setData(await clientBalance() as any); } catch { /* noop */ }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const id = setInterval(refresh, 30_000); return () => clearInterval(id); }, []);
  const or = data?.openrouter;
  const rp = data?.replicate;
  const free = data?.free;
  const fmt = (n?: number) => (typeof n === "number" ? `$${n.toFixed(2)}` : null);
  const orLabel = or?.ok
    ? (fmt(or.balanceUsd) ?? or.statusLabel ?? (or.usageUsd != null ? `usado $${or.usageUsd.toFixed(2)}` : "ok"))
    : (or?.error ?? "off");
  const rpLabel = rp?.ok ? (rp.statusLabel ?? "ok") : (rp?.error ?? "off");
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={refresh}
          title={data
            ? `TTS: ${free?.ok ? "gratuito" : "off"}\nOpenRouter: ${or?.ok ? (or.statusLabel ?? "ok") : (or?.error ?? "off")}\nReplicate: ${rp?.ok ? (rp.statusLabel ?? "ok") : (rp?.error ?? "off")}\n\nClique para atualizar`
            : "Carregando..."}
          className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] transition min-w-0 max-w-[calc(100vw-10rem)] overflow-hidden"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${free?.ok !== false ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="text-muted-foreground">TTS</span>
            <span className="font-semibold text-green-400">grátis</span>
          </span>
          <span className="w-px h-3 bg-white/10 shrink-0" />
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${or?.ok ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="hidden sm:inline text-muted-foreground">OR</span>
            <span className={`font-semibold truncate ${or?.ok ? "text-green-400" : "text-red-400"}`}>{orLabel}</span>
          </span>
          <span className="w-px h-3 bg-white/10 shrink-0" />
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${rp?.ok ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="hidden sm:inline text-muted-foreground">RP</span>
            <span className={`font-semibold truncate ${rp?.ok ? "text-green-400" : "text-red-400"}`}>{rpLabel}</span>
          </span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 p-1.5 transition"
          title="Configurar API Keys"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {showSettings && <ApiKeySettingsModal onClose={() => { setShowSettings(false); refresh(); }} />}
    </>
  );
}

function ApiKeySettingsModal({ onClose }: { onClose: () => void }) {
  const current = getCurrentKeys();
  const [orKey, setOrKey] = useState(current.openrouter);
  const [rpKey, setRpKey] = useState(current.replicate);
  const [elKey, setElKey] = useState(current.elevenlabs);
  const [showOr, setShowOr] = useState(false);
  const [showRp, setShowRp] = useState(false);
  const [showEl, setShowEl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  function save() {
    setSaving(true);
    saveKeysToLocalStorage({ openrouter: orKey.trim(), replicate: rpKey.trim(), elevenlabs: elKey.trim() });
    toast.success("API keys salvas com sucesso!");
    setTimeout(() => { setSaving(false); onClose(); }, 500);
  }
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:pt-20 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Configurar API Keys</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">As keys ficam salvas no seu navegador (localStorage). Se as env vars ja estiverem configuradas no servidor, elas tem prioridade.</p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">OPENROUTER_API_KEY</label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showOr ? "text" : "password"} value={orKey} onChange={(e) => setOrKey(e.target.value)} placeholder="sk-or-v1-..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowOr(!showOr)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showOr ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {orKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">REPLICATE_API_KEY</label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showRp ? "text" : "password"} value={rpKey} onChange={(e) => setRpKey(e.target.value)} placeholder="r8_..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowRp(!showRp)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showRp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {rpKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">ELEVENLABS_API_KEY <span className="text-zinc-600">(opcional)</span></label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showEl ? "text" : "password"} value={elKey} onChange={(e) => setElKey(e.target.value)} placeholder="xi-..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowEl(!showEl)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showEl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {elKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-muted-foreground hover:bg-white/5 transition">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-50">{saving ? "Salvando..." : "Salvar Keys"}</button>
        </div>
      </div>
    </div>
  );
  return mounted ? createPortal(content, document.body) : null;
}

function AgentWorkingPreview({ modelUsed }: { modelUsed?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % AGENT_STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-primary/10 via-white/5 to-accent/10 p-6 space-y-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-primary blur-3xl animate-pulse" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-accent blur-3xl animate-pulse" />
      </div>
      <div className="relative flex items-center gap-4">
        <AnimatedBot />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">Agente AIDarkCesar</div>
          <div className="text-xs text-muted-foreground">trabalhando no seu roteiro</div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            IA: {modelUsed ?? "selecionando modelo mais barato…"}
          </div>
        </div>
      </div>
      <div className="relative space-y-2">
        {AGENT_STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 text-sm transition-all ${
              i < step ? "text-muted-foreground line-through opacity-60" :
              i === step ? "text-foreground" : "text-muted-foreground/50"
            }`}
          >
            {i < step ? (
              <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-[10px] flex items-center justify-center">✓</span>
            ) : i === step ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <span className="w-4 h-4 rounded-full border border-white/20" />
            )}
            {s}
          </div>
        ))}
      </div>
      <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent animate-pulse" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

function updateAssembleProgress(prev: AssembleProgressState, message: string, event?: AssembleEvent): AssembleProgressState {
  if (!event) return { ...prev, message };
  if (event.type === "log") {
    return { ...prev, logs: [...prev.logs, event.message].slice(-20), message };
  }
  if (event.type === "engine") {
    return { ...prev, message, phase: "Carregando engine", currentIndex: null, scenePct: 0, downloadItem: "engine", downloadPct: 0 };
  }
  if (event.type === "engine-download") {
    // Show engine download as 0-5% of total progress
    return { ...prev, message, phase: "Carregando engine", currentIndex: null, scenePct: (event.pct / 100) * 5, downloadItem: `${event.mb}MB`, downloadPct: event.pct };
  }
  if (event.type === "scene-download") {
    return { ...prev, message, phase: "Baixando recursos", currentIndex: event.index, total: event.total, downloadItem: event.item, downloadPct: event.pct, scenePct: 0 };
  }
  if (event.type === "scene-start") {
    return { ...prev, message, phase: "Preparando cena", currentIndex: event.index, total: event.total, downloadItem: "", downloadPct: 0, scenePct: 10 };
  }
  if (event.type === "scene-render") {
    return { ...prev, message, phase: "Renderizando cena", currentIndex: event.index, total: event.total, downloadItem: "", downloadPct: 0, scenePct: 30, ffmpegPct: 0 };
  }
  if (event.type === "ffmpeg-progress") {
    const pct = Math.round((event.progress ?? 0) * 100);
    return { ...prev, message, phase: "Renderizando cena", currentIndex: event.index, total: prev.total, scenePct: 30 + pct * 0.7, ffmpegPct: pct };
  }
  if (event.type === "scene-done") {
    return { ...prev, message, phase: "Cena concluida", currentIndex: event.index, total: event.total, completed: Math.max(prev.completed, event.index + 1), downloadItem: "", downloadPct: 0, scenePct: 100 };
  }
  if (event.type === "concat") {
    return { ...prev, message, phase: "Unindo cenas", currentIndex: null, total: event.total, completed: event.total, scenePct: 0 };
  }
  if (event.type === "done") {
    return { ...prev, message, phase: "Video pronto", currentIndex: null, completed: prev.total, scenePct: 100 };
  }
  return { ...prev, message };
}

/* --- Ken Burns Canvas Preview --- */
function KenBurnsCanvas({ imageUrl, styleIndex, playing }: { imageUrl: string; styleIndex: number; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef(0);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => { imgRef.current = img; };
    imgRef.current = null;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const DURATION = 6000;

    function draw(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const img = imgRef.current;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      if (img) {
        const zoom = 1.0 + t * 0.3;
        const iw = W * zoom;
        const ih = H * zoom;
        let ox: number, oy: number;
        switch (styleIndex % 5) {
          case 0: ox = (W - iw) / 2; oy = (H - ih) / 2; break;
          case 1: ox = (W - iw) / 2; oy = (H - ih) / 2; break;
          case 2: ox = -(iw - W) * t; oy = (H - ih) / 2; break;
          case 3: ox = -(iw - W) * (1 - t); oy = (H - ih) / 2; break;
          default: ox = (W - iw) / 2; oy = -(ih - H) * t; break;
        }
        ctx.drawImage(img, ox, oy, iw, ih);
        // vignette
        const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // cinematic bars
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, H * 0.07);
      ctx.fillRect(0, H * 0.93, W, H * 0.07);

      // scanline
      const scanY = (elapsed * 0.05) % H;
      ctx.fillStyle = "rgba(139,92,246,0.08)";
      ctx.fillRect(0, scanY, W, 2);

      if (playing && t < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else if (playing && t >= 1) {
        startRef.current = 0;
        animRef.current = requestAnimationFrame(draw);
      }
    }

    if (playing) {
      startRef.current = 0;
      animRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, styleIndex, imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="w-full h-full object-cover rounded-xl"
    />
  );
}

/* --- Audio Waveform Visualizer --- */
function AudioWaveform({ playing, color = "#a78bfa" }: { playing: boolean; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const BARS = 48;
    const barW = W / BARS;
    let phase = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      phase += 0.04;

      for (let i = 0; i < BARS; i++) {
        const x = i * barW;
        let h: number;
        if (playing) {
          const wave = Math.sin(phase + i * 0.3) * 0.4 + Math.sin(phase * 1.5 + i * 0.15) * 0.3 + Math.cos(phase * 0.7 + i * 0.5) * 0.3;
          h = Math.abs(wave) * H * 0.85 + H * 0.08;
        } else {
          h = H * 0.1;
        }
        const grad = ctx.createLinearGradient(x, H - h, x, H);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + "33");
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, H - h, barW - 2, h);
      }
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, color]);

  return (
    <canvas ref={canvasRef} width={384} height={48} className="w-full h-12 rounded-lg" />
  );
}

/* --- Floating Particles --- */
function Particles({ count = 20 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; a: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.8 - 0.2,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.5 + 0.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.a})`;
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [count]);

  return <canvas ref={canvasRef} width={200} height={200} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* --- Main AssembleProgress with real-time animation --- */
function AssembleProgress({ state, images }: { state: AssembleProgressState; images: Record<number, { url: string; final: boolean }> }) {
  const [elapsed, setElapsed] = useState(0);
  const [smoothPct, setSmoothPct] = useState(0);

  useEffect(() => {
    const start = state.startTime || Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 200);
    return () => clearInterval(id);
  }, [state.startTime]);

  // Smooth progress animation
  useEffect(() => {
    const raw = state.total > 0
      ? Math.min(99, Math.round(((state.completed + (state.scenePct ?? 0) / 100) / state.total) * 100))
      : 5;
    const id = setInterval(() => {
      setSmoothPct(prev => {
        const diff = raw - prev;
        if (Math.abs(diff) < 0.5) return raw;
        return prev + diff * 0.08;
      });
    }, 30);
    return () => clearInterval(id);
  }, [state.completed, state.scenePct, state.total]);

  const progress = Math.round(smoothPct);
  const currentImage = state.currentIndex == null ? null : images[state.currentIndex]?.url;
  const activeIndex = state.currentIndex ?? (state.completed > 0 ? state.completed - 1 : 0);
  const etaSec = state.completed > 0 && state.total > state.completed
    ? Math.round((elapsed / state.completed) * (state.total - state.completed))
    : 0;
  const fmtTime = (s: number) => s >= 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;

  const isRendering = state.phase === "Renderizando cena";
  const isEngine = state.phase === "Carregando engine";
  const isDone = state.phase === "Video pronto";

  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-black/80 backdrop-blur-xl overflow-hidden relative">
      {/* Particle layer */}
      <Particles count={25} />

      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-16 w-96 h-96 rounded-full bg-primary/15 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-accent/15 blur-[120px] animate-pulse [animation-delay:1.5s]" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-[scan_3s_ease-in-out_infinite]" />
      </div>

      <div className="relative p-5 sm:p-6 space-y-5">
        {/* Hero: Ken Burns preview + info */}
        <div className="grid md:grid-cols-[1fr_280px] gap-5">
          {/* Ken Burns Canvas */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-primary/10">
            {currentImage ? (
              <KenBurnsCanvas imageUrl={currentImage} styleIndex={state.currentIndex ?? 0} playing={isRendering} />
            ) : isEngine ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-spin [animation-duration:3s]">
                    <Film className="w-8 h-8 text-black" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent blur-xl opacity-40 animate-pulse" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-primary">Carregando Engine de Video</div>
                  <div className="text-xs text-muted-foreground mt-1">Canvas nativo do navegador</div>
                </div>
              </div>
            ) : isDone ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-[bounce_1s_ease-in-out_infinite]">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <div className="text-lg font-bold text-green-400">Video Pronto!</div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-sm text-muted-foreground">Preparando...</div>
              </div>
            )}
            {/* Overlay: scene counter badge */}
            {state.currentIndex != null && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-primary/30 px-3 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-primary">Cena {activeIndex + 1}/{state.total}</span>
              </div>
            )}
            {/* Overlay: phase badge */}
            <div className="absolute top-3 left-3 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              {state.phase}
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            {/* Percentage */}
            <div className="text-center">
              <div className="text-5xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-none">
                {progress}%
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">Progresso Total</div>
            </div>

            {/* Time stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-lg font-bold text-foreground">{fmtTime(elapsed)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Decorrido</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-lg font-bold text-accent">{etaSec > 0 ? `~${fmtTime(etaSec)}` : "--"}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Restante</div>
              </div>
            </div>

            {/* Scene counter */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Cenas</span>
                <span className="font-bold">{state.completed}/{state.total}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: state.total }, (_, i) => {
                  const done = i < state.completed;
                  const active = i === state.currentIndex;
                  const ffmpegPct = active && isRendering ? (state.ffmpegPct ?? 0) : 0;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full transition-all duration-500 relative overflow-hidden ${
                        done ? "bg-green-400" : active ? "bg-white/10" : "bg-white/10"
                      }`}
                    >
                      {active && isRendering && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-200"
                          style={{ width: `${Math.max(ffmpegPct, 5)}%` }}
                        />
                      )}
                      {active && !isRendering && (
                        <div className="absolute inset-0 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audio waveform */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Audio</div>
              <AudioWaveform playing={isRendering} color="#a78bfa" />
            </div>
          </div>
        </div>

        {/* Progress bar with glow */}
        <div className="space-y-2">
          <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
            </div>
            {/* Glow dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent shadow-lg shadow-accent/60 transition-all duration-300 ease-out"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{state.message}</span>
            {state.downloadItem && (
              <span className="text-primary flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                {state.downloadItem} {state.downloadPct > 0 && `${state.downloadPct}%`}
              </span>
            )}
          </div>
        </div>

        {/* Film strip timeline */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {Array.from({ length: state.total }, (_, i) => {
              const done = i < state.completed;
              const active = i === state.currentIndex;
              const img = images[i]?.url;
              return (
                <div
                  key={i}
                  className={`relative shrink-0 w-24 sm:w-28 rounded-lg overflow-hidden border-2 transition-all duration-500 ${
                    done
                      ? "border-green-400/60 ring-1 ring-green-400/30"
                      : active
                        ? "border-primary ring-2 ring-primary/50 scale-105 shadow-lg shadow-primary/30"
                        : "border-white/10 opacity-40"
                  }`}
                >
                  <div className="aspect-video bg-black/60 flex items-center justify-center relative">
                    {img ? (
                      <img src={img} alt={`Cena ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-5 h-5 text-muted-foreground/40" />
                    )}
                    {active && isRendering && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
                        {/* Real-time ffmpeg progress overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-200 ease-out"
                            style={{ width: `${state.ffmpegPct ?? 0}%` }}
                          />
                        </div>
                        <div className="absolute bottom-2 right-1.5 text-[9px] font-bold text-white bg-black/70 rounded px-1.5 py-0.5 backdrop-blur-sm">
                          {state.ffmpegPct ?? 0}%
                        </div>
                      </>
                    )}
                    {done && !active && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                    )}
                    {active && !isRendering && (
                      <div className="absolute inset-0 border-2 border-primary/30 animate-pulse rounded-lg" />
                    )}
                  </div>
                  <div className={`text-center text-[10px] py-0.5 font-medium ${
                    done ? "bg-green-500/15 text-green-300" : active ? "bg-primary/20 text-primary" : "bg-black/40 text-muted-foreground"
                  }`}>
                    {active ? `> ${i + 1}` : done ? `+ ${i + 1}` : `${i + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live log (collapsible) */}
        {state.logs.length > 0 && (
          <details open className="rounded-xl bg-black/60 border border-white/5 overflow-hidden">
            <summary className="cursor-pointer hover:bg-white/5 transition flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Log ao vivo ({state.logs.length})
            </summary>
            <div className="px-4 pb-3 font-mono space-y-0.5 max-h-28 overflow-y-auto scrollbar-thin">
              {state.logs.map((log, i) => (
                <div key={`${log}-${i}`} className="truncate text-[10px] leading-relaxed text-muted-foreground/80">
                  <span className="text-muted-foreground/40 mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {log}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
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
      const blob = await assembleVideo(
        script.scenes.map((_, i) => ({ imageUrl: images[i].url, audioUrl: audios[i], videoUrl: videos[i]?.url })),
        (message, event) => {
          setAssembleMsg(message);
          setAssembleProgress((prev) => updateAssembleProgress(prev ?? initialProgress, message, event));
        },
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

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>
      <header className="relative border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <Link to="/" className="font-bold text-base sm:text-lg flex items-center gap-2 shrink-0 min-w-0">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <span className="truncate">AIDarkCesar</span>
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
            Studio Dark YouTube
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Roteiro, narração e imagens cinematográficas geradas por IA — prontas para render em MP4.
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
                  <p className="text-sm font-medium text-primary">{script.seoTitle}</p>
                </>
              )}
              <div className="mt-3 text-xs uppercase text-muted-foreground">Hook</div>
              <p className="text-sm">{script.hook}</p>
              {script.tags && script.tags.length > 0 && (
                <>
                  <div className="mt-3 text-xs uppercase text-muted-foreground">Tags SEO ({script.tags.length})</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {script.tags.map((t) => (
                      <span key={t} className="text-[10px] rounded-full bg-white/10 border border-white/10 px-2 py-0.5">{t}</span>
                    ))}
                  </div>
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
                  🚀 Animar cenas-chave (~{(keySceneIndexes(script.scenes.length).length * 0.05).toFixed(2)} USD)
                </button>
                <button
                  onClick={onAssemble}
                  disabled={assembling}
                  className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {assembling ? `Montando… ${assembleMsg}` : "Montar Vídeo"}
                </button>
              </div>
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
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3 animate-fade-in hover:border-primary/30 hover:bg-white/[0.07] transition"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      Cena {i + 1}
                      {keySceneIndexes(script.scenes.length).includes(i) && (
                        <span className="text-[10px] rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-accent">⭐ chave</span>
                      )}
                    </div>
                    <input
                      value={sc.title}
                      onChange={(e) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s) })}
                      className="flex-1 bg-transparent border-b border-white/10 focus:border-primary/60 outline-none font-semibold text-sm py-1"
                    />
                  </div>
                  <textarea
                    value={sc.narration}
                    onChange={(e) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, narration: e.target.value } : s) })}
                    rows={4}
                    className="w-full rounded-md bg-black/30 border border-white/10 focus:border-primary/60 outline-none p-2 text-sm leading-relaxed resize-y"
                    placeholder="Narração da cena…"
                  />
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Image prompt (editar)</summary>
                    <textarea
                      value={sc.imagePrompt}
                      onChange={(e) => setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s, idx) => idx === i ? { ...s, imagePrompt: e.target.value } : s) })}
                      rows={2}
                      className="mt-1 w-full rounded-md bg-black/30 border border-white/10 focus:border-primary/60 outline-none p-2 text-xs resize-y"
                    />
                  </details>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy[`img${i}`]}
                          onClick={() => genImage(i, sc.imagePrompt)}
                          className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          {busy[`img${i}`] ? "Gerando imagem…" : images[i] ? "Regenerar imagem" : "Gerar imagem"}
                        </button>
                        {images[i]?.final && (
                          <button
                            disabled={busy[`img${i}`]}
                            onClick={() => {
                              const seed = Math.floor(Math.random() * 9999);
                              const variants = ["different angle", "alternative composition", "new lighting", "wider shot", "closer shot", "different mood"];
                              const v = variants[seed % variants.length];
                              genImage(i, `${sc.imagePrompt}, ${v}, variation ${seed}`);
                            }}
                            className="rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary px-3 py-1.5 text-xs disabled:opacity-50"
                          >
                            ✨ Outra imagem
                          </button>
                        )}
                      </div>
                      {images[i] && (
                        <div className="space-y-2">
                          <img
                            src={images[i].url}
                            className={`w-full rounded-md transition-[filter] ${images[i].final ? "" : "blur-lg"}`}
                            alt=""
                          />
                          {images[i].final && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <a href={images[i].url} download={`cena-${i + 1}.png`} className="text-xs underline">Baixar PNG</a>
                              {images[i].modelUsed && (
                                <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                                  {images[i].modelUsed}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button
                        disabled={busy[`aud${i}`]}
                        onClick={() => genAudio(i, sceneNarration(sc, i, script.title))}
                        className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {busy[`aud${i}`] ? "Gerando áudio…" : audios[i] ? "Regenerar áudio" : "Gerar narração"}
                      </button>
                      {audios[i] && (
                        <div className="space-y-1">
                          <audio controls src={audios[i]} className="w-full" />
                          <a href={audios[i]} download={`cena-${i + 1}.mp3`} className="text-xs underline">Baixar MP3</a>
                        </div>
                      )}
                    </div>
                  </div>
                  {images[i]?.final && (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <button
                        disabled={busy[`vid${i}`]}
                        onClick={() => genAnimate(i, sc.imagePrompt)}
                        className="rounded-md bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        {busy[`vid${i}`] ? "🎬 Animando (Replicate, ~1-2 min)…" : videos[i] ? "🎬 Re-animar cena" : "🎬 Animar cena (dar vida)"}
                      </button>
                      {videos[i] && (
                        <div className="space-y-1">
                          <video controls src={videos[i].url} className="w-full rounded-md" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={videos[i].url} download={`cena-${i + 1}.mp4`} className="text-xs underline">Baixar MP4</a>
                            {videos[i].modelUsed && (
                              <span className="text-[10px] rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                                {videos[i].modelUsed}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Dica: após gerar todas imagens + áudios, clique em "Montar Vídeo MP4". A render usa Canvas nativo do navegador — rápido, sem download de engine.
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
  const defaultWhen = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
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