import { Sparkles, TrendingUp, Wand } from "lucide-react";
import { CopyButton, CopyableText } from "@/components/ui/CopyButton";
import type { Script } from "@/hooks/useStudio";
import type { TikTokAIOptions } from "@/lib/tiktok-ai-effects";

type ScriptHeaderProps = {
  script: Script;
  thumbnail: string | null;
  thumbBusy: boolean;
  tiktokAI: TikTokAIOptions;
  tiktokPanelOpen: boolean;
  assembling: boolean;
  assembleMsg: string;
  keySceneCost: string;
  onGenAll: () => void;
  onGenThumbnail: () => void;
  onAnimateKeyScenes: () => void;
  onToggleTikTokPanel: () => void;
  onAssemble: () => void;
};

export function ScriptHeader({
  script, thumbnail, thumbBusy, tiktokAI, tiktokPanelOpen,
  assembling, assembleMsg, keySceneCost,
  onGenAll, onGenThumbnail, onAnimateKeyScenes, onToggleTikTokPanel, onAssemble,
}: ScriptHeaderProps) {
  const hasTikTokAIActive = tiktokAI.visualEffect !== "none" ||
    tiktokAI.captions.enabled ||
    tiktokAI.voiceEffect !== "none" ||
    tiktokAI.music.enabled ||
    tiktokAI.transition !== "none";

  return (
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
        <button onClick={onGenAll} className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium">
          Gerar todas imagens + áudios
        </button>
        <button
          onClick={onGenThumbnail}
          disabled={thumbBusy}
          className="rounded-md border border-primary/40 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {thumbBusy ? "🎨 Gerando thumb…" : thumbnail ? "🎨 Regerar Thumbnail" : "🎨 Gerar Thumbnail"}
        </button>
        <button
          onClick={onAnimateKeyScenes}
          className="rounded-md border border-accent/40 bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2 text-sm font-medium"
        >
          🚀 Animar cenas-chave (~{keySceneCost} USD)
        </button>
        <button
          onClick={onToggleTikTokPanel}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition flex items-center gap-1.5 ${
            tiktokPanelOpen
              ? "border-primary/60 bg-primary/20 text-primary"
              : hasTikTokAIActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-white/20 bg-white/5 hover:bg-white/10"
          }`}
        >
          <Wand className="w-4 h-4" />
          TikTok AI
          {hasTikTokAIActive && (
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
    </div>
  );
}