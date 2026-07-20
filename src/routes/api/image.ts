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
        const replicateKey = process.env.REPLICATE_API_KEY ?? process.env.REPLICATE_API_TOKEN;
        const replicateConnectorKey = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY;

        const fullPrompt = `Cinematic dark atmospheric 16:9 image, no text: ${prompt}`;
        const errors: string[] = [];

        // 1) Replicate flux-schnell — cheapest (~$0.003/img, ~1s)
        if (replicateKey || (replicateConnectorKey && lovableKey)) {
          try {
            const useGateway = !replicateKey && !!replicateConnectorKey && !!lovableKey;
            const base = useGateway
              ? "https://connector-gateway.lovable.dev/replicate/v1"
              : "https://api.replicate.com/v1";
            const headers: Record<string, string> = useGateway
              ? {
                  Authorization: `Bearer ${lovableKey}`,
                  "X-Connection-Api-Key": replicateConnectorKey!,
                  "Content-Type": "application/json",
                  Prefer: "wait",
                }
              : {
                  Authorization: `Bearer ${replicateKey}`,
                  "Content-Type": "application/json",
                  Prefer: "wait",
                };
            const r = await fetch(`${base}/models/black-forest-labs/flux-schnell/predictions`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                input: {
                  prompt: fullPrompt,
                  aspect_ratio: "16:9",
                  output_format: "png",
                  num_outputs: 1,
                  num_inference_steps: 4,
                },
              }),
            });
            if (r.ok) {
              const j: any = await r.json();
              let outUrl: string | undefined = Array.isArray(j.output) ? j.output[0] : j.output;
              // If not ready, poll briefly
              if (!outUrl && j.id) {
                for (let i = 0; i < 20; i++) {
                  await new Promise((res) => setTimeout(res, 1500));
                  const pr = await fetch(`${base}/predictions/${j.id}`, { headers });
                  const pj: any = await pr.json();
                  if (pj.status === "succeeded") {
                    outUrl = Array.isArray(pj.output) ? pj.output[0] : pj.output;
                    break;
                  }
                  if (pj.status === "failed" || pj.status === "canceled") break;
                }
              }
              if (outUrl) {
                const img = await fetch(outUrl);
                const buf = new Uint8Array(await img.arrayBuffer());
                let bin = "";
                for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
                const b64 = btoa(bin);
                return Response.json({ b64, mime: "image/png", modelUsed: "replicate/flux-schnell" });
              }
              errors.push(`replicate/flux-schnell: sem output`);
            } else {
              errors.push(`replicate/flux-schnell: ${r.status} ${(await r.text()).slice(0, 140)}`);
            }
          } catch (e: any) {
            errors.push(`replicate/flux-schnell: ${e?.message ?? String(e)}`);
          }
        }

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
