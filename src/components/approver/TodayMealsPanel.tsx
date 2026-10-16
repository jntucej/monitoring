"use client";

/**
 * TodayMealsPanel — the mess In-charge's "today's meals" side panel.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board feed).
 * Mobile: a full-width section below the board. No horizontal scroll.
 *
 * Reads today's service windows from GET /api/mess/days (the same feed the
 * board uses, so there is no second network request for the day rows) and
 * the declared/confirmed meal counts for the active day from
 * GET /api/mess/meal-counts. Each row shows the day name, its service window,
 * and a derived status: "active" when the window is open right now,
 * "upcoming" before it opens, "closed" after it has closed. When there is no
 * scheduled mess day, an EmptyState is shown.
 */

import { useMemo } from "react";
import { CalendarDays, Loader2, UtensilsCrossed } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";

/** A row as returned by /api/mess/days (see days/route.ts SELECT list). */
interface MessDayRow {
  id: string;
  mealDate: string;
  mealType: string;
  dayType: string;
  windowOpensAt: string | null;
  windowClosesAt: string | null;
  tokensLockedAt: string | null;
  tokensRevokedAt: string | null;
  isActive: boolean;
  itemCount: number;
  selections: number;
}

/** Response shape for /api/mess/days. */
interface MessDaysResponse {
  success: boolean;
  data: { days: MessDayRow[] };
}

/** Response shape for /api/mess/meal-counts. */
interface MealCountsResponse {
  success: boolean;
  data: {
    messDayId: string;
    mealDate: string;
    total: number;
    declaredPresent: number;
    veg: number;
    nonVeg: number;
    confirmed: number;
    noShows: number;
  };
}

type MealStatus = "upcoming" | "active" | "closed";

const STATUS_TONE: Record<MealStatus, string> = {
  upcoming: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  closed: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const STATUS_LABEL: Record<MealStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};

function dayName(mealDate: string): string {
  try {
    return new Date(`${mealDate}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return mealDate;
  }
}

function fmtWindow(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function mealStatus(row: MessDayRow, now: number): MealStatus {
  const opens = row.windowOpensAt ? new Date(row.windowOpensAt).getTime() : null;
  const closes = row.windowClosesAt ? new Date(row.windowClosesAt).getTime() : null;
  if (closes !== null && now > closes) return "closed";
  if (opens !== null && now < opens) return "upcoming";
  // Active: within the window (or no explicit closes).
  return row.isActive ? "active" : "upcoming";
}

export function TodayMealsPanel() {
  const { data: daysData, loading: daysLoading } = useApiResource<MessDaysResponse>(
    "/api/mess/days",
    { ttlMs: 15_000 }
  );

  const days = useMemo<MessDayRow[]>(
    () => (daysData?.data?.days ?? []).slice(0, 7),
    [daysData]
  );

  // The active day is the newest scheduled day (the feed is sorted
  // meal_date DESC). Use it to pull the meal counts for today's service.
  const activeDayId = useMemo(
    () =>
      days.length > 0 && days[0].isActive ? days[0].id : null,
    [days]
  );

  const { data: countsData, loading: countsLoading } = useApiResource<MealCountsResponse>(
    activeDayId ? `/api/mess/meal-counts?dayId=${encodeURIComponent(activeDayId)}` : "/api/mess/meal-counts",
    { ttlMs: 15_000 }
  );

  const now = Date.now();
  const visible = days.length > 0 ? days : [];

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
          Today&apos;s Meals
        </span>
      </div>

      {daysLoading || countsLoading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px]">Loading today&apos;s service…</span>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No mess days scheduled"
          description="There is no published mess schedule to serve yet."
          icon={<CalendarDays className="w-5 h-5" />}
        />
      ) : (
        <ul className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1 mb-3">
          {visible.map((row) => {
            const status = mealStatus(row, now);
            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {dayName(row.mealDate)}
                    <span className="ml-1.5 font-mono text-[10px] font-normal text-[var(--text-muted)]">
                      {row.mealType}
                    </span>
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                    {fmtWindow(row.windowOpensAt)} – {fmtWindow(row.windowClosesAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${STATUS_TONE[status]}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {STATUS_LABEL[status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Today's serving counts (only when an active day has counts). */}
      {countsData?.data ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-2.5 py-1.5 min-w-0">
            <p className="text-[10px] text-[var(--text-muted)]">Declared present</p>
            <p className="text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
              {countsData.data.declaredPresent}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-2.5 py-1.5 min-w-0">
            <p className="text-[10px] text-[var(--text-muted)]">Confirmed served</p>
            <p className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
              {countsData.data.confirmed}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default TodayMealsPanel;
