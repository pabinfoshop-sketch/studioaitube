import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wand2, Image, Mic, Sparkles, Play, Youtube,
  FileText, TrendingUp, Monitor, ArrowRight, Film,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  {
    icon: Wand2,
    title: "Roteiro com IA",
    desc: "Gere roteiros cena a cena usando múltiplos modelos via OpenRouter. Para mistério, terror, sobrenatural e mais.",
  },
  {
    icon: Image,
    title: "Imagens cinematográficas",
    desc: "Cada cena ganha uma imagem gerada pelo Gemini — atmosférica e alinhada ao seu roteiro.",
  },
  {
    icon: Mic,
    title: "Narração TTS gratuita",
    desc: "Voz profissional sintetizada com Google TTS. Sem custo, sem cadastro em serviços de voz.",
  },
  {
    icon: Sparkles,
    title: "Efeitos TikTok AI",
    desc: "Glitch, VHS, noir, legendas automáticas e trilha sonora gerada por IA — tudo integrado.",
  },
  {
    icon: Monitor,
    title: "Montagem no navegador",
    desc: "Canvas + MediaRecorder montam seu vídeo direto no browser. Sem upload, sem espera. Saída em WebM.",
  },
  {
    icon: Image,
    title: "Thumbnail automática",
    desc: "Thumbnails gerados com identidade visual do canal, prontos para upload no YouTube.",
  },
  {
    icon: Youtube,
    title: "SEO para YouTube",
    desc: "Título otimizado, descrição e tags gerados automaticamente para maximizar descoberta.",
  },
  {
    icon: TrendingUp,
    title: "Planejador de canal",
    desc: "Sugestões de tendências e planejamento de conteúdo para manter seu canal consistente.",
  },
];

const steps = [
  { num: "01", icon: FileText, title: "Escolha o tema", desc: "Selecione o nicho (mistério, terror, sobrenatural) e forneça o tema ou deixe a IA sugerir." },
  { num: "02", icon: Film, title: "A IA cria tudo", desc: "Roteiro, imagens, narração, efeitos e montagem são gerados automaticamente." },
  { num: "03", icon: Play, title: "Baixe o vídeo", desc: "Exporte o vídeo final e faça o upload direto no seu canal." },
];

function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Film className="h-5 w-5 text-primary" />
            StudioAITube
          </Link>
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 rounded-md btn-blue-gradient px-4 py-2 text-sm"
          >
            Abrir Studio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/50">
          {/* Subtle gradient orb */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-[oklch(0.65_0.20_250_/_0.08)] blur-[120px]" />

          <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-24 text-center md:pt-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ferramenta gratuita e open-source
            </div>

            <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl lg:text-6xl">
              Crie vídeos dark para YouTube{" "}
              <span className="bg-gradient-to-r from-[oklch(0.72_0.19_250)] to-[oklch(0.78_0.15_220)] bg-clip-text text-transparent">
                com IA
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Do roteiro ao vídeo final, direto no navegador. Roteiros, imagens cinematográficas, narração, efeitos e montagem — tudo gerado por inteligência artificial.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-lg btn-blue-gradient px-6 py-3 text-base"
              >
                Começar a criar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Play className="h-4 w-4" />
                Como funciona
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-border/50 py-20">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="mt-3 text-muted-foreground">
                Cada etapa da produção do vídeo é automatizada — sem precisar de softwares externos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="border-b border-border/50 py-20">
          <div className="mx-auto max-w-3xl px-4">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Como funciona
              </h2>
              <p className="mt-3 text-muted-foreground">
                Três passos entre a sua ideia e o vídeo pronto.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.num} className="relative text-center md:text-left">
                  {i < steps.length - 1 && (
                    <div className="pointer-events-none absolute top-6 right-0 hidden h-px w-full translate-x-1/2 bg-border md:block" />
                  )}
                  <span className="text-5xl font-black text-primary/20">{s.num}</span>
                  <div className="mt-4 flex items-center gap-2 md:justify-start justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">{s.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.65_0.20_250_/_0.05)] to-transparent" />
          <div className="relative mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Pronto para criar seu primeiro vídeo?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Sem cadastro obrigatório. Sem cartão de crédito. Abra o studio e comece.
            </p>
            <Link
              to="/studio"
              className="mt-8 inline-flex items-center gap-2 rounded-lg btn-blue-gradient px-8 py-3.5 text-base"
            >
              Começar a criar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span className="font-medium text-foreground">StudioAITube</span>
          <span>Ferramenta de criação de vídeos com IA. Deploy em Cloudflare Pages.</span>
        </div>
      </footer>
    </div>
  );
}