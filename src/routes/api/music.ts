import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getLovableKey, getReplicateKey } from "@/lib/ai-env";

const Input = z.object({
  prompt: z.string().min(3),
  duration: z.number().min(5).max(30).default(15),
  mood: z.string().default("dark suspense horror"),
});

const REPLICATE_MODEL = "meta/musicgen-melody";
const REPLICATE_DIRECT = "https://api.replicate.com/v1";
const REPLICATE_GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";

function getReplicateRuntime() {
  const lovableKey = getLovableKey();
  const directKey = getReplicateKey();
  const connectorKey = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY || directKey?.value;
  if (lovableKey && connectorKey) {
    return {
      mode: "connector" as const,
      baseUrl: REPLICATE_GATEWAY,
      headers: { Authorization: `Bearer ${lovableKey.value}`, "X-Connection-Api-Key": connectorKey } as Record<string, string>,
    };
  }
  if (directKey) {
    return {
      mode: "direct" as const,
      baseUrl: REPLICATE_DIRECT,
      headers: { Authorization: `Bearer ${directKey.value}` } as Record<string, string>,
    };
  }
  return null;
}

export const Route = createFileRoute("/api/music")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt, duration, mood } = Input.parse(await request.json());
          const runtime = getReplicateRuntime();
          if (!runtime) {
            return new Response("Replicate não configurado. Configure REPLICATE_API_KEY.", { status: 500 });
          }

          const headers: Record<string, string> = {
            ...runtime.headers,
            "Content-Type": "application/json",
          };

          const fullPrompt = `${mood} background music, cinematic, atmospheric, ${prompt}, instrumental, no vocals, ambient, dark, ominous, suspenseful`;

          const createRes = await fetch(`${runtime.baseUrl}/models/${REPLICATE_MODEL}/predictions`, {
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
            const r = await fetch(`${runtime.baseUrl}/predictions/${id}`, { headers: runtime.headers });
            const j: any = await r.json();
            const st = j?.status;
            if (st === "succeeded") {
              const out = Array.isArray(j.output) ? j.output[0] : j.output;
              if (!out) return new Response("Sem output de áudio.", { status: 502 });
              return Response.json({ audioUrl: out, modelUsed: `replicate/${REPLICATE_MODEL}`, mode: runtime.mode });
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