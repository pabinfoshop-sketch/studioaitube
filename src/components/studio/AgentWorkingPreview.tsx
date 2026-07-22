import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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

export function AgentWorkingPreview({ modelUsed }: { modelUsed?: string }) {
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
          <div className="font-semibold text-sm">Agente StudioAITube</div>
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
