import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useStudio } from "@/hooks/useStudio";
import { ChannelPlanner } from "@/components/ChannelPlanner";
import { BalanceWidget } from "@/components/studio/BalanceWidget";
import { AgentWorkingPreview } from "@/components/studio/AgentWorkingPreview";
import { AssembleProgress } from "@/components/studio/AssembleProgress";
import { SceneCard } from "@/components/studio/SceneCard";
import { WorkflowStepper } from "@/components/studio/WorkflowStepper";
import { TopicForm } from "@/components/studio/TopicForm";
import { ScriptHeader } from "@/components/studio/ScriptHeader";
import { TikTokAIPanel } from "@/components/studio/TikTokAIPanel";
import { VideoResult } from "@/components/studio/VideoResult";

export const Route = createFileRoute("/studio")({
  component: Studio,
  head: () => ({
    meta: [
      { title: "StudioAITube — Gerar roteiro, narração e cenas" },
      { name: "description", content: "Gere roteiros dark, narração TTS e imagens cinematográficas por cena para seu canal do YouTube." },
    ],
  }),
});

function Studio() {
  const s = useStudio();

  const hasTikTokAIActive = s.tiktokAI.visualEffect !== "none" ||
    s.tiktokAI.captions.enabled ||
    s.tiktokAI.voiceEffect !== "none" ||
    s.tiktokAI.music.enabled ||
    s.tiktokAI.transition !== "none";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-[120px]" />
      </div>

      {/* Header */}
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
        {/* Hero */}
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

        {/* Workflow Stepper */}
        <WorkflowStepper
          topic={s.topic}
          scriptExists={!!s.script}
          allAssetsReady={s.script ? s.script.scenes.every((_, i) => s.images[i]?.final && s.audios[i]) : false}
          effectsConfigured={hasTikTokAIActive}
          assembling={s.assembling}
          videoReady={!!s.videoUrl}
        />

        {/* Topic Form */}
        <TopicForm
          topic={s.topic} setTopic={s.setTopic}
          count={s.count} setCount={s.setCount}
          loading={s.loading}
          voice={s.voice} setVoice={s.setVoice}
          voiceTouched={s.voiceTouched} setVoiceTouched={s.setVoiceTouched}
          onGenerate={s.onGenerate}
        />

        {/* Agent preview while loading */}
        {s.loading && <AgentWorkingPreview modelUsed={s.script?.modelUsed} />}

        {/* Channel planner when idle */}
        {!s.loading && (
          <ChannelPlanner
            onPick={(t) => { s.setTopic(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            history={s.history}
            onDeleteHistory={(id) => s.saveHistory(s.history.filter((h) => h.id !== id))}
          />
        )}

        {/* Script & Scenes */}
        {s.script && (
          <section className="space-y-6">
            <ScriptHeader
              script={s.script}
              thumbnail={s.thumbnail}
              thumbBusy={s.thumbBusy}
              tiktokAI={s.tiktokAI}
              tiktokPanelOpen={s.tiktokPanelOpen}
              assembling={s.assembling}
              assembleMsg={s.assembleMsg}
              keySceneCost={(s.keyScenes.length * 0.05).toFixed(2)}
              onGenAll={s.genAll}
              onGenThumbnail={s.genThumbnail}
              onAnimateKeyScenes={s.animateKeyScenes}
              onToggleTikTokPanel={() => s.setTiktokPanelOpen(!s.tiktokPanelOpen)}
              onAssemble={s.onAssemble}
            />

            {/* TikTok AI Panel */}
            {s.tiktokPanelOpen && (
              <TikTokAIPanel
                tiktokAI={s.tiktokAI}
                sceneCaptions={s.sceneCaptions}
                captionBusy={s.captionBusy}
                musicBusy={s.musicBusy}
                musicBlob={s.musicBlob}
                hasAudios={!!s.script?.scenes.some((_, i) => s.audios[i])}
                updateTikTokAI={s.updateTikTokAI}
                updateTikTokCaption={s.updateTikTokCaption}
                updateTikTokMusic={s.updateTikTokMusic}
                genAllCaptions={s.genAllCaptions}
                genBackgroundMusic={s.genBackgroundMusic}
                onReset={s.resetTikTokAI}
              />
            )}

            {/* Thumbnail preview */}
            {s.thumbnail && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 mt-4 space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Thumbnail 1280x720</div>
                <img src={s.thumbnail} alt="Thumbnail" className="w-full max-w-md rounded-lg border border-white/10" />
                <a href={s.thumbnail} download="thumbnail.jpg" className="text-xs underline">Baixar thumbnail JPG</a>
              </div>
            )}

            {/* Assemble progress */}
            {s.assembling && s.assembleProgress && <AssembleProgress state={s.assembleProgress} images={s.images} />}

            {/* Video result */}
            {s.videoUrl && <VideoResult videoUrl={s.videoUrl} script={s.script} thumbnail={s.thumbnail} />}

            {/* Scene cards */}
            <div className="space-y-4">
              {s.script.scenes.map((sc, i) => (
                <SceneCard
                  key={i}
                  scene={sc}
                  index={i}
                  isKeyScene={s.keyScenes.includes(i)}
                  busy={s.busy}
                  image={s.images[i]}
                  audio={s.audios[i]}
                  video={s.videos[i]}
                  onTitleChange={(value) => s.setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s2, idx) => idx === i ? { ...s2, title: value } : s2) })}
                  onNarrationChange={(value) => s.setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s2, idx) => idx === i ? { ...s2, narration: value } : s2) })}
                  onImagePromptChange={(value) => s.setScript((prev) => prev && { ...prev, scenes: prev.scenes.map((s2, idx) => idx === i ? { ...s2, imagePrompt: value } : s2) })}
                  onGenerateImage={() => s.genImage(i, sc.imagePrompt)}
                  onGenerateVariantImage={() => {
                    const seed = Math.floor(Math.random() * 9999);
                    const variants = ["different angle", "alternative composition", "new lighting", "wider shot", "closer shot", "different mood"];
                    const v = variants[seed % variants.length];
                    s.genImage(i, `${sc.imagePrompt}, ${v}, variation ${seed}`);
                  }}
                  onGenerateAudio={() => s.genAudio(i, s.sceneNarration(sc, i, s.script!.title))}
                  onAnimate={() => s.genAnimate(i, sc.imagePrompt)}
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