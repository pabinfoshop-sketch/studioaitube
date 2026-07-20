import { createFileRoute } from "@tanstack/react-router";

// Proxy legado: recebe o MP4 + metadata, sobe para um host temporário
// e dispara o webhook do Make com um JSON pequeno contendo a URL do vídeo.
// Motivo: webhooks free do Make têm limite ~5MB por payload — enviar o binário direto falha silenciosamente.

export const Route = createFileRoute("/api/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const webhook = String(form.get("webhook") ?? "");
          const title = String(form.get("title") ?? "Vídeo");
          const description = String(form.get("description") ?? "");
          const tags = String(form.get("tags") ?? "");
          const video = form.get("video");

          if (!webhook.startsWith("https://hook.")) {
            return Response.json({ error: "URL de webhook inválida" }, { status: 400 });
          }
          if (!(video instanceof File)) {
            return Response.json({ error: "Arquivo de vídeo ausente" }, { status: 400 });
          }

          // 1) Upload temporário para Litterbox (24h)
          const up = new FormData();
          up.append("reqtype", "fileupload");
          up.append("time", "24h");
          up.append("fileToUpload", video, "video-final.mp4");
          const upRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", { method: "POST", body: up });
          const videoUrl = (await upRes.text()).trim();
          if (!upRes.ok || !videoUrl.startsWith("http")) {
            return Response.json({ error: `Falha ao hospedar vídeo: ${videoUrl.slice(0, 200)}` }, { status: 502 });
          }

          // 2) Dispara o webhook com campos pequenos para o Make aprender videoUrl como texto
          const hookPayload = new FormData();
          hookPayload.append("title", title);
          hookPayload.append("description", description);
          hookPayload.append("tags", tags);
          hookPayload.append("videoUrl", videoUrl);
          const hookRes = await fetch(webhook, {
            method: "POST",
            body: hookPayload,
          });
          const hookText = await hookRes.text();
          if (!hookRes.ok) {
            return Response.json({ error: `Webhook Make respondeu ${hookRes.status}: ${hookText.slice(0, 200)}`, videoUrl }, { status: 502 });
          }

          return Response.json({ ok: true, videoUrl, makeResponse: hookText.slice(0, 200) });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
        }
      },
    },
  },
});
