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

export function SceneCard({
  scene,
  index,
  isKeyScene,
  busy,
  image,
  audio,
  video,
  onTitleChange,
  onNarrationChange,
  onImagePromptChange,
  onGenerateImage,
  onGenerateVariantImage,
  onGenerateAudio,
  onAnimate,
}: SceneCardProps) {
  const imgBusy = busy[`img${index}`];
  const audBusy = busy[`aud${index}`];
  const vidBusy = busy[`vid${index}`];

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3 animate-fade-in hover:border-primary/30 hover:bg-white/[0.07] transition"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          Cena {index + 1}
          {isKeyScene && (
            <span className="text-[10px] rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-accent">⭐ chave</span>
          )}
        </div>
        <input
          value={scene.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 bg-transparent border-b border-white/10 focus:border-primary/60 outline-none font-semibold text-sm py-1"
        />
      </div>
      <textarea
        value={scene.narration}
        onChange={(e) => onNarrationChange(e.target.value)}
        rows={4}
        className="w-full rounded-md bg-black/30 border border-white/10 focus:border-primary/60 outline-none p-2 text-sm leading-relaxed resize-y"
        placeholder="Narração da cena…"
      />
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Image prompt (editar)</summary>
        <textarea
          value={scene.imagePrompt}
          onChange={(e) => onImagePromptChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md bg-black/30 border border-white/10 focus:border-primary/60 outline-none p-2 text-xs resize-y"
        />
      </details>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={imgBusy}
              onClick={onGenerateImage}
              className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {imgBusy ? "Gerando imagem…" : image ? "Regenerar imagem" : "Gerar imagem"}
            </button>
            {image?.final && (
              <button
                disabled={imgBusy}
                onClick={onGenerateVariantImage}
                className="rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                ✨ Outra imagem
              </button>
            )}
          </div>
          {image && (
            <div className="space-y-2">
              <img
                src={image.url}
                className={`w-full rounded-md transition-[filter] ${image.final ? "" : "blur-lg"}`}
                alt=""
              />
              {image.final && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={image.url} download={`cena-${index + 1}.png`} className="text-xs underline">Baixar PNG</a>
                  {image.modelUsed && (
                    <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                      {image.modelUsed}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            disabled={audBusy}
            onClick={onGenerateAudio}
            className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {audBusy ? "Gerando áudio…" : audio ? "Regenerar áudio" : "Gerar narração"}
          </button>
          {audio && (
            <div className="space-y-1">
              <audio controls src={audio} className="w-full" />
              <a href={audio} download={`cena-${index + 1}.mp3`} className="text-xs underline">Baixar MP3</a>
            </div>
          )}
        </div>
      </div>
      {image?.final && (
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            disabled={vidBusy}
            onClick={onAnimate}
            className="rounded-md bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {vidBusy ? "🎬 Animando (Replicate, ~1-2 min)…" : video ? "🎬 Re-animar cena" : "🎬 Animar cena (dar vida)"}
          </button>
          {video && (
            <div className="space-y-1">
              <video controls src={video.url} className="w-full rounded-md" />
              <div className="flex items-center gap-2 flex-wrap">
                <a href={video.url} download={`cena-${index + 1}.mp4`} className="text-xs underline">Baixar MP4</a>
                {video.modelUsed && (
                  <span className="text-[10px] rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                    {video.modelUsed}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}