import { Film, Mic2, Loader2, Wand2, Sparkles } from "lucide-react";
import type { VoiceId } from "@/hooks/useStudio";
import { VOICES } from "@/hooks/useStudio";

type TopicFormProps = {
  topic: string;
  setTopic: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
  loading: boolean;
  voice: VoiceId;
  setVoice: (v: VoiceId) => void;
  voiceTouched: boolean;
  setVoiceTouched: (v: boolean) => void;
  onGenerate: (e: React.FormEvent) => void;
};

export function TopicForm({
  topic, setTopic, count, setCount, loading, voice, setVoice, voiceTouched, setVoiceTouched, onGenerate,
}: TopicFormProps) {
  return (
    <form onSubmit={onGenerate} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-6 shadow-2xl">
      <label className="block text-sm font-medium">Tema do vídeo</label>
      <textarea
        value={topic} onChange={(e) => setTopic(e.target.value)}
        placeholder="Ex.: A verdadeira história por trás da casa mais assombrada dos EUA"
        className="w-full min-h-24 rounded-lg bg-black/40 border border-white/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-1 shrink-0"><Film className="w-4 h-4" />Cenas:</label>
        <div className="inline-flex items-stretch rounded-md border border-white/10 bg-black/40 overflow-hidden shrink-0">
          <button
            type="button"
            aria-label="Diminuir cenas"
            onClick={() => setCount(Math.max(1, (Number(count) || 1) - 1))}
            className="px-3 text-lg leading-none hover:bg-white/10 active:bg-white/20 select-none"
          >−</button>
          <input
            type="number" inputMode="numeric" min={1} max={50} value={count}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") { setCount(0 as any); return; }
              const n = parseInt(v, 10);
              if (!isNaN(n)) setCount(Math.min(50, Math.max(1, n)));
            }}
            onBlur={(e) => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 3) setCount(8); }}
            className="w-14 text-center bg-transparent border-x border-white/10 p-2 text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Aumentar cenas"
            onClick={() => setCount(Math.min(50, (Number(count) || 0) + 1))}
            className="px-3 text-lg leading-none hover:bg-white/10 active:bg-white/20 select-none"
          >+</button>
        </div>
        <button disabled={loading} className="w-full sm:w-auto sm:ml-auto rounded-lg btn-blue-gradient px-5 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando…</> : <><Wand2 className="w-4 h-4" />Gerar roteiro</>}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <label className="text-sm flex items-center gap-1"><Mic2 className="w-4 h-4" />Voz:</label>
        <select
          value={voice}
          onChange={(e) => { setVoice(e.target.value as VoiceId); setVoiceTouched(true); }}
          className="rounded-md bg-black/40 border border-white/10 p-2 text-sm flex-1 min-w-56"
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label} — {v.desc}</option>
          ))}
        </select>
        {!voiceTouched && topic.trim().length > 4 && (
          <span className="text-xs text-primary/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> sugerida pelo tema
          </span>
        )}
      </div>
    </form>
  );
}