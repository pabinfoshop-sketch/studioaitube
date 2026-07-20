import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
  prompt: z.string().default("cinematic subtle motion, camera drift, atmospheric"),
});

const GW = "https://connector-gateway.lovable.dev/replicate/v1";

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("imageDataUrl inválido (esperado data:*;base64,...)");
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

export const Route = createFileRoute("/api/animate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { imageDataUrl, prompt } = Input.parse(await request.json());
          const lovableKey = process.env.LOVABLE_API_KEY;
          const repKey = process.env.REPLICATE_API_KEY;
          if (!lovableKey || !repKey) {
            return new Response("Conector Replicate não configurado.", { status: 500 });
          }
          const auth = {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": repKey,
          } as Record<string, string>;

          // 1) upload da imagem
          const { bytes, mime } = dataUrlToBytes(imageDataUrl);
          const form = new FormData();
          form.append("content", new Blob([bytes as BlobPart], { type: mime }), "frame.png");
          const upRes = await fetch(`${GW}/files`, { method: "POST", headers: auth, body: form });
          if (!upRes.ok) {
            return new Response(`Falha upload Replicate: ${upRes.status} ${await upRes.text()}`, { status: 502 });
          }
          const upJson: any = await upRes.json();
          const imageUrl: string = upJson?.urls?.get;
          if (!imageUrl) return new Response("Upload Replicate sem URL.", { status: 502 });

          // 2) cria predição — wan-2.2-i2v-fast (rápido e barato)
          const model = "wan-video/wan-2.2-i2v-fast";
          const createRes = await fetch(`${GW}/models/${model}/predictions`, {
            method: "POST",
            headers: { ...auth, "Content-Type": "application/json" },
            body: JSON.stringify({ input: { image: imageUrl, prompt } }),
          });
          if (createRes.status === 402) {
            return new Response("Conta Replicate sem créditos. Ative billing em replicate.com/account/billing.", { status: 402 });
          }
          if (!createRes.ok) {
            return new Response(`Replicate ${createRes.status}: ${await createRes.text()}`, { status: 502 });
          }
          const pred: any = await createRes.json();
          const id = pred?.id;
          if (!id) return new Response("Sem id de predição.", { status: 502 });

          // 3) poll (até ~4 min)
          for (let i = 0; i < 80; i++) {
            await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
            const r = await fetch(`${GW}/predictions/${id}`, { headers: auth });
            const j: any = await r.json();
            const st = j?.status;
            if (st === "succeeded") {
              const out = Array.isArray(j.output) ? j.output[0] : j.output;
              if (!out) return new Response("Sem output de vídeo.", { status: 502 });
              return Response.json({ videoUrl: out, modelUsed: `replicate/${model}` });
            }
            if (st === "failed" || st === "canceled") {
              return new Response(`Predição ${st}: ${j?.error ?? "sem detalhe"}`, { status: 502 });
            }
          }
          return new Response("Timeout aguardando vídeo.", { status: 504 });
        } catch (e: any) {
          return new Response(`Erro: ${e?.message ?? String(e)}`, { status: 500 });
        }
      },
    },
  },
});
