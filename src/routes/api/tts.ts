import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TtsInput = z.object({
  text: z.string().trim().min(1, "Texto da narração vazio."),
  voice: z.string().optional(),
});

// Map generic voice names to ElevenLabs voice IDs
const VOICE_MAP: Record<string, string> = {
  onyx: "JBFqnCBsd6RMkjVDRZzb", // George
  alloy: "EXAVITQu4vr4xnSDxMaL", // Sarah
  echo: "TX3LPaxmHKxFdv7VOQHJ", // Liam
  fable: "XrExE9yKIg1WjnnlVkGX", // Matilda
  nova: "cgSgspJ2msm6clMCkdW9", // Jessica
  shimmer: "Xb7hH8MSUJpSbSDYk0k2", // Alice
};

function resolveVoiceId(voice?: string): string {
  if (!voice) return VOICE_MAP.onyx;
  if (VOICE_MAP[voice]) return VOICE_MAP[voice];
  // assume already an ElevenLabs voice ID
  return voice;
}

function splitForGoogleTts(text: string, max = 190): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return [clean];
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
  const out: string[] = [];
  let cur = "";
  const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = ""; };
  for (const s of sentences) {
    if (s.length > max) {
      flush();
      const words = s.split(" ");
      for (const w of words) {
        if ((cur + " " + w).trim().length > max) flush();
        cur = (cur ? cur + " " : "") + w;
      }
      continue;
    }
    if ((cur + s).length > max) flush();
    cur += s;
  }
  flush();
  return out;
}


export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = TtsInput.safeParse(await request.json());
        if (!parsed.success) {
          return new Response("Texto da narração vazio. Gere o roteiro novamente ou edite a cena.", { status: 400 });
        }
        const { text, voice } = parsed.data;
        const elevenKey = process.env.ELEVENLABS_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const voiceId = resolveVoiceId(voice);
        const errors: string[] = [];

        // 1) ElevenLabs (se tiver key e quota)
        if (elevenKey) {
          try {
            const upstream = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
              {
                method: "POST",
                headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
                body: JSON.stringify({
                  text,
                  model_id: "eleven_multilingual_v2",
                  voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
                }),
              }
            );
            if (upstream.ok) {
              const buf = await upstream.arrayBuffer();
              return new Response(buf, {
                headers: { "Content-Type": "audio/mpeg", "X-TTS-Provider": "elevenlabs" },
              });
            }
            const body = await upstream.text();
            errors.push(`elevenlabs ${upstream.status}: ${body.slice(0, 200)}`);
          } catch (e: any) {
            errors.push(`elevenlabs: ${e?.message ?? String(e)}`);
          }
        }

        // 2) Fallback: Lovable AI Gateway (OpenAI TTS) — usa créditos da Lovable
        if (lovableKey) {
          const openaiVoice = voice && ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(voice)
            ? voice
            : "onyx";
          try {
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
              method: "POST",
              headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "openai/gpt-4o-mini-tts",
                input: text,
                voice: openaiVoice,
                response_format: "mp3",
              }),
            });
            if (upstream.ok) {
              const buf = await upstream.arrayBuffer();
              return new Response(buf, {
                headers: { "Content-Type": "audio/mpeg", "X-TTS-Provider": "lovable-openai" },
              });
            }
            const body = await upstream.text();
            errors.push(`lovable ${upstream.status}: ${body.slice(0, 200)}`);
          } catch (e: any) {
            errors.push(`lovable: ${e?.message ?? String(e)}`);
          }
        }

        // 3) Fallback grátis: Google Translate TTS (sem chave, ~200 chars por request)
        try {
          const chunks = splitForGoogleTts(text, 190);
          const parts: ArrayBuffer[] = [];
          for (const chunk of chunks) {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encodeURIComponent(chunk)}`;
            const r = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0",
                Referer: "https://translate.google.com/",
              },
            });
            if (!r.ok) throw new Error(`google-tts ${r.status}`);
            parts.push(await r.arrayBuffer());
          }
          const total = parts.reduce((n, p) => n + p.byteLength, 0);
          const merged = new Uint8Array(total);
          let off = 0;
          for (const p of parts) {
            merged.set(new Uint8Array(p), off);
            off += p.byteLength;
          }
          return new Response(merged, {
            headers: { "Content-Type": "audio/mpeg", "X-TTS-Provider": "google-free" },
          });
        } catch (e: any) {
          errors.push(`google-free: ${e?.message ?? String(e)}`);
        }

        return new Response(
          `Falha ao gerar áudio. ${errors.join(" | ") || "Nenhum provedor TTS configurado."}`,
          { status: 502 },
        );
      },
    },
  },
});
