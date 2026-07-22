import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getLovableKey, getReplicateKey } from "@/lib/ai-env";

const Input = z.object({
  audioUrl: z.string().min(10),
  language: z.string().default("pt"),
});

const REPLICATE_MODEL = "openai/whisper-large-v3-turbo";
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

export const Route = createFileRoute("/api/captions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { audioUrl, language } = Input.parse(await request.json());
          const runtime = getReplicateRuntime();
          if (!runtime) {
            return new Response("Replicate não configurado. Configure REPLICATE_API_KEY.", { status: 500 });
          }

          const headers: Record<string, string> = {
            ...runtime.headers,
            "Content-Type": "application/json",
          };

          // Create prediction with Whisper
          const createRes = await fetch(`${runtime.baseUrl}/models/${REPLICATE_MODEL}/predictions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              input: {
                audio: audioUrl,
                language,
                timestamp_granularities: ["word", "segment"],
                response_format: "verbose_json",
              },
            }),
          });

          if (createRes.status === 402) {
            return new Response("Conta Replicate sem créditos. Ative billing em replicate.com/account/billing.", { status: 402 });
          }
          if (!createRes.ok) {
            const body = await createRes.text();
            return new Response(`Replicate ${createRes.status}: ${body}`, { status: 502 });
          }

          const pred: any = await createRes.json();
          const id = pred?.id;
          if (!id) return new Response("Sem id de predição.", { status: 502 });

          // Poll (Whisper is fast, ~30s max)
          for (let i = 0; i < 40; i++) {
            await new Promise((r) => setTimeout(r, i < 5 ? 2000 : 3000));
            const r = await fetch(`${runtime.baseUrl}/predictions/${id}`, { headers: runtime.headers });
            const j: any = await r.json();
            const st = j?.status;
            if (st === "succeeded") {
              const output = j.output;
              // Parse verbose JSON output
              if (typeof output === "string") {
                try {
                  const parsed = JSON.parse(output);
                  return Response.json({ captions: parseWhisperOutput(parsed), modelUsed: `replicate/${REPLICATE_MODEL}`, mode: runtime.mode, raw: parsed });
                } catch {
                  // If output is plain text, create simple captions
                  return Response.json({
                    captions: [{ start: 0, end: 0, text: output }],
                    modelUsed: `replicate/${REPLICATE_MODEL}`,
                    mode: runtime.mode,
                  });
                }
              }
              if (typeof output === "object" && output !== null) {
                return Response.json({ captions: parseWhisperOutput(output), modelUsed: `replicate/${REPLICATE_MODEL}`, mode: runtime.mode, raw: output });
              }
              return new Response("Formato de output inesperado.", { status: 502 });
            }
            if (st === "failed" || st === "canceled") {
              return new Response(`Predição ${st}: ${j?.error ?? "sem detalhe"}`, { status: 502 });
            }
          }
          return new Response("Timeout aguardando transcrição.", { status: 504 });
        } catch (e: any) {
          return new Response(`Erro: ${e?.message ?? String(e)}`, { status: 500 });
        }
      },
    },
  },
});

type CaptionWord = { word: string; start: number; end: number };
type CaptionSegment = { start: number; end: number; text: string; words?: CaptionWord[] };

function parseWhisperOutput(output: any): CaptionSegment[] {
  // Whisper verbose_json returns { text, segments: [...], language }
  const segments: CaptionSegment[] = [];
  if (output.segments && Array.isArray(output.segments)) {
    for (const seg of output.segments) {
      segments.push({
        start: seg.start ?? 0,
        end: seg.end ?? 0,
        text: (seg.text ?? "").trim(),
        words: seg.words,
      });
    }
  } else if (output.text) {
    segments.push({ start: 0, end: 0, text: output.text });
  }
  return segments;
}