/**
 * Period types and helpers — the single source of truth for date-range semantics
 * used by every dashboard. Pass a `Period` to any query builder or API call.
 */

export type PeriodKey =
  | "today"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "all-time"
  | "custom";

export interface Period {
  key: PeriodKey;
  from: string; // ISO date
  to: string; // ISO date
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeek(d: Date): Date {
  const x = endOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 0 : 7 - day; // Sunday end
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function endOfMonth(d: Date): Date {
  const x = endOfDay(d);
  x.setMonth(x.getMonth() + 1, 0);
  return x;
}

export function getPeriod(key: PeriodKey, now = new Date()): Period {
  switch (key) {
    case "today":
      return { key, from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString(), label: "Today" };
    case "this-week":
      return { key, from: startOfWeek(now).toISOString(), to: endOfWeek(now).toISOString(), label: "This week" };
    case "last-week": {
      const lw = new Date(now);
      lw.setDate(lw.getDate() - 7);
      const start = startOfWeek(lw);
      const end = endOfWeek(lw);
      return { key, from: start.toISOString(), to: end.toISOString(), label: "Last week" };
    }
    case "this-month":
      return { key, from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString(), label: "This month" };
    case "last-month": {
      const lm = new Date(now);
      lm.setMonth(lm.getMonth() - 1);
      return {
        key,
        from: startOfMonth(lm).toISOString(),
        to: endOfMonth(lm).toISOString(),
        label: "Last month",
      };
    }
    case "all-time":
      return { key, from: "1970-01-01T00:00:00.000Z", to: endOfDay(now).toISOString(), label: "All time" };
    case "custom":
      return { key, from: now.toISOString(), to: now.toISOString(), label: "Custom" };
  }
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "last-week", label: "Last week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "all-time", label: "All time" },
];

export function inPeriod(timestamp: string | Date, period: Period): boolean {
  const t = new Date(timestamp).getTime();
  const from = new Date(period.from).getTime();
  const to = new Date(period.to).getTime();
  return t >= from && t <= to;
}

export function formatPeriodRange(period: Period): string {
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(period.from)} – ${fmt(period.to)}`;
}
