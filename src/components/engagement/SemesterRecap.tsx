"use client";

/**
 * Semester Recap — a shareable-looking recap card aggregating the user's
 * completed events, earned achievements and completed goals from
 * /api/campus/recap. Sharing is optional (copy-to-clipboard only) and
 * the payload deliberately excludes any sensitive movement, attendance
 * or disciplinary data.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  CheckCircle2,
  CalendarDays,
  Award,
  Target,
  Loader2,
  Share2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface RecapData {
  userName: string;
  role: string;
  periodLabel: string;
  completedEvents: string[];
  earnedAchievements: Array<{ code: string; title: string; icon: string | null }>;
  completedGoals: number;
  totalGoals: number;
  eventsRegistered: number;
}

function buildShareText(r: RecapData): string {
  const lines: string[] = [];
  lines.push(`🎓 ${r.periodLabel} — ${r.userName} (${r.role})`);
  lines.push("");
  if (r.completedEvents.length > 0) {
    lines.push(`📅 Events attended (${r.completedEvents.length}):`);
    for (const ev of r.completedEvents.slice(0, 8)) {
      lines.push(`  • ${ev}`);
    }
  } else {
    lines.push(`📅 Events registered: ${r.eventsRegistered}`);
  }
  if (r.earnedAchievements.length > 0) {
    lines.push(`🏆 Achievements earned (${r.earnedAchievements.length}):`);
    for (const a of r.earnedAchievements.slice(0, 8)) {
      lines.push(`  • ${a.title}`);
    }
  }
  lines.push(`✅ Goals completed: ${r.completedGoals}/${r.totalGoals}`);
  lines.push("");
  lines.push("No attendance, movement or disciplinary details included.");
  return lines.join("\n");
}

export function SemesterRecap() {
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/recap", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load recap");
      }
      setData(json.data as RecapData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleShare() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildShareText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
    }
  }

  const shareable =
    (data?.completedEvents.length ?? 0) > 0 ||
    (data?.earnedAchievements.length ?? 0) > 0 ||
    (data?.completedGoals ?? 0) > 0 ||
    (data?.eventsRegistered ?? 0) > 0;

  return (
    <WidgetBoundary title="Semester Recap">
      <section
        aria-label="Semester recap"
        className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-[var(--bg-surface)] to-violet-500/10 p-5 min-w-0"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {data?.periodLabel ?? "Semester Recap"}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                Your highlight card — no sensitive details included
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/25 motion-safe:transition-colors motion-reduce:transition-none disabled:opacity-50"
          >
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            ) : (
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Share"}
          </button>
        </div>

        {loading && !data ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Building your recap…
          </div>
        ) : error && !data ? (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : data ? (
          <>
            <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">
              {data.userName}
              <span className="ml-2 rounded-full bg-[var(--bg-raised)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {data.role}
              </span>
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <CalendarDays className="mx-auto h-4 w-4 text-sky-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">{data.eventsRegistered}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Events joined
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <Award className="mx-auto h-4 w-4 text-amber-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {data.earnedAchievements.length}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Badges earned
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-3 text-center">
                <Target className="mx-auto h-4 w-4 text-violet-400" aria-hidden />
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {data.completedGoals}/{data.totalGoals}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  Goals done
                </p>
              </div>
            </div>

            {(data.completedEvents.length > 0 || data.earnedAchievements.length > 0) && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.completedEvents.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Events
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-primary)]">
                      {data.completedEvents.slice(0, 5).map((ev) => (
                        <li key={ev} className="truncate">
                          • {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.earnedAchievements.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Badges
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-[var(--text-primary)]">
                      {data.earnedAchievements.slice(0, 5).map((a) => (
                        <li key={a.code} className="truncate">
                          🏆 {a.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!shareable && (
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Nothing to share yet — register for an event, set a goal or earn a
                badge to light up your recap.
              </p>
            )}
          </>
        ) : null}
      </section>
    </WidgetBoundary>
  );
}
