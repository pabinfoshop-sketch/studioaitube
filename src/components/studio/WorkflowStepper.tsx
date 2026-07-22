import { Pencil, FileText, Image, Wand, Film, Download, Check } from "lucide-react";

const STEPS = [
  { id: "tema", label: "Tema", icon: Pencil },
  { id: "roteiro", label: "Roteiro", icon: FileText },
  { id: "cenas", label: "Gerar Cenas", icon: Image },
  { id: "efeitos", label: "Efeitos", icon: Wand },
  { id: "montagem", label: "Montagem", icon: Film },
  { id: "exportar", label: "Exportar", icon: Download },
] as const;

type WorkflowStepperProps = {
  topic: string;
  scriptExists: boolean;
  allAssetsReady: boolean;
  effectsConfigured: boolean;
  assembling: boolean;
  videoReady: boolean;
};

function getActiveStep(props: WorkflowStepperProps): number {
  if (props.videoReady) return 5;
  if (props.assembling) return 4;
  if (props.effectsConfigured) return 4;
  if (props.allAssetsReady) return 3;
  if (props.scriptExists) return 2;
  if (props.topic.trim().length > 0) return 1;
  return 0;
}

export function WorkflowStepper(props: WorkflowStepperProps) {
  const active = getActiveStep(props);

  return (
    <div className="sticky top-[53px] z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <nav aria-label="Progresso do workflow" className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = i < active;
          const isActive = i === active;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {/* Step pill */}
              <button
                type="button"
                disabled
                className={`
                  relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium
                  whitespace-nowrap transition-all duration-300 shrink-0
                  ${isCompleted
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : isActive
                      ? "bg-primary/15 text-primary border border-primary/40 shadow-[0_0_12px_oklch(var(--primary)/0.2)]"
                      : "bg-white/5 text-muted-foreground/50 border border-white/10"
                  }
                `}
              >
                {isCompleted ? (
                  <span className="w-4 h-4 rounded-full bg-green-500/30 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </span>
                ) : (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? "bg-primary/30" : "bg-white/10"
                  }`}>
                    <Icon className="w-3 h-3" />
                  </span>
                )}
                {/* Full label on desktop, abbreviated on mobile */}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.label.split(" ")[0]}</span>
                {isActive && (
                  <span className="absolute inset-0 rounded-full border border-primary/30 animate-pulse pointer-events-none" />
                )}
              </button>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px min-w-[12px] sm:min-w-[20px] mx-1 sm:mx-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10" />
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500/40 transition-all duration-500"
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}