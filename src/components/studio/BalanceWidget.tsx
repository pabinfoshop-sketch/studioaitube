import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Loader2, Settings, Eye, EyeOff, Check, X } from "lucide-react";
import { clientBalance, saveKeysToLocalStorage, getCurrentKeys } from "@/lib/ai-client";

type BalanceResp = {
  free?: { ok: boolean; statusLabel?: string; error?: string };
  lovable?: { ok: boolean; statusLabel?: string; error?: string };
  openrouter: { ok: boolean; balanceUsd?: number; usageUsd?: number; limitUsd?: number | null; statusLabel?: string; isFreeTier?: boolean; error?: string };
  replicate: { ok: boolean; raw?: any; statusLabel?: string; error?: string };
  order?: string[];
};

function ApiKeySettingsModal({ onClose }: { onClose: () => void }) {
  const current = getCurrentKeys();
  const [orKey, setOrKey] = useState(current.openrouter);
  const [rpKey, setRpKey] = useState(current.replicate);
  const [elKey, setElKey] = useState(current.elevenlabs);
  const [showOr, setShowOr] = useState(false);
  const [showRp, setShowRp] = useState(false);
  const [showEl, setShowEl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  function save() {
    setSaving(true);
    saveKeysToLocalStorage({ openrouter: orKey.trim(), replicate: rpKey.trim(), elevenlabs: elKey.trim() });
    toast.success("API keys salvas com sucesso!");
    setTimeout(() => { setSaving(false); onClose(); }, 500);
  }
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:pt-20 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl my-auto relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">Configurar API Keys</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">As keys ficam salvas no seu navegador (localStorage). Se as env vars ja estiverem configuradas no servidor, elas tem prioridade.</p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">OPENROUTER_API_KEY</label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showOr ? "text" : "password"} value={orKey} onChange={(e) => setOrKey(e.target.value)} placeholder="sk-or-v1-..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowOr(!showOr)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showOr ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {orKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">REPLICATE_API_KEY</label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showRp ? "text" : "password"} value={rpKey} onChange={(e) => setRpKey(e.target.value)} placeholder="r8_..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowRp(!showRp)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showRp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {rpKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">ELEVENLABS_API_KEY <span className="text-zinc-600">(opcional)</span></label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input type={showEl ? "text" : "password"} value={elKey} onChange={(e) => setElKey(e.target.value)} placeholder="xi-..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50" />
                <button onClick={() => setShowEl(!showEl)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">{showEl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              </div>
              {elKey && <span className="flex items-center text-[10px] text-green-400 whitespace-nowrap"><Check className="w-3 h-3" /></span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-muted-foreground hover:bg-white/5 transition">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-50">{saving ? "Salvando..." : "Salvar Keys"}</button>
        </div>
      </div>
    </div>
  );
  return mounted ? createPortal(content, document.body) : null;
}

export function BalanceWidget() {
  const [data, setData] = useState<BalanceResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 p-1.5 transition"
          title="Configurar API Keys"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {showSettings && <ApiKeySettingsModal onClose={() => { setShowSettings(false); refresh(); }} />}
    </>
  );
}