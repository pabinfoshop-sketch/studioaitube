import { useState, useEffect, useRef } from "react";
import { Loader2, Film, Check } from "lucide-react";
import type { AssembleEvent } from "@/lib/assembleVideo";

export type AssembleProgressState = {
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

export function updateAssembleProgress(prev: AssembleProgressState, message: string, event?: AssembleEvent): AssembleProgressState {
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
export function AssembleProgress({ state, images }: { state: AssembleProgressState; images: Record<number, { url: string; final: boolean }> }) {
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