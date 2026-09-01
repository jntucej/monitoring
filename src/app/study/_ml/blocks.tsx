import { CheckCircle2, ListChecks, Target } from "lucide-react";

export function Block({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">{icon}{title}</p>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{body}</p>
    </div>
  );
}

export function StepBlock({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Steps</p>
      <ol className="space-y-1">
        {steps.map((s,i) => <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><span className="w-4 h-4 rounded-full bg-[var(--action-primary)]/15 text-[9px] font-bold text-[var(--action-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>{s}</li>)}
      </ol>
    </div>
  );
}

export function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "good" | "bad" | "exam" }) {
  const ring =
    tone === "good" ? "border-emerald-500/25 bg-emerald-500/5"
    : tone === "bad" ? "border-rose-500/25 bg-rose-500/5"
    : tone === "exam" ? "border-amber-500/25 bg-amber-500/10"
    : "border-[var(--border)] bg-[var(--bg-surface)]";
  return (
    <div className={`rounded-2xl border p-4 space-y-1.5 ${ring}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</p>
      {tone === "exam" && (
        <p className="text-[10px] text-[var(--text-muted)] italic flex items-center gap-1">
          <Target className="w-3 h-3" /> likely answer points — not guaranteed questions
        </p>
      )}
      <ul className="space-y-1">
        {items.map((it,i) => <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--action-primary)]/60 flex-shrink-0 mt-0.5" />{it}</li>)}
      </ul>
    </div>
  );
}