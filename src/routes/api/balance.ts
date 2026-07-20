import { createFileRoute } from "@tanstack/react-router";

type Balance = {
  provider: "openrouter" | "replicate";
  ok: boolean;
  balanceUsd?: number;
  usageUsd?: number;
  limitUsd?: number | null;
  raw?: unknown;
  error?: string;
};

async function fetchOpenRouter(): Promise<Balance> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { provider: "openrouter", ok: false, error: "sem OPENROUTER_API_KEY" };
  try {
    const r = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return { provider: "openrouter", ok: false, error: `${r.status} ${await r.text()}` };
    const j: any = await r.json();
    const total = Number(j?.data?.total_credits ?? 0);
    const used = Number(j?.data?.total_usage ?? 0);
    return { provider: "openrouter", ok: true, balanceUsd: total - used, usageUsd: used, limitUsd: total };
  } catch (e: any) {
    return { provider: "openrouter", ok: false, error: e?.message ?? String(e) };
  }
}

async function fetchReplicate(): Promise<Balance> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY;
  if (!lovableKey || !connKey) {
    return { provider: "replicate", ok: false, error: "conector Replicate não ligado" };
  }
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/replicate/v1/account", {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
      },
    });
    if (!r.ok) return { provider: "replicate", ok: false, error: `${r.status} ${await r.text()}` };
    const j: any = await r.json();
    // Replicate's /v1/account doesn't expose balance publicly; return account info.
    return {
      provider: "replicate",
      ok: true,
      raw: { username: j?.username, name: j?.name, type: j?.type },
      error: "Replicate não expõe saldo via API — veja em replicate.com/account/billing",
    };
  } catch (e: any) {
    return { provider: "replicate", ok: false, error: e?.message ?? String(e) };
  }
}

export const Route = createFileRoute("/api/balance")({
  server: {
    handlers: {
      GET: async () => {
        const [openrouter, replicate] = await Promise.all([fetchOpenRouter(), fetchReplicate()]);
        return Response.json({ openrouter, replicate });
      },
    },
  },
});
