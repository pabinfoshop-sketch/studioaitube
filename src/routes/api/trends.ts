import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Input = z.object({
  channelUrl: z.string().url().optional(),
  niche: z.string().optional(),
  mode: z.enum(["random", "channel", "category"]).default("random"),
  category: z.string().optional(),
  count: z.number().int().min(3).max(20).default(10),
  exclude: z.array(z.string()).default([]),
});

type Topic = { emoji: string; title: string; tag: string; reason?: string };

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!m) throw new Error("no json");
    return JSON.parse(m[0]);
  }
}

async function fetchChannelContext(url: string): Promise<{ name?: string; recentTitles: string[]; subscribers?: number } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        "Cookie": "CONSENT=YES+1; SOCS=CAI",
      },
    }).finally(() => clearTimeout(timer));
    if (!r.ok) return null;

    const html = await r.text();
    const nameMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const titles = new Set<string>();
    const titleRegex = /"title":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]{5,120})"/g;
    let m: RegExpExecArray | null;
    while ((m = titleRegex.exec(html)) && titles.size < 25) {
      titles.add(m[1].replace(/\\u0026/g, "&").trim());
    }
    // subscribers: "1,23 mi de inscritos" | "540 mil inscritos" | "1.2M subscribers"
    let subscribers: number | undefined;
    const subMatch = html.match(/"subscriberCountText":\{[^}]*"(?:simpleText|content)":"([^"]+)"/)
      ?? html.match(/([\d.,]+)\s*(mi|mil|M|K)?\s*(?:de\s*)?(?:inscritos|subscribers)/i);
    if (subMatch) {
      const raw = subMatch[1].replace(",", ".");
      const num = parseFloat(raw);
      const unit = (subMatch[2] ?? subMatch[0]).toLowerCase();
      if (!isNaN(num)) {
        if (/mi|m(?!il)/.test(unit)) subscribers = Math.round(num * 1_000_000);
        else if (/mil|k/.test(unit)) subscribers = Math.round(num * 1_000);
        else subscribers = Math.round(num);
      }
    }
    return { name: nameMatch?.[1], recentTitles: [...titles], subscribers };
  } catch {
    return null;
  }
}

function suggestGoal(subs?: number): { goal: number; reason: string } {
  if (!subs) return { goal: 1, reason: "Canal novo/desconhecido — foque em consistência: 1 vídeo/dia." };
  if (subs < 1_000) return { goal: 1, reason: `${subs.toLocaleString("pt-BR")} inscritos — priorize consistência: 1/dia.` };
  if (subs < 50_000) return { goal: 2, reason: `${subs.toLocaleString("pt-BR")} inscritos — em crescimento: 2/dia (1 short + 1 longo).` };
  if (subs < 500_000) return { goal: 3, reason: `${subs.toLocaleString("pt-BR")} inscritos — canal forte: 3/dia (2 shorts + 1 longo).` };
  return { goal: 4, reason: `${subs.toLocaleString("pt-BR")} inscritos — canal grande: 4/dia mantém algoritmo aquecido.` };
}


const FALLBACK: Topic[] = [
  { emoji: "👻", title: "Hotéis abandonados com passado sombrio", tag: "Mistério" },
  { emoji: "🔪", title: "Crimes reais nunca resolvidos", tag: "True Crime" },
  { emoji: "🌑", title: "Rituais proibidos da Idade Média", tag: "Oculto" },
  { emoji: "🕯️", title: "Cidades brasileiras assombradas", tag: "Sobrenatural" },
  { emoji: "👁️", title: "Sociedades secretas mundiais", tag: "Conspiração" },
];

export const Route = createFileRoute("/api/trends")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = Input.parse(await request.json());
          const wantChannel = input.mode === "channel" && !!input.channelUrl;
          const ctx = wantChannel ? await fetchChannelContext(input.channelUrl!) : null;

          const modeBlock =
            input.mode === "category" && input.category
              ? `Gere temas EXCLUSIVAMENTE da categoria: **${input.category}**. Todos os itens devem ter tag="${input.category}".`
              : wantChannel && ctx?.recentTitles?.length
                ? `O canal chama "${ctx.name ?? "sem nome"}" e publica temas como:\n- ${ctx.recentTitles.slice(0, 15).join("\n- ")}\n\nSugira temas ALINHADOS a esse nicho, mesma pegada visual/tom, com ângulos novos e virais.`
                : input.niche
                  ? `Nicho do canal: ${input.niche}. Varie categorias mas mantenha coerência.`
                  : `Modo ALEATÓRIO: misture categorias (Mistério, True Crime, Oculto, Sobrenatural, Conspiração, Terror, Lenda) — surpreenda com temas em alta AGORA.`;

          const excludeBlock = input.exclude.length
            ? `NÃO repita nem sugira variações destes temas já usados:\n- ${input.exclude.slice(0, 30).join("\n- ")}`
            : "";

          const brandBlock = wantChannel && ctx?.recentTitles?.length
            ? `\n\nTambém retorne um objeto "brand" com a IDENTIDADE VISUAL do canal inferida dos títulos:
- primaryColor: hex vibrante para texto de thumbnail (ex "#FFEA00" amarelo dark, "#FF2D2D" vermelho sangue, "#00E5FF" ciano conspiração)
- strokeColor: hex para contorno (geralmente "#000000")
- moodKeywords: 3-5 palavras EN descrevendo estética visual (ex "gritty, high contrast, blood red, cinematic, moody")
- fontStyle: "impact" | "serif" | "condensed"` : "";

          const prompt = `Você é estrategista de conteúdo para canais dark do YouTube brasileiros.
${modeBlock}
${excludeBlock}

Gere ${input.count} ideias de vídeos com ALTO potencial viral AGORA (curiosidade forte, hook imediato).
Cada ideia DEVE incluir OBRIGATORIAMENTE todos os campos abaixo (nunca omita "reason"):
- emoji (1 char)
- title (curto, chamativo, PT-BR, sem clickbait óbvio)
- tag (categoria: Mistério | True Crime | Oculto | Sobrenatural | Conspiração | Terror | Lenda)
- reason (1 frase curta em PT-BR explicando por que esse tema viraliza AGORA — SEMPRE preencher)${brandBlock}

Responda APENAS com JSON válido no formato: {"topics":[{"emoji":"","title":"","tag":"","reason":""}]${wantChannel ? ',"brand":{"primaryColor":"","strokeColor":"","moodKeywords":"","fontStyle":""}' : ""}}`;

          const openRouterKey = process.env.OPENROUTER_API_KEY;
          const lovableKey = process.env.LOVABLE_API_KEY;
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
                "deepseek/deepseek-chat-v3.1:free",
                "google/gemini-2.0-flash-exp:free",
                "deepseek/deepseek-chat-v3.1",
                "google/gemini-2.5-flash-lite",
              ],
            });
          }
          if (lovableKey) {
            providers.push({
              name: "lovable",
              url: "https://ai.gateway.lovable.dev/v1/chat/completions",
              headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "direct-fetch", "Content-Type": "application/json" },
              models: ["google/gemini-3-flash-preview", "google/gemini-2.5-flash"],
            });
          }

          const failures: string[] = [];
          for (const p of providers) {
            for (const model of p.models) {
              try {
                const r = await fetch(p.url, {
                  method: "POST",
                  headers: p.headers,
                  body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                  }),
                });
                if (!r.ok) { failures.push(`${p.name}/${model}: ${r.status}`); continue; }
                const j = await r.json();
                const text = j?.choices?.[0]?.message?.content ?? "";
                const parsed = extractJson(text);
                const topics: Topic[] = (parsed.topics ?? parsed).slice(0, input.count).map((t: any) => ({
                  emoji: String(t.emoji ?? "🌑").slice(0, 4),
                  title: String(t.title ?? "").trim() || "Tema sem título",
                  tag: String(t.tag ?? "Mistério").trim(),
                  reason: t.reason ? String(t.reason).trim() : undefined,
                }));
                const sg = suggestGoal(ctx?.subscribers);
                const brand = parsed.brand && typeof parsed.brand === "object" ? {
                  primaryColor: String(parsed.brand.primaryColor ?? "#FFEA00"),
                  strokeColor: String(parsed.brand.strokeColor ?? "#000000"),
                  moodKeywords: String(parsed.brand.moodKeywords ?? "dark cinematic, high contrast, moody"),
                  fontStyle: String(parsed.brand.fontStyle ?? "impact"),
                } : undefined;
                return Response.json({
                  topics,
                  modelUsed: `${p.name}/${model}`,
                  channelName: ctx?.name,
                  channelSampleCount: ctx?.recentTitles.length ?? 0,
                  subscribers: ctx?.subscribers,
                  suggestedGoal: sg.goal,
                  suggestedGoalReason: sg.reason,
                  brand,
                });
              } catch (e) {
                failures.push(`${p.name}/${model}: ${(e as Error).message}`);
              }
            }
          }
          console.error("[api/trends] all failed", failures);
          return Response.json({ topics: FALLBACK, modelUsed: "fallback", notice: failures.join(" | ") });
        } catch (e) {
          console.error("[api/trends]", e);
          return Response.json({ topics: FALLBACK, modelUsed: "fallback" });
        }
      },
    },
  },
});
