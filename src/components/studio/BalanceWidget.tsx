import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { clientBalance } from "@/lib/ai-client";

type BalanceResp = {
  free?: { ok: boolean; statusLabel?: string; error?: string };
  lovable?: { ok: boolean; statusLabel?: string; error?: string };
  openrouter: { ok: boolean; balanceUsd?: number; usageUsd?: number; limitUsd?: number | null; statusLabel?: string; isFreeTier?: boolean; error?: string };
  replicate: { ok: boolean; raw?: any; statusLabel?: string; error?: string };
  order?: string[];
};

export function BalanceWidget() {
  const [data, setData] = useState<BalanceResp | null>(null);
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try { setData(await clientBalance() as any); } catch { /* noop */ }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const id = setInterval(refresh, 30_000); return () => clearInterval(id); }, []);
  const or = data?.openrouter;
  const rp = data?.replicate;
  const free = data?.free;
  const fmt = (n?: number) => (typeof n === "number" ? `$${n.toFixed(2)}` : null);
  const orLabel = or?.ok
    ? (fmt(or.balanceUsd) ?? or.statusLabel ?? (or.usageUsd != null ? `usado $${or.usageUsd.toFixed(2)}` : "ok"))
    : (or?.error ?? "off");
  const rpLabel = rp?.ok ? (rp.statusLabel ?? "ok") : (rp?.error ?? "off");
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={refresh}
          title={data
            ? `TTS: ${free?.ok ? "gratuito" : "off"}\nOpenRouter: ${or?.ok ? (or.statusLabel ?? "ok") : (or?.error ?? "off")}\nReplicate: ${rp?.ok ? (rp.statusLabel ?? "ok") : (rp?.error ?? "off")}\n\nClique para atualizar`
            : "Carregando..."}
          className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] transition min-w-0 max-w-[calc(100vw-10rem)] overflow-hidden"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${free?.ok !== false ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="text-muted-foreground">TTS</span>
            <span className="font-semibold text-green-400">grátis</span>
          </span>
          <span className="w-px h-3 bg-white/10 shrink-0" />
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${or?.ok ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="hidden sm:inline text-muted-foreground">OR</span>
            <span className={`font-semibold truncate ${or?.ok ? "text-green-400" : "text-red-400"}`}>{orLabel}</span>
          </span>
          <span className="w-px h-3 bg-white/10 shrink-0" />
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${rp?.ok ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="hidden sm:inline text-muted-foreground">RP</span>
            <span className={`font-semibold truncate ${rp?.ok ? "text-green-400" : "text-red-400"}`}>{rpLabel}</span>
          </span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </button>
      </div>
    </>
  );
}