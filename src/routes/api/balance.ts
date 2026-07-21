import { createFileRoute } from "@tanstack/react-router";

// Server-side balance check — avoids CORS issues with both providers.
// On Cloudflare Pages: env vars set in the dashboard are available via process.env
// (Nitro maps them to the Worker runtime automatically).

export const Route = createFileRoute("/api/balance")({
  server: {
    handlers: {
      GET: async () => {
        const orKey = process.env.OPENROUTER_API_KEY || "";
        const rpKey = process.env.REPLICATE_API_KEY || "";

        const result: Record<string, any> = {
          _debug: {
            hasOrKey: !!orKey,
            hasRpKey: !!rpKey,
            orKeyLen: orKey.length,
            rpKeyLen: rpKey.length,
          },
          openrouter: { ok: false, error: orKey ? "verificando..." : "sem chave no servidor" },
          replicate: { ok: false, error: rpKey ? "verificando..." : "sem chave no servidor" },
        };

        // OpenRouter
        if (orKey) {
          try {
            const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
              headers: { Authorization: `Bearer ${orKey}` },
              signal: AbortSignal.timeout(8000),
            });
            if (r.ok) {
              const d: any = await r.json();
              const data = d.data ?? {};
              const isFree = !!data.is_free_tier;
              const hasCreditLimit = data.limit != null;
              const balanceUsd = hasCreditLimit ? Number(data.limit_remaining) : null;
              const usageUsd = Number(data.usage ?? 0);
              const limitUsd = hasCreditLimit ? Number(data.limit) : null;
              const statusLabel = isFree
                ? "grátis / uso ilimitado"
                : hasCreditLimit
                  ? `saldo $${balanceUsd!.toFixed(2)}`
                  : `usado $${usageUsd < 0.01 ? usageUsd.toFixed(4) : usageUsd.toFixed(2)} este mês`;
              result.openrouter = { ok: true, balanceUsd, usageUsd, limitUsd, isFreeTier: isFree, statusLabel };
            } else {
              const body = await r.text().catch(() => "");
              result.openrouter = { ok: false, error: `HTTP ${r.status}: ${body.slice(0, 120)}` };
            }
          } catch (e: any) {
            result.openrouter = { ok: false, error: e?.message || "falha de rede" };
          }
        }

        // Replicate
        if (rpKey) {
          try {
            const r = await fetch("https://api.replicate.com/v1/account", {
              headers: { Authorization: `Bearer ${rpKey}` },
              signal: AbortSignal.timeout(8000),
            });
            if (r.ok) {
              const d: any = await r.json();
              result.replicate = { ok: true, statusLabel: `@${d.username}`, raw: { username: d.username, name: d.name, type: d.type } };
            } else {
              const body = await r.text().catch(() => "");
              result.replicate = { ok: false, error: `HTTP ${r.status}: ${body.slice(0, 120)}` };
            }
          } catch (e: any) {
            result.replicate = { ok: false, error: e?.message || "falha de rede" };
          }
        }

        return Response.json(result);
      },
    },
  },
});