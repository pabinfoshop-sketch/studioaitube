import { createFileRoute } from "@tanstack/react-router";

type Provider = {
  name: string;
  url: string;
  headers: Record<string, string>;
  models: string[];
};

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as { prompt: string };
        const lovableKey = process.env.LOVABLE_API_KEY;
        const orKey = process.env.OPENROUTER_API_KEY;

        const fullPrompt = `Cinematic dark atmospheric 16:9 image, no text: ${prompt}`;
        const errors: string[] = [];
        const providers: Provider[] = [];

        if (orKey) {
          providers.push({
            name: "openrouter",
            url: "https://openrouter.ai/api/v1/chat/completions",
            headers: {
              Authorization: `Bearer ${orKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://darkcesar.lovable.app",
              "X-Title": "AIDarkCesar",
            },
            models: [
              // cheapest first
              "google/gemini-2.5-flash-image",
              "google/gemini-3-pro-image",
            ],
          });
        }
        if (lovableKey) {
          providers.push({
            name: "lovable",
            url: "https://ai.gateway.lovable.dev/v1/images/generations",
            headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "direct-fetch", "Content-Type": "application/json" },
            models: [
              "openai/gpt-image-1-mini",
              "google/gemini-3.1-flash-image",
              "google/gemini-2.5-flash-image",
            ],
          });
        }

        for (const p of providers) {
          for (const model of p.models) {
            try {
              const body =
                p.name === "openrouter"
                  ? {
                      model,
                      messages: [{ role: "user", content: fullPrompt }],
                      modalities: ["image", "text"],
                    }
                  : model.startsWith("openai/")
                    ? { model, prompt: fullPrompt, size: "1536x1024", quality: "low", n: 1 }
                    : {
                        model,
                        messages: [{ role: "user", content: fullPrompt }],
                        modalities: ["image", "text"],
                      };
              const upstream = await fetch(p.url, {
                method: "POST",
                headers: p.headers,
                body: JSON.stringify(body),
              });
              if (!upstream.ok) {
                const t = await upstream.text();
                errors.push(`${p.name}/${model}: ${upstream.status} ${t.slice(0, 140)}`);
                continue;
              }
              const j: any = await upstream.json();
              let b64: string | undefined = j?.data?.[0]?.b64_json;
              if (!b64 && p.name === "openrouter") {
                const imgs = j?.choices?.[0]?.message?.images;
                const url: string | undefined = imgs?.[0]?.image_url?.url;
                if (url?.startsWith("data:image")) {
                  b64 = url.split(",")[1];
                }
              }
              if (!b64) {
                errors.push(`${p.name}/${model}: sem imagem no retorno`);
                continue;
              }
              return Response.json({ b64, mime: "image/png", modelUsed: `${p.name}/${model}` });
            } catch (e: any) {
              errors.push(`${p.name}/${model}: ${e?.message ?? String(e)}`);
            }
          }
        }

        return new Response(`Todos os modelos falharam. ${errors.join(" | ")}`, { status: 502 });
      },
    },
  },
});
