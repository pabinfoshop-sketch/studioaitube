import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, Sparkles, Youtube, Target, History, Calendar, Loader2, X, CheckCircle2, Circle, Zap, Clock, AlertTriangle } from "lucide-react";

export type Topic = { emoji: string; title: string; tag: string; reason?: string };
export type HistoryItem = { id: string; title: string; topic: string; createdAt: number; scenes: number };

type Props = {
  onPick: (title: string) => void;
  history: HistoryItem[];
  onDeleteHistory: (id: string) => void;
};

const LS_CHANNEL = "aidc.channelUrl";
const LS_GOAL = "aidc.dailyGoal";
const LS_TOPICS = "aidc.topics";
const LS_BRAND = "aidc.brand";

const CATEGORIES = ["Mistério", "True Crime", "Oculto", "Sobrenatural", "Conspiração", "Terror", "Lenda"] as const;
type Mode = "random" | "channel" | "category";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ChannelPlanner({ onPick, history, onDeleteHistory }: Props) {
  const [channelUrl, setChannelUrl] = useState("");
  const [dailyGoal, setDailyGoal] = useState(1);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>();
  const [channelName, setChannelName] = useState<string>();
  const [sampleCount, setSampleCount] = useState(0);
  const [goalReason, setGoalReason] = useState<string>();



  useEffect(() => {
    setChannelUrl(localStorage.getItem(LS_CHANNEL) ?? "");
    setDailyGoal(Number(localStorage.getItem(LS_GOAL) ?? 1));
    try {
      const cached = localStorage.getItem(LS_TOPICS);
      if (cached) {
        const j = JSON.parse(cached);
        setTopics(j.topics ?? []);
        setChannelName(j.channelName);
        setModelUsed(j.modelUsed);
        setSampleCount(j.sampleCount ?? 0);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => { localStorage.setItem(LS_CHANNEL, channelUrl); }, [channelUrl]);
  useEffect(() => { localStorage.setItem(LS_GOAL, String(dailyGoal)); }, [dailyGoal]);

  const [mode, setMode] = useState<Mode>("random");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  async function fetchTrends(opts: { analyze?: boolean; append?: boolean; forceMode?: Mode; forceCategory?: string } = {}) {
    const useMode = opts.forceMode ?? (opts.analyze ? "channel" : mode);
    const useCategory = opts.forceCategory ?? category;
    setLoading(true);
    try {
      const exclude = [...topics.map((t) => t.title), ...history.map((h) => h.topic)].slice(0, 30);
      const r = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl: (useMode === "channel" && channelUrl) ? channelUrl : undefined,
          mode: useMode,
          category: useMode === "category" ? useCategory : undefined,
          count: 10,
          exclude,
        }),
      });
      const j = await r.json();
      const list: Topic[] = j.topics ?? [];
      const merged = opts.append ? [...list, ...topics].slice(0, 30) : list;
      setTopics(merged);
      setModelUsed(j.modelUsed);
      setChannelName(j.channelName);
      setSampleCount(j.channelSampleCount ?? 0);
      if (opts.analyze && j.suggestedGoal) {
        setDailyGoal(j.suggestedGoal);
        setGoalReason(j.suggestedGoalReason);
      }
      if (j.brand) {
        localStorage.setItem(LS_BRAND, JSON.stringify(j.brand));
      }

      localStorage.setItem(LS_TOPICS, JSON.stringify({
        topics: merged,
        channelName: j.channelName, modelUsed: j.modelUsed, sampleCount: j.channelSampleCount ?? 0,
      }));
      if (opts.analyze && j.channelSampleCount) {
        toast.success(`Canal analisado: ${j.channelSampleCount} vídeos • meta ${j.suggestedGoal}/dia${j.brand ? " • identidade visual capturada" : ""}`);
      } else toast.success("Novos temas gerados!");
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally { setLoading(false); }
  }

  // Cronograma em tempo real: distribui `dailyGoal` publicações pelos próximos N dias
  // usando os temas atuais como fila. Mostra data + horário sugerido (18h prime time BR).
  const schedule = useMemo(() => {
    if (!topics.length || dailyGoal <= 0) return [];
    const days = Math.ceil(topics.length / dailyGoal);
    const items: { date: Date; slot: number; topic: Topic }[] = [];
    const start = new Date();
    start.setHours(18, 0, 0, 0);
    for (let d = 0; d < days; d++) {
      for (let s = 0; s < dailyGoal; s++) {
        const i = d * dailyGoal + s;
        if (i >= topics.length) break;
        const date = new Date(start);
        date.setDate(start.getDate() + d);
        date.setHours(18 + s * 2, 0, 0, 0);
        items.push({ date, slot: s, topic: topics[i] });
      }
    }
    return items;
  }, [topics, dailyGoal]);

  const publishedToday = history.filter((h) => new Date(h.createdAt).toISOString().slice(0, 10) === todayKey()).length;
  const goalPct = Math.min(100, Math.round((publishedToday / Math.max(1, dailyGoal)) * 100));

  return (
    <section className="space-y-5">
      {/* Canal + meta */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5 text-red-400" /> Canal do YouTube
          </label>
          <div className="flex gap-2 min-w-0">
            <input
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://youtube.com/@seucanal"
              className="flex-1 min-w-0 rounded-md bg-black/40 border border-white/10 p-2 text-sm focus:ring-2 focus:ring-primary/50"
            />
            <button
              disabled={loading || !channelUrl}
              onClick={() => fetchTrends({ analyze: true })}
              className="shrink-0 rounded-md btn-blue-gradient px-3 py-2 text-xs font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Analisar
            </button>
          </div>
          {channelName && (
            <div className="text-xs text-muted-foreground">
              📺 <span className="text-foreground font-medium">{channelName}</span> — {sampleCount} vídeos lidos
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" /> Meta diária de publicação
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={10} value={dailyGoal}
              onChange={(e) => { setDailyGoal(Number(e.target.value) || 0); setGoalReason(undefined); }}
              className="w-20 rounded-md bg-black/40 border border-white/10 p-2 text-sm"
            />
            <span className="text-xs text-muted-foreground">vídeo(s)/dia</span>
            <div className="ml-auto text-xs font-semibold text-primary">
              {publishedToday}/{dailyGoal} hoje
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          {goalReason && (
            <div className="text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2">
              💡 {goalReason}
            </div>
          )}
        </div>
      </div>


      {/* Temas recomendados */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium">Temas em alta recomendados</span>
            {modelUsed && (
              <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                {modelUsed}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchTrends({ append: true })}
            disabled={loading}
            className="rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary px-3 py-1.5 text-xs disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "✨"} Gerar mais
          </button>
        </div>

        {/* Mode + categorias */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(["random", "channel", "category"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); fetchTrends({ forceMode: m }); }}
              disabled={loading || (m === "channel" && !channelUrl)}
              className={`rounded-full px-3 py-1 border transition ${mode === m ? "bg-primary/30 border-primary/60 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10"} disabled:opacity-40`}
              title={m === "channel" && !channelUrl ? "Cole a URL do canal primeiro" : ""}
            >
              {m === "random" ? "🎲 Aleatório" : m === "channel" ? "🎯 Do canal" : "🗂️ Categoria"}
            </button>
          ))}
          {mode === "category" && (
            <div className="flex flex-wrap gap-1.5 w-full pt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); fetchTrends({ forceMode: "category", forceCategory: c }); }}
                  disabled={loading}
                  className={`rounded-full px-2.5 py-1 border text-[11px] ${category === c ? "bg-accent/30 border-accent/60 text-accent" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                >
                  {c}
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = category.trim();
                  if (!v) return;
                  fetchTrends({ forceMode: "category", forceCategory: v });
                }}
                className="flex items-center gap-1 w-full sm:w-auto"
              >
                <input
                  type="text"
                  value={CATEGORIES.includes(category as any) ? "" : category}
                  onChange={(e) => setCategory(e.target.value.slice(0, 40))}
                  placeholder="✍️ Categoria personalizada..."
                  className="flex-1 sm:w-56 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] focus:outline-none focus:border-accent/60"
                  maxLength={40}
                />
                <button
                  type="submit"
                  disabled={loading || !category.trim() || CATEGORIES.includes(category as any)}
                  className="rounded-full px-3 py-1 border border-accent/40 bg-accent/20 hover:bg-accent/30 text-accent text-[11px] disabled:opacity-40"
                >
                  Usar
                </button>
              </form>
            </div>
          )}
        </div>
        {topics.length === 0 && (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Clique em "Gerar mais temas" ou cole a URL do canal e "Analisar" para recomendações personalizadas.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {topics.map((t, i) => (
            <button
              key={`${t.title}-${i}`}
              onClick={() => onPick(t.title)}
              className="group text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/40 p-3 transition flex gap-3 min-w-0 w-full"
            >
              <span className="text-2xl shrink-0">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium group-hover:text-primary transition break-words">{t.title}</div>
                <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap items-start gap-x-2 gap-y-1 min-w-0">
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 shrink-0">{t.tag}</span>
                  {t.reason && <span className="italic break-words w-full sm:w-auto sm:flex-1 min-w-0">{t.reason}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cronograma */}
      {schedule.length > 0 && (() => {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        const doneTitles = new Set(history.map((h) => norm(h.topic)));
        const now = Date.now();
        const enriched = schedule.map((s) => {
          const done = doneTitles.has(norm(s.topic.title));
          const overdue = !done && s.date.getTime() < now;
          return { ...s, done, overdue };
        });
        const doneCount = enriched.filter((e) => e.done).length;
        const nextIdx = enriched.findIndex((e) => !e.done);
        const next = nextIdx >= 0 ? enriched[nextIdx] : null;
        const pct = Math.round((doneCount / enriched.length) * 100);

        // countdown para o próximo slot
        let countdown = "";
        if (next) {
          const diff = next.date.getTime() - now;
          if (diff <= 0) countdown = "agora!";
          else {
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            countdown = h > 0 ? `em ${h}h ${m}m` : `em ${m}m`;
          }
        }

        return (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="font-medium">Cronograma</span>
              <span className="text-xs text-muted-foreground">— {doneCount}/{enriched.length} concluídos</span>
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400"/>feito</span>
                <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3 text-primary"/>próximo</span>
                <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400"/>atrasado</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Próximo destaque */}
            {next && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 flex items-center gap-3 animate-scale-in">
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-primary/80">
                    {next.overdue ? "Atrasado — faça já" : `Faça primeiro • ${countdown}`}
                  </div>
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    <span>{next.topic.emoji}</span>
                    <span className="truncate">{next.topic.title}</span>
                  </div>
                </div>
                <button
                  onClick={() => onPick(next.topic.title)}
                  className="shrink-0 text-xs rounded-md btn-blue-gradient px-3 py-1.5 font-medium hover-scale"
                >
                  Criar agora
                </button>
              </div>
            )}
            {!next && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-center gap-2 animate-scale-in">
                <CheckCircle2 className="w-4 h-4" /> Cronograma completo! Gere novos temas para continuar.
              </div>
            )}

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {enriched.map((s, i) => {
                const isNext = i === nextIdx;
                return (
                  <div
                    key={i}
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                    className={`flex items-center gap-3 text-xs rounded-md border px-3 py-2 transition-all animate-fade-in ${
                      s.done
                        ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                        : isNext
                          ? "border-primary/50 bg-primary/10"
                          : s.overdue
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-white/10 bg-black/20"
                    }`}
                  >
                    {s.done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      : isNext
                        ? <Zap className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                        : s.overdue
                          ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="text-primary/90 font-mono min-w-[92px] hidden sm:block">
                      {s.date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      <span className="text-muted-foreground ml-1">{s.date.getHours().toString().padStart(2, "0")}:00</span>
                    </div>
                    <span className="text-base">{s.topic.emoji}</span>
                    <span className={`flex-1 truncate ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.topic.title}</span>
                    {!s.done && (
                      <button
                        onClick={() => onPick(s.topic.title)}
                        className="shrink-0 text-[10px] rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary px-2 py-0.5"
                      >
                        criar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Histórico */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Histórico ({history.length})</span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {history.slice().reverse().map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-xs rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-muted-foreground min-w-[110px] font-mono">
                  {new Date(h.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <span className="flex-1 truncate">{h.title}</span>
                <span className="text-[10px] text-muted-foreground">{h.scenes} cenas</span>
                <button
                  onClick={() => onPick(h.topic)}
                  className="text-[10px] rounded bg-white/10 hover:bg-white/20 px-2 py-0.5"
                >
                  refazer
                </button>
                <button onClick={() => onDeleteHistory(h.id)} className="text-muted-foreground hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
