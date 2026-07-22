import { useState } from "react";
import { toast } from "sonner";
import type { Script } from "@/hooks/useStudio";

const LS_MAKE_WEBHOOK = "aidc.makeWebhook";

type VideoResultProps = {
  videoUrl: string;
  script: Script;
  thumbnail?: string | null;
};

function PublishToMake({ videoUrl, script, thumbnail }: { videoUrl: string; script: Script; thumbnail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [webhook, setWebhook] = useState(() => (typeof window !== "undefined" ? localStorage.getItem(LS_MAKE_WEBHOOK) ?? "" : ""));
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const defaultWhen = (() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  const [when, setWhen] = useState(defaultWhen);

  async function uploadToLitterbox(blob: Blob, filename: string) {
    const up = new FormData();
    up.append("reqtype", "fileupload");
    up.append("time", "24h");
    up.append("fileToUpload", blob, filename);
    const r = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: up });
    const url = (await r.text()).trim();
    if (!r.ok || !url.startsWith("http")) throw new Error(`Falha ao hospedar ${filename}: ${url.slice(0, 200)}`);
    return url;
  }

  async function publish() {
    if (!webhook.startsWith("https://hook.")) {
      toast.error("Cole a URL do webhook do Make (começa com https://hook.…)");
      return;
    }
    let publishAtISO = "";
    let privacy: "public" | "private" = "public";
    if (scheduleMode === "later") {
      const dt = new Date(when);
      if (isNaN(dt.getTime()) || dt.getTime() < Date.now() + 10 * 60 * 1000) {
        toast.error("Escolha uma data/hora pelo menos 10 minutos no futuro.");
        return;
      }
      publishAtISO = dt.toISOString();
      privacy = "private";
    }

    try {
      setSending(true);
      setStatus("Preparando vídeo…");
      localStorage.setItem(LS_MAKE_WEBHOOK, webhook);

      toast.info("Hospedando vídeo…");
      const videoBlob = await (await fetch(videoUrl)).blob();
      setStatus("Subindo MP4…");
      const hostedVideoUrl = await uploadToLitterbox(videoBlob, "video-final.mp4");

      let hostedThumbUrl = "";
      if (thumbnail) {
        setStatus("Subindo thumbnail…");
        const thumbBlob = await (await fetch(thumbnail)).blob();
        hostedThumbUrl = await uploadToLitterbox(thumbBlob, "thumbnail.jpg");
      }

      toast.info("Enviando ao Make…");
      setStatus("Enviando campos ao Make…");
      const makePayload = new FormData();
      makePayload.append("title", (script.seoTitle || script.title).slice(0, 100));
      makePayload.append("description",
        (script.seoDescription || `${script.hook}\n\n${script.scenes.map((s) => s.narration).join("\n\n")}`).slice(0, 4900)
      );
      makePayload.append("tags", (script.tags?.length ? script.tags : ["darkcesar", "mistério", "terror"]).join(","));
      makePayload.append("videoUrl", hostedVideoUrl);
      makePayload.append("thumbnailUrl", hostedThumbUrl);
      makePayload.append("privacyStatus", privacy);
      makePayload.append("publishAt", publishAtISO);
      await fetch(webhook, { method: "POST", mode: "no-cors", body: makePayload });
      toast.success(
        scheduleMode === "later"
          ? `Agendado para ${new Date(when).toLocaleString("pt-BR")}`
          : "Enviado para publicação imediata!"
      );
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar ao Make", { duration: 9000 });
    } finally {
      setSending(false);
      setStatus("");
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-block rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-medium">
        📤 Publicar no YouTube (Make)
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-white/10 bg-white/5 p-3 space-y-3">
      <label className="text-xs text-muted-foreground">URL do webhook do Make.com</label>
      <input
        type="url"
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://hook.eu2.make.com/abc123..."
        className="w-full rounded-md bg-background border border-white/10 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScheduleMode("now")}
          className={`rounded-full px-3 py-1 text-xs border transition ${scheduleMode === "now" ? "bg-primary/30 border-primary/60 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
        >
          🚀 Publicar agora
        </button>
        <button
          type="button"
          onClick={() => setScheduleMode("later")}
          className={`rounded-full px-3 py-1 text-xs border transition ${scheduleMode === "later" ? "bg-accent/30 border-accent/60 text-accent" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
        >
          ⏰ Agendar
        </button>
      </div>

      {scheduleMode === "later" && (
        <div className="space-y-1 animate-fade-in">
          <label className="text-xs text-muted-foreground">Data e hora (fuso local)</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            min={defaultWhen}
            className="w-full rounded-md bg-background border border-white/10 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={publish} disabled={sending} className="rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium disabled:opacity-50">
          {sending ? "Enviando…" : scheduleMode === "later" ? "Agendar no YouTube" : "Publicar agora"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md border border-white/20 px-4 py-2 text-sm">Cancelar</button>
      </div>
      {status && <p className="text-[11px] text-primary">{status}</p>}
      <div className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
        <p>
          O Make recebe campos extras: <code>privacyStatus</code> (<i>public</i> ou <i>private</i>) e <code>publishAt</code> (ISO 8601, vazio = agora).
        </p>
        <p>
          <b>Para agendamento funcionar</b>, no módulo <b>YouTube → Upload a Video</b> mapeie:
          <br />• <b>Privacy Status</b> = <code>{`{{1.privacyStatus}}`}</code>
          <br />• <b>Publish At</b> = <code>{`{{1.publishAt}}`}</code> (deixe vazio se for "agora")
        </p>
      </div>
    </div>
  );
}

export function VideoResult({ videoUrl, script, thumbnail }: VideoResultProps) {
  return (
    <div className="mt-4 space-y-2">
      <video controls src={videoUrl} className="w-full rounded-md" />
      <div className="flex flex-wrap gap-2">
        <a href={videoUrl} download="video-final.webm" className="inline-block rounded-md btn-blue-gradient px-4 py-2 text-sm font-medium">
          ⬇ Baixar vídeo final
        </a>
        <PublishToMake videoUrl={videoUrl} script={script} thumbnail={thumbnail} />
      </div>
    </div>
  );
}