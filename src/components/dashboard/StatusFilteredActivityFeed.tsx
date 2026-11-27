"use client";

/**
 * StatusFilteredActivityFeed — a status-filtered activity/job feed
 * (All / Running / Completed / Failed). Client-side filter over a real
 * activity list passed in by the parent (the parent fetches from a live
 * endpoint; this component never fabricates rows). Each row is clickable
 * via `onInspect` (routes into a page's single inspector). An empty result
 * for a filter shows an explicit "no matching records" state.
 *
 * Board 3 (AI Command Center / DevOps): the `all`/`running`/`completed`/
 * `failed` log filter the blueprint calls for, backed by real alerts /
 * job-run / audit data instead of a Math.random() pulse.
 */
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export type LogStatusFilter = "all" | "running" | "completed" | "failed";
export type ActivityStatus = Exclude<LogStatusFilter, "all">;

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  status: ActivityStatus;
  at?: string; // ISO timestamp
}

const FILTERS: Array<{ key: LogStatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
];

const STATUS_TONE: Record<ActivityStatus, string> = {
  running: "text-action-info",
  completed: "text-action-success",
  failed: "text-action-danger",
};

interface Props {
  items: ActivityItem[];
  onInspect?: (item: ActivityItem) => void;
  title?: string;
  className?: string;
}

export function StatusFilteredActivityFeed({ items, onInspect, title, className }: Props) {
  const [filter, setFilter] = useState<LogStatusFilter>("all");

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  return (
    <div className={cn("min-w-0", className)}>
      {title && <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">{title}</h3>}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-bg-surface text-text-primary ring-1 ring-border"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-text-muted min-h-12">
          <Activity className="w-4 h-4" /> No {filter === "all" ? "" : filter + " "}activity records.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onInspect?.(row)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg-elevated/40 px-3 py-2 text-left text-xs hover:bg-bg-elev-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                aria-label={row.title}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-text-primary">{row.title}</div>
                  <div className="truncate text-[11px] text-text-muted">
                    {row.detail}
                    {row.at ? ` · ${row.at}` : ""}
                  </div>
                </div>
                <span className={cn("shrink-0 font-medium capitalize", STATUS_TONE[row.status])}>
                  {row.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
