"use client";

/**
 * Personal Goals — optional, user-defined goal list with progress bars.
 * Goals are personal and separate from any academic evaluation.
 * Data comes from /api/campus/goals (GET/POST) + /complete endpoint.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Target,
  Plus,
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import type { PersonalGoal } from "@/lib/engagement";

function progressPct(g: PersonalGoal): number {
  if (g.isCompleted) return 100;
  if (g.targetValue <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
  );
}

export function PersonalGoals() {
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState(1);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/goals", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load goals");
      }
      setGoals(json.data.goals ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = goals.length;
  const completed = goals.filter((g) => g.isCompleted).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setCreateError("Title is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/campus/goals", {
        method: "POST",
        headers: getAuthHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          title: t,
          targetValue: Number(targetValue) || 1,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to create goal");
      }
      setTitle("");
      setNotes("");
      setTargetValue(1);
      setGoals((prev) => [...prev, json.data.goal]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setCreating(false);
    }
  }

  async function handleComplete(goal: PersonalGoal) {
    setBusyGoalId(goal.id);
    try {
      const res = await fetch(
        `/api/campus/goals/${encodeURIComponent(goal.id)}/complete`,
        { method: "POST", headers: getAuthHeaders(), cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to complete goal");
      }
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, isCompleted: true, currentValue: g.targetValue } : g))
      );
    } catch {
      // keep UI stable on failure; the goal row reflects server state on next load
      void load();
    } finally {
      setBusyGoalId(null);
    }
  }

  return (
    <WidgetBoundary title="Personal Goals">
      <section aria-label="Personal goals" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Target className="h-4 w-4 text-violet-400" aria-hidden />
            Personal Goals
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              {completed} / {total} completed
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Optional, personal goals — never part of academic evaluation.
        </p>

        {loading && goals.length === 0 ? (
          <div className="mt-5 flex items-center gap-2 py-4 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading goals…
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : (
          <ul className="mt-4 space-y-3" aria-label="Goal list">
            {goals.map((goal) => {
              const pct = progressPct(goal);
              return (
                <li key={goal.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/30 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        goal.isCompleted
                          ? "text-emerald-300 line-through opacity-70"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {goal.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                        {Math.min(goal.currentValue, goal.targetValue)}/{goal.targetValue}
                      </span>
                      {goal.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="Completed" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleComplete(goal)}
                          disabled={busyGoalId === goal.id}
                          aria-label={`Mark "${goal.title}" complete`}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-1 text-emerald-300 hover:bg-emerald-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
                        >
                          {busyGoalId === goal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-raised)]"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.title} progress`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        goal.isCompleted ? "bg-emerald-500" : "bg-violet-500"
                      } motion-safe:transition-[width] motion-safe:duration-500 motion-reduce:transition-none`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {goal.notes ? (
                    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{goal.notes}</p>
                  ) : null}
                </li>
              );
            })}
            {goals.length === 0 && (
              <li className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
                <Circle className="h-4 w-4" aria-hidden />
                No goals yet — add one below.
              </li>
            )}
          </ul>
        )}

        <form onSubmit={handleCreate} className="mt-4 space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/20 p-3.5">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            New goal
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Attend 5 campus events this term"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 motion-safe:transition-shadow motion-reduce:transition-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Target value
              <input
                type="number"
                min={1}
                max={100000}
                value={targetValue}
                onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 motion-safe:transition-shadow motion-reduce:transition-none"
              />
            </label>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Notes (optional)
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                placeholder="Optional context"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 motion-safe:transition-shadow motion-reduce:transition-none"
              />
            </label>
          </div>
          {createError ? (
            <p className="flex items-center gap-1.5 text-[11px] text-rose-300" role="alert">
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              {createError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden />
            )}
            Add goal
          </button>
        </form>
      </section>
    </WidgetBoundary>
  );
}
