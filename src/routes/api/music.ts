import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getReplicateKey } from "@/lib/ai-env";

const Input = z.object({
  prompt: z.string().min(3),
  duration: z.number().min(5).max(30).default(15),
  mood: z.string().default("dark suspense horror"),
});

const REPLICATE_MODEL = "meta/musicgen-melody";
const REPLICATE_DIRECT = "https://api.replicate.com/v1";

export const Route = createFileRoute("/api/music")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt, duration, mood } = Input.parse(await request.json());
          const rpKey = getReplicateKey();
          if (!rpKey) {
            return new Response("Replicate não configurado. Configure REPLICATE_API_KEY.", { status: 500 });
          }

          const headers: Record<string, string> = {
            Authorization: `Bearer ${rpKey.value}`,
            "Content-Type": "application/json",
          };

          const fullPrompt = `${mood} background music, cinematic, atmospheric, ${prompt}, instrumental, no vocals, ambient, dark, ominous, suspenseful`;

          const createRes = await fetch(`${REPLICATE_DIRECT}/models/${REPLICATE_MODEL}/predictions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              input: {
                prompt: fullPrompt,
                duration: Math.min(duration, 30),
                model_version: "melody",
                output_format: "mp3",
                normalize: true,
              },
            }),
          });

          if (createRes.status === 402) {
            return new Response("Conta Replicate sem créditos.", { status: 402 });
          }
          if (!createRes.ok) {
            const body = await createRes.text();
            return new Response(`Replicate ${createRes.status}: ${body}`, { status: 502 });
          }

          const pred: any = await createRes.json();
          const id = pred?.id;
          if (!id) return new Response("Sem id de predição.", { status: 502 });

          // Poll (musicgen takes ~1-3 min)
          for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, i < 5 ? 3000 : 5000));
            const r = await fetch(`${REPLICATE_DIRECT}/predictions/${id}`, { headers: { Authorization: `Bearer ${rpKey.value}` } });
            const j: any = await r.json();
            const st = j?.status;
            if (st === "succeeded") {
              const out = Array.isArray(j.output) ? j.output[0] : j.output;
              if (!out) return new Response("Sem output de áudio.", { status: 502 });
              return Response.json({ audioUrl: out, modelUsed: `replicate/${REPLICATE_MODEL}` });
            }
            if (st === "failed" || st === "canceled") {
              return new Response(`Predição ${st}: ${j?.error ?? "sem detalhe"}`, { status: 502 });
            }
          }
          return new Response("Timeout aguardando música.", { status: 504 });
        } catch (e: any) {
          return new Response(`Erro: ${e?.message ?? String(e)}`, { status: 500 });
        }
      },
    },
  },
});