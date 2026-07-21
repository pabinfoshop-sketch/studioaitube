import { createFileRoute } from "@tanstack/react-router";

// Server-side balance check — avoids CORS issues with Replicate
// Responds in < 3s — well within Cloudflare Workers timeout
export const Route = createFileRoute("/api/balance")({
  server: {
    handlers: {
      GET: async () => {
        const orKey = process.env.OPENROUTER_API_KEY || "";
        const rpKey = process.env.REPLICATE_API_KEY || "";

        const result: Record<string, any> = {
          openrouter: { ok: false, error: "sem chave" },
          replicate: { ok: false, error: "sem chave" },
        };

        // OpenRouter
        if (orKey) {
          try {
            const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
              headers: { Authorization: `Bearer ${orKey}` },
            });
            if (r.ok) {
              const d: any = await r.json();
              const data = d.data ?? {};
              const hasCreditLimit = data.limit != null;
              const balanceUsd = hasCreditLimit ? data.limit_remaining : undefined;
              const usageUsd = data.usage ?? data.usage_monthly ?? 0;
              const limitUsd = hasCreditLimit ? data.limit : undefined;
              const statusLabel = hasCreditLimit
                ? `$${(balanceUsd ?? 0).toFixed(2)} restante`
                : `pago por uso - $${usageUsd.toFixed(4)} este mes`;
              result.openrouter = { ok: true, balanceUsd, usageUsd, limitUsd, statusLabel, isFreeTier: !!data.is_free_tier };
            } else {
              result.openrouter.error = `OpenRouter ${r.status}`;
            }
          } catch (e: any) {
            result.openrouter.error = e?.message || "falha";
          }
        }

        // Replicate
        if (rpKey) {
          try {
            const r = await fetch("https://api.replicate.com/v1/account", {
              headers: { Authorization: `Bearer ${rpKey}` },
            });
            if (r.ok) {
              const d: any = await r.json();
              result.replicate = { ok: true, statusLabel: `@${d.username}`, raw: { username: d.username, name: d.name, type: d.type } };
            } else {
              result.replicate.error = `Replicate ${r.status}`;
            }
          } catch (e: any) {
            result.replicate.error = e?.message || "falha";
          }
        }

        return Response.json(result);
      },
    },
  },
});
