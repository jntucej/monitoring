"use client";

/**
 * Achievements — badge grid of earned vs available achievements.
 * Earned-only (a user's own unlocked badges); no public attendance
 * rankings. Data comes from /api/campus/achievements.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Lock,
  Trophy,
  Footprints,
  Sunrise,
  CalendarDays,
  Target,
  Loader2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface EarnedItem {
  code: string;
  title: string;
  description: string;
  icon: string | null;
  tier: string;
  earnedAt: string;
}

interface AvailableItem {
  code: string;
  title: string;
  description: string;
  icon: string | null;
  tier: string;
  earned: boolean;
}

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  silver: "bg-slate-400/15 text-slate-300 border-slate-400/30",
  gold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const ICONS: Record<string, typeof Trophy> = {
  footprints: Footprints,
  sunrise: Sunrise,
  calendar: CalendarDays,
  target: Target,
  trophy: Trophy,
};

function AchievementIcon({ icon, earned, tier }: { icon: string | null; earned: boolean; tier: string }) {
  const Icon = icon ? ICONS[icon] ?? Award : Award;
  const cls = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
        earned ? cls : "border-[var(--border)] bg-[var(--bg-raised)]/40 text-[var(--text-muted)] opacity-50"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </div>
  );
}

export function Achievements() {
  const [earned, setEarned] = useState<EarnedItem[]>([]);
  const [available, setAvailable] = useState<AvailableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/achievements", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load achievements");
      }
      setEarned(json.data.earned ?? []);
      setAvailable(json.data.available ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load achievements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <WidgetBoundary title="Achievements">
      <section aria-label="Achievements" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Award className="h-4 w-4 text-emerald-400" aria-hidden />
            Achievements
          </h2>
          {loading ? (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
              Loading…
            </span>
          ) : (
            <span className="rounded-full bg-[var(--bg-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              {earned.length} / {available.length} unlocked
            </span>
          )}
        </div>

        {error && !loading ? (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
        ) : available.length === 0 && !loading ? (
          <p className="mt-5 text-sm text-[var(--text-muted)]">
            No achievements are available right now.
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Achievement badges">
            {available.map((item) => {
              const earnedItem = item.earned
                ? earned.find((e) => e.code === item.code)
                : undefined;
              return (
                <li
                  key={item.code}
                  aria-label={`${item.title} — ${item.earned ? "unlocked" : "locked"}`}
                  className={`rounded-xl border p-3.5 ${
                    item.earned
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-[var(--border)] bg-[var(--bg-raised)]/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AchievementIcon icon={item.icon} earned={item.earned} tier={item.tier} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-semibold ${
                          item.earned ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">
                        {item.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                        <span>{item.tier}</span>
                        {item.earned ? (
                          <span className="text-emerald-400">
                            · {earnedItem ? new Date(earnedItem.earnedAt).toLocaleDateString() : "earned"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" aria-hidden />
                            locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </WidgetBoundary>
  );
}
