import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wand2,
  Image,
  Mic,
  Sparkles,
  Play,
  FileText,
  TrendingUp,
  Monitor,
  ArrowRight,
  Film,
  Github,
  PlayCircle,
  Timer,
  Download,
  Clapperboard,
  Star,
  Quote,
  Search,
  Zap,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

/* ──────────────────────── Data ──────────────────────── */

const featureGroups = [
  {
    label: "Criação de Conteúdo",
    items: [
      {
        icon: Wand2,
        title: "Roteiro com IA",
        desc: "Gere roteiros cena a cena usando múltiplos modelos via OpenRouter. Ideal para mistério, terror, sobrenatural e mais.",
        preview:
          "A IA analisa tendências e cria narrativas envolventes com ganchos, viradas e cliffhangers otimizados para retenção.",
      },
      {
        icon: Image,
        title: "Imagens cinematográficas",
        desc: "Cada cena ganha uma imagem gerada pelo Gemini — atmosférica e alinhada ao seu roteiro.",
        preview: "Estilo dark, alta resolução e consistência visual entre todas as cenas do vídeo.",
      },
      {
        icon: Mic,
        title: "Narração TTS gratuita",
        desc: "Voz profissional sintetizada com Google TTS. Sem custo, sem cadastro em serviços de voz.",
        preview:
          "Vozes em português brasileiro com ritmo e entonação adequados para conteúdo narrativo.",
      },
      {
        icon: Search,
        title: "SEO para YouTube",
        desc: "Título otimizado, descrição e tags gerados automaticamente para maximizar descoberta.",
        preview: "Análise de palavras-chave e sugestões baseadas em tendências atuais do nicho.",
      },
    ],
  },
  {
    label: "Pós-produção IA",
    items: [
      {
        icon: Sparkles,
        title: "Efeitos TikTok AI",
        desc: "Glitch, VHS, noir, legendas automáticas e trilha sonora gerada por IA — tudo integrado.",
        preview:
          "Filtros cinematográficos que transformam vídeos simples em conteúdo premium e viral.",
      },
      {
        icon: Monitor,
        title: "Montagem no navegador",
        desc: "Canvas + MediaRecorder montam seu vídeo direto no browser. Sem upload, sem espera. Saída em WebM.",
        preview:
          "Renderização completa no cliente — privado, rápido e sem dependência de servidores.",
      },
      {
        icon: Image,
        title: "Thumbnail automática",
        desc: "Thumbnails gerados com identidade visual do canal, prontos para upload no YouTube.",
        preview:
          "Layouts testados para CTR com tipografia impactante e cores que destacam no feed.",
      },
      {
        icon: TrendingUp,
        title: "Planejador de canal",
        desc: "Sugestões de tendências e planejamento de conteúdo para manter seu canal consistente.",
        preview:
          "Calendário editorial inteligente com base em sazonalidade e performance do nicho.",
      },
    ],
  },
];

const steps = [
  {
    num: "01",
    icon: FileText,
    title: "Escolha o tema",
    time: "~30s",
    desc: "Selecione o nicho (mistério, terror, sobrenatural) e forneça o tema ou deixe a IA sugerir com base em tendências do momento.",
  },
  {
    num: "02",
    icon: Clapperboard,
    title: "A IA cria tudo",
    time: "~5min",
    desc: "Roteiro, imagens cinematográficas, narração, efeitos visuais e trilha sonora são gerados automaticamente em paralelo.",
  },
  {
    num: "03",
    icon: Download,
    title: "Baixe o vídeo",
    time: "~2min",
    desc: "Exporte o vídeo final em WebM com qualidade profissional e faça o upload direto no seu canal do YouTube.",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    initials: "LM",
    color: "from-[oklch(0.55_0.20_270)] to-[oklch(0.45_0.18_290)]",
    channel: "Canal de mistério · 120K inscritos",
    text: "Eu gastava 6 horas por vídeo editando. Com o StudioAITube, consigo produzir 3 vídeos por dia. A qualidade do roteiro e das imagens é impressionante — meu canal cresceu 400% em dois meses.",
    stars: 5,
  },
  {
    name: "Ana C.",
    initials: "AC",
    color: "from-[oklch(0.55_0.18_200)] to-[oklch(0.45_0.15_220)]",
    channel: "Canal de terror · 85K inscritos",
    text: "O efeito VHS e a narração automática são perfeitos pro meu nicho. Nunca pensei que IA ia conseguir capturar aquele clima sombrio que eu queria. Me economiza horas todo dia.",
    stars: 5,
  },
  {
    name: "Pedro H.",
    initials: "PH",
    color: "from-[oklch(0.55_0.22_30)] to-[oklch(0.45_0.18_50)]",
    channel: "Canal de curiosidades dark · 200K inscritos",
    text: "Testei várias ferramentas de geração de vídeo e nenhuma chega perto do StudioAITube. O workflow completo, do tema ao vídeo final, é surreal. E tudo no navegador!",
    stars: 5,
  },
];

const stats = [
  { value: 10000, suffix: "+", label: "Roteiros gerados" },
  { value: 85000, suffix: "+", label: "Imagens criadas" },
  { value: 5000, suffix: "+", label: "Vídeos montados" },
];

/* ──────────────────── Sub-components ──────────────────── */

function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`} aria-label={text}>
      <span className="relative z-10">{text}</span>
      <span
        className="absolute inset-0 z-20 text-primary/30 [animation:glitch-1_2.5s_infinite_linear_alternate-reverse]"
        aria-hidden="true"
      >
        {text}
      </span>
      <span
        className="absolute inset-0 z-20 text-[oklch(0.78_0.15_220)]/30 [animation:glitch-2_3s_infinite_linear_alternate]"
        aria-hidden="true"
      >
        {text}
      </span>
    </span>
  );
}

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-16 max-w-2xl text-center md:mb-20">
      {eyebrow && (
        <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">{title}</h2>
      {(description || children) && (
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
          {description}
          {children}
        </p>
      )}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  preview,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  preview: string;
}) {
  return (
    <div className="gradient-border-card group rounded-2xl p-6 transition-all duration-300 hover:bg-muted/30 sm:p-7">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <p className="text-xs leading-relaxed text-muted-foreground/70 italic">{preview}</p>
    </div>
  );
}

/* ────────────────────── Main Page ────────────────────── */

function Index() {
  return (
    <div className="noise-overlay min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Film className="h-4.5 w-4.5" />
            </div>
            StudioAITube
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-xl btn-blue-gradient px-5 py-2.5 text-sm"
          >
            Abrir Studio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative overflow-hidden">
          {/* Background orbs */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-[oklch(0.65_0.20_250_/_0.07)] blur-[140px]" />
          <div className="pointer-events-none absolute top-1/3 -right-32 h-[400px] w-[400px] rounded-full bg-[oklch(0.78_0.15_220_/_0.05)] blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-20 text-center md:pb-24 md:pt-28 lg:pt-36">
            {/* Badge */}
            <div className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground/80">Open Source & Gratuito</span>
              <span className="text-muted-foreground/60">·</span>
              <span>Privado — roda 100% no navegador</span>
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up-delay-1 text-4xl leading-[1.1] font-extrabold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl">
              Crie vídeos dark para YouTube{" "}
              <GlitchText
                text="com IA"
                className="bg-gradient-to-r from-[oklch(0.72_0.19_250)] to-[oklch(0.78_0.15_220)] bg-clip-text text-transparent"
              />
            </h1>

            {/* Subheadline */}
            <p className="animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Do roteiro ao vídeo final, direto no navegador. Roteiros, imagens cinematográficas,
              narração, efeitos e montagem — tudo gerado por inteligência artificial.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-up-delay-3 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-xl btn-blue-gradient px-8 py-3.5 text-base"
              >
                Começar a criar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-7 py-3.5 text-base font-medium text-foreground transition-all duration-200 hover:bg-muted/50 backdrop-blur-sm"
              >
                <PlayCircle className="h-4 w-4 text-primary" />
                Como funciona
              </a>
            </div>

            {/* Browser mockup */}
            <div className="animate-fade-up-delay-4 relative mx-auto mt-16 max-w-3xl md:mt-20">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-[oklch(0.65_0.20_250_/_0.08)] backdrop-blur-md">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[oklch(0.6_0.15_25)]" />
                    <div className="h-3 w-3 rounded-full bg-[oklch(0.65_0.14_85)]" />
                    <div className="h-3 w-3 rounded-full bg-[oklch(0.55_0.15_145)]" />
                  </div>
                  <div className="flex flex-1 justify-center">
                    <div className="flex items-center gap-2 rounded-lg bg-background/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                      <Globe className="h-3 w-3" />
                      studioaitube.com/studio
                    </div>
                  </div>
                  <div className="w-[52px]" />
                </div>
                {/* Fake video preview area */}
                <div className="relative aspect-video bg-gradient-to-br from-[oklch(0.18_0.06_270)] to-[oklch(0.14_0.05_290)]">
                  {/* Cinematic bars */}
                  <div className="absolute inset-x-0 top-0 h-[12%] bg-black/40" />
                  <div className="absolute inset-x-0 bottom-0 h-[12%] bg-black/40" />
                  {/* Scene placeholders */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="grid grid-cols-3 gap-2 opacity-30">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="h-12 w-16 rounded-md bg-gradient-to-br from-primary/20 to-accent/10 sm:h-16 sm:w-20"
                        />
                      ))}
                    </div>
                  </div>
                  {/* Play button overlay */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm transition-all duration-300 hover:bg-primary/30 hover:scale-110 cursor-pointer">
                      <Play className="h-7 w-7 fill-primary text-primary ml-1" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-[12%] inset-x-0 z-10 h-1 bg-white/10">
                    <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-primary to-accent" />
                  </div>
                  {/* Timer */}
                  <div className="absolute bottom-3 right-3 z-10 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur-sm font-mono">
                    02:34 / 08:12
                  </div>
                </div>
              </div>
              {/* Glow under the mockup */}
              <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-3/4 rounded-full bg-[oklch(0.65_0.20_250_/_0.12)] blur-3xl" />
            </div>

            {/* Stats */}
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 md:mt-20 md:gap-10">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" className="border-t border-border/40 py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-5">
            <SectionHeading eyebrow="Funcionalidades" title="Tudo que você precisa em um só lugar">
              Cada etapa da produção do vídeo é automatizada — sem precisar de softwares externos,
              sem upload, sem esperas.
            </SectionHeading>

            {featureGroups.map((group) => (
              <div key={group.label} className="mb-16 last:mb-0">
                <h3 className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  {group.label}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.items.map((f) => (
                    <FeatureCard
                      key={f.title}
                      icon={f.icon}
                      title={f.title}
                      desc={f.desc}
                      preview={f.preview}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section id="como-funciona" className="border-t border-border/40 py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-5">
            <SectionHeading
              eyebrow="Como funciona"
              title="Três passos entre a sua ideia e o vídeo pronto"
            >
              Um fluxo simples e poderoso que transforma qualquer tema em um vídeo dark profissional
              — sem complicação.
            </SectionHeading>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/60 via-primary/30 to-transparent" />

              <div className="flex flex-col gap-12">
                {steps.map((s, i) => (
                  <div key={s.num} className="relative pl-14">
                    {/* Dot */}
                    <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/60 bg-background">
                      <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_oklch(0.65_0.20_250_/_0.6)]" />
                    </div>

                    {/* Content */}
                    <div className="rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-card/70 sm:p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <s.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold tracking-tight">{s.title}</h3>
                          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            <Timer className="h-3 w-3" />
                            {s.time}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                    </div>

                    {/* Connector arrow (not on last) */}
                    {i < steps.length - 1 && (
                      <div className="pointer-events-none absolute -bottom-8 left-[14px] z-10 text-primary/30">
                        <ChevronDownIcon />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ SOCIAL PROOF ═══════════════ */}
        <section className="border-t border-border/40 py-24 md:py-32">
          <div className="mx-auto max-w-5xl px-5">
            <SectionHeading
              eyebrow="Depoimentos"
              title="Criadores que já transformaram seu workflow"
            >
              Milhares de criadores de conteúdo usam o StudioAITube para produzir vídeos dark de
              qualidade profissional.
            </SectionHeading>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="group rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-card/70 sm:p-7"
                >
                  {/* Stars */}
                  <div className="mb-4 flex gap-0.5">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-[oklch(0.75_0.16_85)] text-[oklch(0.75_0.16_85)]"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative mb-5">
                    <Quote className="absolute -top-1 -left-1 h-6 w-6 text-primary/15" />
                    <p className="pl-4 text-sm leading-relaxed text-muted-foreground">{t.text}</p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}
                    >
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.channel}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ CTA ═══════════════ */}
        <section className="relative overflow-hidden border-t border-border/40 py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.65_0.20_250_/_0.04)] to-transparent" />
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-[oklch(0.65_0.20_250_/_0.06)] blur-[120px]" />

          <div className="relative mx-auto max-w-2xl px-5 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
              Pronto para criar seu{" "}
              <span className="bg-gradient-to-r from-[oklch(0.72_0.19_250)] to-[oklch(0.78_0.15_220)] bg-clip-text text-transparent">
                primeiro vídeo?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Sem cadastro obrigatório. Sem cartão de crédito. Abra o studio e comece a criar em
              segundos.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-xl btn-blue-gradient px-8 py-4 text-base"
              >
                Começar a criar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Privado
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Gratuito
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Sem cadastro
              </span>
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 bg-card/20 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link
                to="/"
                className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Film className="h-4.5 w-4.5" />
                </div>
                StudioAITube
              </Link>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Crie vídeos dark profissionais para YouTube com inteligência artificial — direto no
                navegador.
              </p>
              {/* "Feito com IA no Brasil" badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="text-base leading-none">🇧🇷</span>
                Feito com IA no Brasil
              </div>
            </div>

            {/* Produto */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                Produto
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/studio" className="transition-colors hover:text-foreground">
                    Studio
                  </Link>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#como-funciona" className="transition-colors hover:text-foreground">
                    Como funciona
                  </a>
                </li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                Recursos
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Roteiro com IA
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Geração de imagens
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Narração TTS
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Efeitos TikTok AI
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Links */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">
                Legal
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <span className="transition-colors hover:text-foreground cursor-default">
                    Termos de uso
                  </span>
                </li>
                <li>
                  <span className="transition-colors hover:text-foreground cursor-default">
                    Privacidade
                  </span>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground md:flex-row">
            <span>
              &copy; {new Date().getFullYear()} StudioAITube. Todos os direitos reservados.
            </span>
            <span>Deploy em Cloudflare Pages · Código aberto</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Tiny inline chevron-down ── */
function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 5L6 8L9 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Globe icon (needed for browser mockup URL bar) ── */
function Globe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
