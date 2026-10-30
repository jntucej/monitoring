"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Lock, RefreshCw, UtensilsCrossed } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import {
  MEAL_TYPES,
  MEAL_LABEL,
  MEAL_WINDOW,
  SATISFACTION_LEVELS,
  type MealType,
  type Satisfaction,
} from "@/lib/mess-reviews";

interface ReviewRow {
  id: string;
  review_date: string;
  meal_type: MealType;
  satisfaction: Satisfaction;
  comment: string | null;
  edit_count?: number;
}

/** Today's date in Asia/Kolkata (the campus operating timezone). */
function istToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Current IST time as [hour, minute]. */
function istNow(): [number, number] {
  const s = new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });
  const [h, m] = s.split(":").map(Number);
  return [h || 0, m || 0];
}

function fmtTime([h, m]: [number, number]): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

type WindowPhase = "open" | "closed" | "upcoming";

function mealPhase(meal: MealType, now: [number, number]): WindowPhase {
  const w = MEAL_WINDOW[meal];
  const [sh, sm] = w.start;
  const [eh, em] = w.end;
  const cur = now[0] * 60 + now[1];
  if (cur < sh * 60 + sm) return "upcoming";
  if (cur > eh * 60 + em) return "closed";
  return "open";
}

export function MealReviewPanel() {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  // 30s tick keeps the countdown current.
  const [now, setNow] = useState<[number, number]>(istNow());

  const today = istToday();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mess/reviews?from=${today}&to=${today}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      // ok   -> { success: true, data: { reviews } }
      // fail -> { success: false, error: "CODE", message: "..." }
      if (!res.ok || body?.data == null) {
        throw new Error(body?.message ?? "Failed to load reviews");
      }
      setReviews(body.data.reviews ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
    const t = setInterval(() => setNow(istNow()), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRow>();
    for (const r of reviews) m.set(`${r.review_date}|${r.meal_type}`, r);
    return m;
  }, [reviews]);

  const openMeals = MEAL_TYPES.filter((m) => mealPhase(m, now) === "open");
  const anyOpen = openMeals.length > 0;
  const openWindowLabel = openMeals.length
    ? openMeals.map((m) => MEAL_LABEL[m]).join(" · ")
    : null;

  const submit = useCallback(
    async (date: string, meal: MealType, satisfaction: Satisfaction) => {
      const key = `${date}|${meal}`;
      setSavingKey(key);
      try {
        const res = await fetch("/api/mess/reviews", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewDate: date,
            mealType: meal,
            satisfaction,
            comment: commentDraft[key] ?? null,
          }),
        });
        const body = await res.json().catch(() => null);
        // ok   -> { success: true, data: { review } }
        // fail -> { success: false, error: "CODE", message: "..." }
        if (!res.ok || body?.data == null) {
          throw new Error(body?.message ?? "Save failed");
        }
        const saved = body.data.review as ReviewRow;
        setReviews((prev) => {
          const next = prev.filter((r) => !(r.review_date === date && r.meal_type === meal));
          next.push(saved);
          return next;
        });
        addToast({ message: "Review saved", variant: "success" });
      } catch (e) {
        addToast({ message: e instanceof Error ? e.message : "Save failed", variant: "error" });
      } finally {
        setSavingKey(null);
      }
    },
    [addToast, commentDraft],
  );

  if (loading) {
    return (
      <WidgetBoundary title="Meal Reviews">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </WidgetBoundary>
    );
  }

  return (
    <WidgetBoundary title="Meal Reviews">
      <div className="space-y-4">
        {/* Header + current-window status */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Meal Reviews</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Rate meals while their serving window is open.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Current meal-window status card */}
        <div
          className={`rounded-xl border p-4 ${
            anyOpen
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-[var(--border)] bg-[var(--bg-surface)]/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {anyOpen ? (
              <Clock className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <Lock className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${anyOpen ? "text-emerald-300" : "text-[var(--text-secondary)]"}`}>
                {anyOpen ? `Now serving: ${openWindowLabel}` : "No meal window open right now"}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {anyOpen
                  ? "You can rate these meals below."
                  : "Reviews are available during today's breakfast, lunch and dinner windows."}
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}{" "}
              <button type="button" onClick={() => void load()} className="underline">Retry</button>
            </div>
          )}
        </div>

        {/* Today's meals — each with its own window state */}
        <div className="grid gap-3 md:grid-cols-3">
          {MEAL_TYPES.map((meal) => {
            const phase = mealPhase(meal, now);
            const key = `${today}|${meal}`;
            const existing = reviewMap.get(key);
            const selected = existing?.satisfaction ?? null;
            const win = MEAL_WINDOW[meal].start;
            const winEnd = MEAL_WINDOW[meal].end;
            const disabled = phase !== "open";
            return (
              <div
                key={meal}
                className={`rounded-xl border p-4 transition ${
                  phase === "open"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-[var(--border)] bg-[var(--bg-surface)]/60"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{MEAL_LABEL[meal]}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      phase === "open"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : phase === "upcoming"
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                    }`}
                  >
                    {phase === "open" ? "Window open" : phase === "upcoming" ? `Opens ${fmtTime(win)}` : `Closed ${fmtTime(winEnd)}`}
                  </span>
                </div>

                {phase === "open" ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {SATISFACTION_LEVELS.map((opt) => {
                        const active = selected === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={savingKey === key}
                            onClick={() => void submit(today, meal, opt.value)}
                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                              active
                                ? opt.tone
                                : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                            }`}
                            title={opt.label}
                          >
                            <span aria-hidden>{opt.emoji}</span>
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      maxLength={280}
                      placeholder="Optional short comment (280 chars)"
                      defaultValue={existing?.comment ?? ""}
                      onChange={(e) => setCommentDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                      onBlur={(e) => {
                        const v = e.target.value;
                        setCommentDraft((prev) => ({ ...prev, [key]: v }));
                        if (selected && v !== (existing?.comment ?? "")) void submit(today, meal, selected);
                      }}
                      className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                    />
                    {savingKey === key && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    {phase === "upcoming"
                      ? `Window opens at ${fmtTime(win)} — you can rate this meal then.`
                      : `Window closed at ${fmtTime(winEnd)} — this meal can no longer be rated.`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Today's saved reviews */}
        {!error && reviews.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Your reviews today</h3>
            <div className="space-y-2">
              {reviews
                .filter((r) => r.review_date === today)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {MEAL_LABEL[r.meal_type]}
                        {r.comment ? <span className="ml-2 font-normal text-[var(--text-muted)]">{r.comment}</span> : null}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Rated {SATISFACTION_LEVELS.find((s) => s.value === r.satisfaction)?.label ?? r.satisfaction}
                        {r.edit_count ? ` · edited ${r.edit_count}×` : ""}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && !error && reviews.filter((r) => r.review_date === today).length === 0 && (
          <EmptyState
            title="No reviews yet"
            description="Rate a meal above as soon as its serving window is open."
            icon={<UtensilsCrossed className="h-8 w-8" />}
          />
        )}
      </div>
    </WidgetBoundary>
  );
}
