import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Input = z.object({
  topic: z.string().min(3),
  sceneCount: z.number().int().min(3).max(20).default(8),
  language: z.string().default("pt-BR"),
});

const SceneSchema = z.object({
  title: z.string().default("Cena"),
  narration: z.string().default(""),
  imagePrompt: z.string().default(""),
});

const ScriptSchema = z.object({
  title: z.string().default("Mistério revelado"),
  hook: z.string().default("Um mistério sombrio começa a aparecer."),
  scenes: z.array(SceneSchema).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnailPrompt: z.string().optional(),
  thumbnailText: z.string().optional(),
  notice: z.string().optional(),
});

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Modelo não retornou JSON válido.");
    return JSON.parse(match[0]);
  }
}

function normalizeScript(raw: unknown, topic: string, sceneCount: number) {
  const parsed = ScriptSchema.parse(raw);
  const scenes = [...parsed.scenes].slice(0, sceneCount).map((scene, i) => {
    const n = i + 1;
    return {
      title: scene.title?.trim() || `Parte ${n}`,
      narration:
        scene.narration?.trim() ||
        `A história de ${topic} ganha uma nova camada quando detalhes esquecidos começam a aparecer. Na parte ${n}, o clima fica mais denso e uma pista muda tudo.`,
      imagePrompt:
        scene.imagePrompt?.trim() ||
        `dark cinematic documentary frame about ${topic}, mysterious atmosphere, scene ${n}, 16:9, no text`,
    };
  });
  while (scenes.length < sceneCount) {
    const n = scenes.length + 1;
    scenes.push({
      title: `Revelação ${n}`,
      narration: `A história de ${topic} ganha uma nova camada quando detalhes esquecidos começam a aparecer.`,
      imagePrompt: `dark cinematic scene about ${topic}, mysterious atmosphere, 16:9, no text`,
    });
  }
  const title = parsed.title || `${topic}: o mistério`;
  const tags = (parsed.tags && parsed.tags.length ? parsed.tags : [
    topic, "mistério", "terror", "true crime", "sobrenatural", "história real",
    "dark", "creepypasta", "curiosidades", "documentário", "canal dark",
  ]).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 20);
  return {
    title,
    hook: parsed.hook || `Existe uma versão oficial sobre ${topic}, mas os detalhes contam outra história.`,
    scenes,
    seoTitle: parsed.seoTitle?.trim() || `${title} 😱 (História Real)`,
    seoDescription: parsed.seoDescription?.trim() ||
      `${parsed.hook || title}\n\n▶ Inscreva-se para mais histórias sombrias todos os dias.\n\n#mistério #terror #truecrime #darkcesar`,
    tags,
    thumbnailPrompt: parsed.thumbnailPrompt?.trim() ||
      `ultra dramatic dark cinematic thumbnail about ${topic}, moody lighting, high contrast, shocking face expression, deep shadows, 16:9, no text, no watermark, YouTube thumbnail style`,
    thumbnailText: (parsed.thumbnailText?.trim() || title).slice(0, 40).toUpperCase(),
    notice: parsed.notice,
  };
}

function buildOfflineDraft(topic: string, sceneCount: number, notice?: string) {
  return normalizeScript(
    {
      title: `${topic}: o caso que ainda assombra`,
      hook: `Algumas histórias parecem lendas até que os detalhes se encaixam. E no caso de ${topic}, cada resposta abre uma pergunta ainda mais perturbadora.`,
      notice,
      scenes: Array.from({ length: sceneCount }, (_, i) => ({
        title: `Parte ${i + 1}`,
        narration: `Tudo começa com ${topic}. Na cena ${i + 1}, um detalhe muda a forma como o caso é visto.`,
        imagePrompt: `cinematic dark documentary frame about ${topic}, eerie atmosphere, 16:9, no text`,
      })),
    },
    topic,
    sceneCount,
  );
}

const CHAT_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
];

export const Route = createFileRoute("/api/script")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = Input.parse(await request.json());
          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return Response.json(buildOfflineDraft(input.topic, input.sceneCount, "LOVABLE_API_KEY ausente."));
          }

          const prompt = `Você é roteirista e especialista em SEO de canais dark do YouTube (mistério, terror, sobrenatural, true crime).
Crie um roteiro em ${input.language} sobre: "${input.topic}".
Divida em exatamente ${input.sceneCount} cenas. Cada narração tem 3 a 5 frases densas, atmosfera sombria, ritmo cinematográfico e ganchos.
Para cada cena escreva também um imagePrompt em INGLÊS descrevendo uma imagem cinematográfica dark, atmosférica, 16:9, sem texto na imagem.

Também gere metadados otimizados para RANKEAR no YouTube:
- seoTitle: máx 70 caracteres, com curiosity gap + emoji + palavra-chave forte (ex: "O CASO X que 99% dos Brasileiros NUNCA Viram 😱")
- seoDescription: 3 parágrafos — 1º com hook + palavra-chave (aparece na busca); 2º expandindo o mistério; 3º com CTA "Inscreva-se" + 5 hashtags relevantes
- tags: array de 15-20 tags misturando palavra-chave principal, long-tail em português e termos do nicho
- thumbnailPrompt em INGLÊS: cena impactante, expressão facial marcante, cores contrastantes, sem texto, YouTube thumbnail style
- thumbnailText: 3-6 palavras EM CAIXA ALTA para sobrepor na thumb (ex: "NINGUÉM SOBREVIVEU")

Responda APENAS com JSON válido, sem markdown, no formato:
{"title":"","hook":"","seoTitle":"","seoDescription":"","tags":[],"thumbnailPrompt":"","thumbnailText":"","scenes":[{"title":"","narration":"","imagePrompt":""}]}`;

          const failures: string[] = [];
          const openRouterKey = process.env.OPENROUTER_API_KEY;

          const providers: Array<{ name: string; url: string; headers: Record<string, string>; models: string[] }> = [];
          if (openRouterKey) {
            providers.push({
              name: "openrouter",
              url: "https://openrouter.ai/api/v1/chat/completions",
              headers: {
                Authorization: `Bearer ${openRouterKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://darkcesar.lovable.app",
                "X-Title": "AIDarkCesar",
              },
              models: [
                // free first
                "deepseek/deepseek-chat-v3.1:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "google/gemini-2.0-flash-exp:free",
                // paid cheapest first
                "deepseek/deepseek-chat-v3.1",
                "google/gemini-2.5-flash-lite",
                "openai/gpt-4o-mini",
                "google/gemini-2.5-flash",
              ],
            });
          }
          providers.push({
            name: "lovable",
            url: "https://ai.gateway.lovable.dev/v1/chat/completions",
            headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "direct-fetch", "Content-Type": "application/json" },
            models: CHAT_MODELS,
          });

          for (const p of providers) {
            for (const model of p.models) {
              try {
                const upstream = await fetch(p.url, {
                  method: "POST",
                  headers: p.headers,
                  body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                  }),
                });
                if (!upstream.ok) {
                  const body = await upstream.text();
                  failures.push(`${p.name}/${model}: ${upstream.status} ${body.slice(0, 160)}`);
                  continue;
                }
                const json = await upstream.json();
                const text = json?.choices?.[0]?.message?.content ?? "";
                const result = normalizeScript(extractJson(text), input.topic, input.sceneCount);
                return Response.json({ ...result, modelUsed: `${p.name}/${model}` });
              } catch (e) {
                failures.push(`${p.name}/${model}: ${(e as Error).message}`);
              }
            }
          }

          console.error("[api/script] all providers failed", failures);
          return Response.json(
            buildOfflineDraft(
              input.topic,
              input.sceneCount,
              `Gateway falhou. Tentativas: ${failures.join(" || ")}. Rascunho local gerado.`,
            ),
          );
        } catch (error) {
          console.error("[api/script]", error);
          return Response.json(buildOfflineDraft("tema dark", 8, "Erro inesperado; rascunho base gerado."));
        }
      },
    },
  },
});
