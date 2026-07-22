import { Sparkles, Film, Mic2, Loader2, Music, Captions, Wand, Check } from "lucide-react";
import {
  VISUAL_EFFECTS, TRANSITION_EFFECTS, VOICE_EFFECTS, CAPTION_STYLES, MUSIC_MOODS,
  DEFAULT_TIKTOK_AI,
  type TikTokAIOptions, type VisualEffect, type TransitionEffect, type VoiceEffect, type CaptionStyle, type MusicMood,
} from "@/lib/tiktok-ai-effects";
import type { CaptionSegment } from "@/lib/ai-client";

type TikTokAIPanelProps = {
  tiktokAI: TikTokAIOptions;
  sceneCaptions: Record<number, CaptionSegment[]>;
  captionBusy: boolean;
  musicBusy: boolean;
  musicBlob: Blob | null;
  hasAudios: boolean;
  updateTikTokAI: (patch: Partial<TikTokAIOptions>) => void;
  updateTikTokCaption: (patch: Partial<TikTokAIOptions["captions"]>) => void;
  updateTikTokMusic: (patch: Partial<TikTokAIOptions["music"]>) => void;
  genAllCaptions: () => void;
  genBackgroundMusic: () => void;
  onReset: () => void;
};

export function TikTokAIPanel({
  tiktokAI, sceneCaptions, captionBusy, musicBusy, musicBlob, hasAudios,
  updateTikTokAI, updateTikTokCaption, updateTikTokMusic,
  genAllCaptions, genBackgroundMusic, onReset,
}: TikTokAIPanelProps) {
  const activeCount = [
    tiktokAI.visualEffect !== "none" ? 1 : 0,
    tiktokAI.captions.enabled ? 1 : 0,
    tiktokAI.voiceEffect !== "none" ? 1 : 0,
    tiktokAI.music.enabled ? 1 : 0,
    tiktokAI.transition !== "none" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
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
            {activeCount} ativo(s)
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
                disabled={captionBusy || !hasAudios}
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
          onClick={onReset}
          className="text-[10px] text-muted-foreground hover:text-foreground transition underline"
        >
          Resetar todas as configurações TikTok AI
        </button>
      </div>
    </div>
  );
}