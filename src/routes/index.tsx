import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-scene.jpg";
import featTemplates from "@/assets/feat-templates.jpg";
import featCharacters from "@/assets/feat-characters.jpg";
import featTransitions from "@/assets/feat-transitions.jpg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sparkles, ArrowRight, Play, Star, Menu, Pause,
  Wand2, Mic, Film, Zap, Youtube, Layers, Rocket, Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

const navLinks = [
  { href: "#tools", label: "Ferramentas" },
  { href: "#features", label: "Recursos" },
  { href: "#models", label: "Modelos IA" },
  { href: "#testimonials", label: "Depoimentos" },
  { href: "#pricing", label: "Preços" },
];

const scenes = [
  { title: "Roteiro", icon: Wand2, color: "from-indigo-500 to-blue-500", caption: "IA gerando roteiro cena a cena..." },
  { title: "Imagem", icon: Film, color: "from-cyan-500 to-blue-500", caption: "Renderizando cenas cinematográficas..." },
  { title: "Narração", icon: Mic, color: "from-emerald-500 to-teal-500", caption: "Sintetizando voz profissional..." },
  { title: "Montagem", icon: Play, color: "from-blue-500 to-indigo-500", caption: "Montando vídeo MP4 em 1080p..." },
];

const tools = [
  { emoji: "🎬", label: "Vídeo dark", img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop" },
  { emoji: "👻", label: "História assombrada", img: "https://images.unsplash.com/photo-1507434965515-61970f2bd7c6?w=600&auto=format&fit=crop" },
  { emoji: "🔪", label: "True crime", img: "https://images.unsplash.com/photo-1509909756405-be0199881695?w=600&auto=format&fit=crop" },
  { emoji: "🌌", label: "Mistério cósmico", img: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop" },
  { emoji: "⚡", label: "Vídeo num clique", img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop" },
  { emoji: "🖼️", label: "Imagem para vídeo", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop" },
  { emoji: "💡", label: "Explicativo", img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&auto=format&fit=crop" },
];

const models = ["Gemini 2.5", "GPT-4o TTS", "Nano Banana", "VEO 3", "Sora 2", "HaiLuo", "Kling", "Midjourney", "Qwen", "SeeDance"];

const allTools: [string, string, typeof Wand2][] = [
  ["História para vídeo", "Transforme histórias em vídeos estruturados, organizados por cenas.", Layers],
  ["Texto para vídeo", "Crie vídeos a partir de descrições de texto simples.", Wand2],
  ["Guião para vídeo", "Converta guiões escritos em vídeos completos.", Film],
  ["Vídeos longos até 10min", "Vídeos coerentes do início ao fim, prontos para monetizar.", Rocket],
  ["Animação com IA", "Gere vídeos animados sem trabalho manual de animação.", Zap],
  ["Narração TTS realista", "Vozes naturais em múltiplos tons — de ASMR a terror.", Mic],
  ["Imagem para vídeo", "Anime imagens e ilustrações em cenas em movimento.", Film],
  ["Editor visual", "Refine cenas com uma interface simples e rápida.", Layers],
  ["Legendas com IA", "Gere legendas precisas para qualquer vídeo.", Sparkles],
];

const testimonials = [
  { name: "Sarah Chen", role: "Criadora de conteúdo", img: "https://i.pravatar.cc/150?img=1", text: "Meu canal dark cresceu 3x em 2 meses. As cenas cinematográficas geradas parecem feitas em estúdio." },
  { name: "Michael Rodriguez", role: "YouTuber true crime", img: "https://i.pravatar.cc/150?img=12", text: "Da ideia ao MP4 pronto em uma tarde. Antes eu levava uma semana editando." },
  { name: "Emily Watson", role: "Storyteller", img: "https://i.pravatar.cc/150?img=5", text: "A voz Onyx dá o tom perfeito pras minhas histórias assombradas. Meus inscritos adoraram." },
  { name: "David Kim", role: "Editor de vídeo", img: "https://i.pravatar.cc/150?img=13", text: "Uso pra prototipar cenas antes da filmagem. Economizo horas de storyboard." },
  { name: "Jessica Thompson", role: "Podcaster", img: "https://i.pravatar.cc/150?img=9", text: "Transformei meus episódios em vídeos visuais em minutos. Retenção subiu muito." },
  { name: "Robert Anderson", role: "Criador indie", img: "https://i.pravatar.cc/150?img=15", text: "Custo zero pra começar, resultado profissional. Isso simplesmente não existia antes." },
];

function useCountUp(target: number, duration = 1600, start = false) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return n;
}

function Stat({ n, suffix, label, start }: { n: number; suffix: string; label: string; start: boolean }) {
  const v = useCountUp(n, 1800, start);
  return (
    <div>
      <div className="text-3xl sm:text-5xl md:text-6xl font-semibold bg-gradient-to-r from-cyan-300 via-primary to-accent bg-clip-text text-transparent tabular-nums">
        {v.toLocaleString("pt-BR")}{suffix}
      </div>
      <div className="mt-2 text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function Index() {
  const [playing, setPlaying] = useState(true);
  const [scene, setScene] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsInView, setStatsInView] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setScene((s) => (s + 1) % scenes.length), 2400);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setStatsInView(true),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loopModels = [...models, ...models];
  const loopTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden scroll-smooth">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/25 blur-[180px] animate-float-slow" />
        <div className="absolute top-1/3 -right-32 h-[600px] w-[600px] rounded-full bg-accent/25 blur-[180px] animate-float-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[160px] animate-float-slow" style={{ animationDelay: "4s" }} />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <button onClick={() => scrollTo("#top")} className="flex items-center gap-2 font-semibold tracking-tight shrink-0 group">
            <span className="relative h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 via-primary to-accent flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-110 transition">
              <Sparkles className="h-4 w-4 text-background" />
              <span className="absolute inset-0 rounded-full bg-primary/40 blur-md -z-10 group-hover:blur-lg transition" />
            </span>
            <span className="text-sm sm:text-base bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">AIDarkCesar</span>
          </button>
          <nav className="hidden lg:flex items-center gap-8 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)} className="relative hover:text-foreground transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 hover:after:w-full after:bg-primary after:transition-all">
                {l.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full btn-blue-gradient text-xs sm:text-sm border-0">
              <Link to="/studio">Abrir Studio</Link>
            </Button>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden rounded-full border-border bg-card/50 h-9 w-9">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background border-border">
                <nav className="mt-10 flex flex-col gap-2">
                  {navLinks.map((l) => (
                    <button key={l.href} onClick={() => scrollTo(l.href)} className="text-left px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition">
                      {l.label}
                    </button>
                  ))}
                  <Link to="/studio" onClick={() => setMenuOpen(false)} className="mt-4 text-center px-4 py-3 rounded-full btn-blue-gradient font-medium">
                    Abrir Studio
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        id="top"
        ref={heroRef}
        className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center"
        style={{ ["--mx" as string]: "50%", ["--my" as string]: "50%" } as React.CSSProperties}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(600px circle at var(--mx) var(--my), oklch(0.65 0.20 250 / 0.25), transparent 60%)",
          }}
        />
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs sm:text-sm text-muted-foreground animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
            <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Novo · Suporta vídeos até 10min para monetização no YouTube
        </div>

        <h1 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
          <span className="block bg-gradient-to-r from-cyan-200 via-primary to-accent bg-clip-text text-transparent animate-gradient">
            Crie vídeos dark
          </span>
          <span className="block text-foreground mt-2">para YouTube com IA</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          Roteiro, narração cinematográfica e cenas geradas por IA — vídeo MP4 pronto em minutos. Grátis para começar, sem cartão.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="group rounded-full h-14 px-8 text-base btn-blue-gradient border-0 relative overflow-hidden">
            <Link to="/studio">
              <span className="relative z-10 flex items-center gap-2">
                Criar meu primeiro vídeo <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo("#features")} className="rounded-full h-14 px-8 text-base border-border bg-card/50 backdrop-blur">
            Ver recursos
          </Button>
        </div>

        {/* Trust bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Sem cartão</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Exporta MP4 1080p</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Voz TTS incluída</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Pronto para monetizar</span>
        </div>

        {/* Hero video mockup */}
        <div className="relative mt-14 sm:mt-16">
          {/* Floating orbiting icons (desktop) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            {[Wand2, Film, Mic, Youtube].map((I, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-12 h-12 rounded-2xl bg-card/80 backdrop-blur border border-white/10 flex items-center justify-center shadow-xl shadow-primary/20"
                style={{
                  animation: `orbit 18s linear infinite`,
                  animationDelay: `${-i * 4.5}s`,
                }}
              >
                <I className="h-5 w-5 text-primary" />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 -rotate-3 rounded-3xl bg-card/60 border border-border translate-y-4 hidden sm:block" />
          <div className="absolute inset-0 rotate-2 rounded-3xl bg-card/60 border border-border translate-y-2 hidden sm:block" />
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/30 bg-black">
            <div className="relative aspect-video">
              <img src={heroImg} alt="Cena gerada por IA" className="absolute inset-0 h-full w-full object-cover opacity-70 scale-110 animate-[kenburns_20s_ease-in-out_infinite_alternate]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90 bg-black/40 backdrop-blur rounded-full px-3 py-1.5 border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> AO VIVO · IA trabalhando
                  </div>
                  <div className="text-xs sm:text-sm text-white/70 font-mono bg-black/40 backdrop-blur rounded-full px-3 py-1.5 border border-white/10">
                    Cena {scene + 1}/{scenes.length}
                  </div>
                </div>

                <div className="text-left">
                  <div key={scene} className="animate-fade-in">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-gradient-to-r ${scenes[scene].color} shadow-lg`}>
                      {(() => { const I = scenes[scene].icon; return <I className="h-3.5 w-3.5" />; })()}
                      {scenes[scene].title}
                    </div>
                    <div className="mt-3 text-white text-sm sm:text-lg font-medium max-w-md">{scenes[scene].caption}</div>
                  </div>
                  <div className="mt-4 flex gap-1.5">
                    {scenes.map((_, i) => (
                      <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === scene ? "w-10 bg-white" : i < scene ? "w-6 bg-white/60" : "w-6 bg-white/20"}`} />
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pausar" : "Reproduzir"}
                className="group absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition shadow-2xl"
              >
                <span className="absolute inset-0 rounded-full bg-white/40 animate-ping group-hover:animate-none" />
                {playing
                  ? <Pause className="relative h-6 w-6 sm:h-8 sm:w-8 text-background fill-background" />
                  : <Play className="relative h-6 w-6 sm:h-8 sm:w-8 text-background fill-background ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee: models */}
      <section id="models" className="py-10 border-y border-border bg-card/30 overflow-hidden scroll-mt-20">
        <div className="text-center text-xs sm:text-sm text-muted-foreground uppercase tracking-widest mb-6 px-4">
          Alimentado pelos melhores modelos de IA
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex gap-3 w-max animate-marquee">
            {loopModels.map((m, i) => (
              <span key={i} className="px-5 py-2.5 rounded-full border border-border bg-card/80 backdrop-blur text-sm text-muted-foreground whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary uppercase tracking-widest mb-4">
            Ferramentas
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">O que quer criar hoje?</h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base">
            Escolha um caminho — a IA cuida do roteiro, das cenas e da narração.
          </p>
        </div>
        <div className="mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {tools.map((t, i) => (
            <Link
              key={t.label}
              to="/studio"
              className="group relative overflow-hidden aspect-[3/4] rounded-2xl border border-border bg-card hover:border-primary/60 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 animate-fade-in"
              style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
            >
              <img src={t.img} alt={t.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50 group-hover:opacity-90 group-hover:scale-110 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
              <div className="absolute -inset-x-full top-0 h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shine_1s_ease-out]" />
              <div className="relative h-full flex flex-col justify-between p-3 sm:p-4">
                <span className="text-2xl sm:text-3xl drop-shadow">{t.emoji}</span>
                <div>
                  <div className="font-medium text-xs sm:text-sm">{t.label}</div>
                  <div className="mt-1 text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Gerar <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 space-y-16 sm:space-y-28 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-xs text-accent uppercase tracking-widest mb-4">
            Recursos
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            Pensado para vídeos <span className="bg-gradient-to-r from-cyan-300 to-accent bg-clip-text text-transparent">completos</span>, não só clips
          </h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base">
            Da primeira cena ao MP4 final — coerência visual, ritmo narrativo e áudio profissional.
          </p>
        </div>

        {[
          { img: featTemplates, title: "Modelos de história que fazem o trabalho pesado", desc: "Templates prontos para true crime, mistério, terror, história e explicativos. Foque na história, a estrutura vem pronta." },
          { img: featCharacters, title: "Cenas cinematográficas dark consistentes", desc: "A IA mantém iluminação, paleta e clima cena a cena — resultado que parece feito em estúdio." },
          { img: featTransitions, title: "Narração TTS + montagem MP4 automáticas", desc: "Voz Onyx, Echo, Fable e mais — a IA junta imagem + áudio e entrega o vídeo final em 1080p." },
        ].map((f, i) => (
          <div key={f.title} className={`grid md:grid-cols-2 gap-8 sm:gap-14 items-center ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <div className="group relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border">
              <img src={f.img} alt={f.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <div>
              <div className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono">0{i + 1}</div>
              <h3 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section ref={statsRef} className="border-y border-border bg-card/30 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 relative">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-semibold">Usado por criadores em todo o mundo</h2>
          <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <Stat n={50} suffix="M+" label="Minutos gerados" start={statsInView} />
            <Stat n={30} suffix="M+" label="Vídeos criados" start={statsInView} />
            <Stat n={20} suffix="M+" label="Criadores ativos" start={statsInView} />
          </div>
        </div>
      </section>

      {/* All tools */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary uppercase tracking-widest mb-4">
            Kit completo
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">Tudo o que você precisa num só lugar</h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base">Combine as ferramentas para criar, refinar e publicar sem sair da plataforma.</p>
        </div>
        <div className="mt-10 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {allTools.map(([title, desc, Icon], i) => (
            <Link
              key={title}
              to="/studio"
              className="group p-6 rounded-2xl border border-border bg-card/60 backdrop-blur hover:border-primary/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center group-hover:from-primary/40 group-hover:to-accent/40 transition">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="mt-4 font-semibold text-sm sm:text-base">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="border-t border-border py-16 sm:py-24 overflow-hidden scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
            Com a confiança de <span className="bg-gradient-to-r from-cyan-300 to-primary bg-clip-text text-transparent">criadores reais</span>
          </h2>
        </div>
        <div className="relative mt-12">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex gap-4 w-max animate-marquee py-2">
            {loopTestimonials.map((t, i) => (
              <Card key={i} className="w-[320px] sm:w-[380px] shrink-0 p-6 border-border bg-card/80 backdrop-blur">
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-4 w-4 fill-primary" />)}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <img src={t.img} alt={t.name} loading="lazy" className="h-10 w-10 rounded-full" />
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/30 animate-gradient" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.65 0.20 250 / 0.3), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.75 0.16 220 / 0.3), transparent 40%)" }} />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs mb-6">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            Comece grátis · Sem cartão
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight">
            Seu próximo vídeo dark <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-cyan-200 via-primary to-accent bg-clip-text text-transparent animate-gradient">está a um clique</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Roteiro + cenas + narração + MP4 final. Tudo pronto em minutos, direto no navegador.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="group rounded-full h-14 px-10 text-base btn-blue-gradient border-0 relative overflow-hidden">
              <Link to="/studio">
                <span className="relative z-10 flex items-center gap-2">
                  Começar grátis <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </span>
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs sm:text-sm text-muted-foreground px-4">
        © {new Date().getFullYear()} AIDarkCesar · Todos os direitos reservados
      </footer>
    </div>
  );
}