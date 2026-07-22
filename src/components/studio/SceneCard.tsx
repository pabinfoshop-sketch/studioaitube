import { useState } from "react";
import {
  ImageIcon, Mic, Film, Loader2, Check,
  ChevronDown, ChevronUp, Sparkles, Download,
} from "lucide-react";

export type Scene = { title: string; narration: string; imagePrompt: string };

export type SceneCardProps = {
  scene: Scene;
  index: number;
  isKeyScene: boolean;
  busy: Record<string, boolean>;
  image?: { url: string; final: boolean; modelUsed?: string };
  audio?: string;
  video?: { url: string; modelUsed?: string };
  onTitleChange: (value: string) => void;
  onNarrationChange: (value: string) => void;
  onImagePromptChange: (value: string) => void;
  onGenerateImage: () => void;
  onGenerateVariantImage: () => void;
  onGenerateAudio: () => void;
  onAnimate: () => void;
};

function StatusBadge({ ready, loading, label }: { ready: boolean; loading: boolean; label: string }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-primary/15 border border-primary/30 text-primary px-2 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin" /> {label}
      </span>
    );
  }
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-green-500/15 border border-green-500/30 text-green-400 px-2 py-0.5">
        <Check className="w-3 h-3" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-white/5 border border-white/10 text-muted-foreground/60 px-2 py-0.5">
      {label}
    </span>
  );
}

export function SceneCard({
  scene, index, isKeyScene, busy, image, audio, video,
  onTitleChange, onNarrationChange, onImagePromptChange,
  onGenerateImage, onGenerateVariantImage, onGenerateAudio, onAnimate,
}: SceneCardProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const imgBusy = busy[`img${index}`];
  const audBusy = busy[`aud${index}`];
  const vidBusy = busy[`vid${index}`];

  const hasImage = !!image?.final;
  const hasAudio = !!audio;
  const hasVideo = !!video;
  const allReady = hasImage && hasAudio;

  return (
    <div
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden animate-fade-in transition-all duration-300 hover:border-white/15 hover:bg-white/[0.05]"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      {/* Top bar: scene number + status badges */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-xs font-bold text-muted-foreground shrink-0">
            {index + 1}
          </span>
          {isKeyScene && (
            <span className="text-[10px] rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-amber-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> chave
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <StatusBadge ready={hasImage} loading={imgBusy} label="Imagem" />
          <StatusBadge ready={hasAudio} loading={audBusy} label="Áudio" />
          {hasImage && (
            <StatusBadge ready={hasVideo} loading={vidBusy} label="Vídeo" />
          )}
        </div>
      </div>

      {/* Editable title */}
      <div className="px-5 pb-2">
        <input
          value={scene.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full bg-transparent text-base font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40 py-1"
          placeholder="Título da cena…"
        />
      </div>

      {/* Narration */}
      <div className="px-5 pb-3">
        <textarea
          value={scene.narration}
          onChange={(e) => onNarrationChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-black/20 border border-white/[0.06] focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none p-3 text-sm leading-relaxed resize-y transition placeholder:text-muted-foreground/40"
          placeholder="Narração da cena…"
        />
      </div>

      {/* Image prompt (collapsible) */}
      <div className="px-5 pb-3">
        <button
          type="button"
          onClick={() => setPromptOpen(!promptOpen)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
        >
          {promptOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Prompt de imagem
        </button>
        {promptOpen && (
          <textarea
            value={scene.imagePrompt}
            onChange={(e) => onImagePromptChange(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl bg-black/20 border border-white/[0.06] focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none p-3 text-xs leading-relaxed resize-y transition placeholder:text-muted-foreground/40"
          />
        )}
      </div>

      {/* Asset generation buttons + previews */}
      <div className="px-5 pb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Image column */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                disabled={imgBusy}
                onClick={onGenerateImage}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.06] hover:border-white/[0.12] px-3 py-2 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {imgBusy ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando…</>
                ) : hasImage ? (
                  <><ImageIcon className="w-3.5 h-3.5" /> Regenerar</>
                ) : (
                  <><ImageIcon className="w-3.5 h-3.5" /> Gerar imagem</>
                )}
              </button>
              {hasImage && (
                <button
                  disabled={imgBusy}
                  onClick={onGenerateVariantImage}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary px-2.5 py-2 text-[11px] font-medium transition disabled:opacity-40"
                >
                  <Sparkles className="w-3 h-3" /> Variante
                </button>
              )}
            </div>
            {image && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-white/[0.06]">
                  <img
                    src={image.url}
                    className={`w-full aspect-video object-cover transition-[filter] duration-500 ${image.final ? "" : "blur-xl"}`}
                    alt=""
                  />
                  {!image.final && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                {image.final && (
                  <div className="flex items-center gap-2">
                    <a
                      href={image.url}
                      download={`cena-${index + 1}.png`}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                    >
                      <Download className="w-3 h-3" /> PNG
                    </a>
                    {image.modelUsed && (
                      <span className="text-[10px] rounded-full bg-white/5 border border-white/[0.08] px-2 py-0.5 text-muted-foreground">
                        {image.modelUsed}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audio column */}
          <div className="space-y-2.5">
            <button
              disabled={audBusy}
              onClick={onGenerateAudio}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.06] hover:border-white/[0.12] px-3 py-2 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {audBusy ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando…</>
              ) : hasAudio ? (
                <><Mic className="w-3.5 h-3.5" /> Regenerar</>
              ) : (
                <><Mic className="w-3.5 h-3.5" /> Gerar narração</>
              )}
            </button>
            {audio && (
              <div className="space-y-2">
                <div className="rounded-xl bg-black/20 border border-white/[0.06] p-2">
                  <audio controls src={audio} className="w-full h-9" />
                </div>
                <a
                  href={audio}
                  download={`cena-${index + 1}.mp3`}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                >
                  <Download className="w-3 h-3" /> MP3
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Animate button (only when image is ready) */}
        {hasImage && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <button
              disabled={vidBusy}
              onClick={onAnimate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent px-3 py-2 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {vidBusy ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Animando (~1-2 min)…</>
              ) : hasVideo ? (
                <><Film className="w-3.5 h-3.5" /> Re-animar cena</>
              ) : (
                <><Film className="w-3.5 h-3.5" /> Animar cena</>
              )}
            </button>
            {video && (
              <div className="mt-2.5 space-y-2">
                <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <video controls src={video.url} className="w-full aspect-video" />
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={video.url}
                    download={`cena-${index + 1}.mp4`}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
                  >
                    <Download className="w-3 h-3" /> MP4
                  </a>
                  {video.modelUsed && (
                    <span className="text-[10px] rounded-full bg-white/5 border border-white/[0.08] px-2 py-0.5 text-muted-foreground">
                      {video.modelUsed}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completion indicator */}
      {allReady && !hasVideo && (
        <div className="px-5 py-2 bg-green-500/5 border-t border-green-500/10">
          <div className="flex items-center gap-1.5 text-[10px] text-green-400/80">
            <Check className="w-3 h-3" />
            Pronta para montagem
          </div>
        </div>
      )}
    </div>
  );
}