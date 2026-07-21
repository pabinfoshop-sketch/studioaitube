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
          openrouter: { ok: false, error: orKey ? "verificando..." : "sem chave no servidor" },
          replicate: { ok: false, error: rpKey ? "verificando..." : "sem chave no servidor" },
        };

        // OpenRouter — usa /v1/credits (mostra saldo real de créditos)
        if (orKey) {
          try {
            const r = await fetch("https://openrouter.ai/api/v1/credits", {
              headers: { Authorization: `Bearer ${orKey}` },
              signal: AbortSignal.timeout(8000),
            });
            if (r.ok) {
              const d: any = await r.json();
              const credits = Number(d.data?.total_credits ?? 0);
              const usage = Number(d.data?.total_usage ?? 0);
              const balanceUsd = Math.max(0, credits - usage);
              const statusLabel = `$${balanceUsd.toFixed(2)}`;
              result.openrouter = { ok: true, balanceUsd, usageUsd: usage, limitUsd: credits, isFreeTier: false, statusLabel };
            } else {
              // Fallback para /v1/auth/key se credits falhar
              try {
                const r2 = await fetch("https://openrouter.ai/api/v1/auth/key", {
                  headers: { Authorization: `Bearer ${orKey}` },
                  signal: AbortSignal.timeout(8000),
                });
                if (r2.ok) {
                  const d2: any = await r2.json();
                  const data = d2.data ?? {};
                  const isFree = !!data.is_free_tier;
                  const hasLimit = data.limit != null;
                  const balanceUsd = hasLimit ? Number(data.limit_remaining) : null;
                  const usageUsd = Number(data.usage ?? 0);
                  const limitUsd = hasLimit ? Number(data.limit) : null;
                  const statusLabel = isFree
                    ? "grátis / uso ilimitado"
                    : hasLimit
                      ? `saldo $${balanceUsd!.toFixed(2)}`
                      : `usado $${usageUsd < 0.01 ? usageUsd.toFixed(4) : usageUsd.toFixed(2)} este mês`;
                  result.openrouter = { ok: true, balanceUsd, usageUsd, limitUsd, isFreeTier: isFree, statusLabel };
                }
              } catch { /* ignore fallback */ }
              if (!result.openrouter.ok) {
                const body = await r.text().catch(() => "");
                result.openrouter = { ok: false, error: `HTTP ${r.status}: ${body.slice(0, 120)}` };
              }
            }
          } catch (e: any) {
            result.openrouter = { ok: false, error: e?.message || "falha de rede" };
          }
        }

        // Replicate — API não expõe saldo, mostra username
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