"use client";

/**
 * MyWorkPanel — the worker console's main-column panel.
 *
 * Desktop: right-side panel rendered by RoleConsole alongside the digest
 * board. Mobile: full-width, no horizontal scroll.
 *
 * Reads GET /api/workers/my-work, which returns
 *   { success, data: { tasks, completedLastWeek, todayShift } }
 * where `tasks` is a flat array of the caller's open work orders
 * (permission_requests scoped to the caller's user id, status=PENDING,
 * last 30 days) and `todayShift` is a single-row shift snapshot.
 *
 * The panel lists the caller's work items: ticket, status, created-at
 * ("due"), and the last-update proxy (todayShift.checkIn / the newest
 * task createdAt). EmptyState when there are no open tasks.
 */

import { useMemo } from "react";
import { ClipboardList, Loader2, Inbox } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

/** A single open work-order row from /api/workers/my-work data.tasks. */
interface WorkTaskRow {
  id: string;
  ticket?: string;
  type?: string;
  stage?: string;
  status?: string;
  createdAt?: string;
}

interface MyWorkResponse {
  success: boolean;
  data: {
    tasks?: WorkTaskRow[];
    completedLastWeek?: number;
    todayShift?: { checkIn?: string | null; checkOut?: string | null; scans?: number } | null;
  };
}

const fmt = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

export function MyWorkPanel() {
  const { data, loading } = useApiResource<MyWorkResponse>("/api/workers/my-work", {
    ttlMs: 30_000,
  });

  const tasks = useMemo<WorkTaskRow[]>(
    () => (Array.isArray(data?.data?.tasks) ? data!.data!.tasks! : []),
    [data],
  );

  // "Last update" proxy: the newest of today's shift check-in and the
  // most recently created open task. The endpoint exposes no explicit
  // updated_at per task, so the newest createdAt is the best available.
  const lastUpdate = useMemo(() => {
    const candidates: string[] = [];
    if (data?.data?.todayShift?.checkIn) candidates.push(data.data.todayShift.checkIn);
    for (const t of tasks) if (t.createdAt) candidates.push(t.createdAt);
    if (candidates.length === 0) return null;
    let newest = candidates[0];
    for (const c of candidates) {
      if (new Date(c).getTime() > new Date(newest).getTime()) newest = c;
    }
    return newest;
  }, [tasks, data]);

  return (
    <WidgetBoundary title="My Work">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-4 h-4 text-[var(--action-primary)] shrink-0" />
            <span className="text-sm font-bold text-[var(--text-primary)] truncate">
              My Work Items
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border text-[var(--text-secondary)] bg-[var(--bg-base)] border-[var(--border)] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--action-primary)]" />
            {tasks.length} open
          </span>
        </div>

        {/* Body */}
        {loading && !data ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading work items…
          </div>
        ) : tasks.length > 0 ? (
          <ul className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 min-w-0">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 min-w-0"
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-xs font-mono font-semibold text-[var(--text-primary)] truncate">
                    {t.ticket || t.id}
                  </p>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 uppercase">
                    {t.status ?? "PENDING"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 min-w-0 mt-1">
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {t.type ? `${t.type} · ` : ""}
                    stage: {t.stage ?? "—"}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                    due {fmt(t.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No open work items"
            description="Your open maintenance work orders will appear here when assigned."
            icon={<Inbox className="w-6 h-6 text-[var(--text-muted)]" />}
          />
        )}

        {/* Footer: last update */}
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2 min-w-0">
          <span className="text-[11px] text-[var(--text-muted)] truncate">
            {data?.data?.completedLastWeek
              ? `${data.data.completedLastWeek} completed last week`
              : "No recent completions"}
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
            last update {fmt(lastUpdate)}
          </span>
        </div>
      </section>
    </WidgetBoundary>
  );
}

export default MyWorkPanel;
