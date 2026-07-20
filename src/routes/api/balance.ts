import { createFileRoute } from "@tanstack/react-router";
import { getLovableKey, getOpenRouterKey, getReplicateKey } from "@/lib/ai-env";

type Balance = {
  provider: "free" | "lovable" | "openrouter" | "replicate";
  ok: boolean;
  balanceUsd?: number;
  usageUsd?: number;
  limitUsd?: number | null;
  raw?: unknown;
  statusLabel?: string;
  keySource?: string;
  error?: string;
};

function fetchFree(): Balance {
  return {
    provider: "free",
    ok: true,
    statusLabel: "fallback grátis ativo",
    raw: { tts: "google-free", localDraft: true },
  };
}

function fetchLovable(): Balance {
  const key = getLovableKey();
  return key
    ? { provider: "lovable", ok: true, statusLabel: "backup Lovable AI ativo", keySource: key.name }
    : { provider: "lovable", ok: false, error: "sem LOVABLE_API_KEY" };
}

async function fetchOpenRouter(): Promise<Balance> {
  const key = getOpenRouterKey();
  if (!key) return { provider: "openrouter", ok: false, error: "sem OPENROUTER_API_KEY" };
  try {
    const r = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key.value}` },
    });
    if (!r.ok) return { provider: "openrouter", ok: false, error: `${r.status} ${await r.text()}` };
    const j: any = await r.json();
    const total = Number(j?.data?.total_credits ?? 0);
    const used = Number(j?.data?.total_usage ?? 0);
    return { provider: "openrouter", ok: true, balanceUsd: total - used, usageUsd: used, limitUsd: total, keySource: key.name };
  } catch (e: any) {
    return { provider: "openrouter", ok: false, error: e?.message ?? String(e) };
  }
}

async function fetchReplicate(): Promise<Balance> {
  const directKey = getReplicateKey();
  const connectorKey = process.env.LOVABLE_CONNECTOR_REPLICATE_API_KEY;
  const lovableKey = getLovableKey();
  if (!directKey && (!connectorKey || !lovableKey)) return { provider: "replicate", ok: false, error: "sem REPLICATE_API_KEY" };
  try {
    if (directKey) {
      const r = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${directKey.value}` },
      });
      if (!r.ok) return { provider: "replicate", ok: false, error: `${r.status} ${await r.text()}` };
      const j: any = await r.json();
      // Replicate não expõe saldo via API pública — retorna dados da conta.
      return {
        provider: "replicate",
        ok: true,
        keySource: directKey.name,
        statusLabel: "conectado",
        raw: { username: j?.username, name: j?.name, type: j?.type },
        error: "saldo não é exposto pela API — veja em replicate.com/account/billing",
      };
    }

    const r = await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey!.value}`,
        "X-Connection-Api-Key": connectorKey!,
      },
    });
    if (!r.ok) return { provider: "replicate", ok: false, error: `${r.status} ${await r.text()}` };
    const j: any = await r.json();
    return {
      provider: "replicate",
      ok: j?.outcome !== "failed",
      keySource: "LOVABLE_CONNECTOR_REPLICATE_API_KEY",
      statusLabel: j?.outcome === "verified" ? "conectado" : String(j?.outcome ?? "conectado"),
      raw: j,
      error: "saldo não é exposto pela API — veja em replicate.com/account/billing",
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
        return Response.json({
          free: fetchFree(),
          openrouter,
          replicate,
          lovable: fetchLovable(),
          order: ["free", "openrouter-free", "openrouter-cheap", "lovable-backup", "replicate-video"],
        }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
