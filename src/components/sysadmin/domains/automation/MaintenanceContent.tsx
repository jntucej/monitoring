// src/components/sysadmin/domains/automation/MaintenanceContent.tsx
"use client";

import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { MaintenanceData, MaintenanceEnvelope, MaintenanceEntity, MaintenanceGanttRow } from "./types";

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  scheduled: "var(--action-primary)",
  "ad-hoc": "var(--action-info)",
  emergency: "var(--action-danger)",
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? "var(--text-muted)";
}

function statusLabel(status: string): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/** Build 30 day column headers (short labels). */
function dayLabels(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labels: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    labels.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
  return labels;
}

// ── Gantt row (CSS-grid) ──────────────────────────────────────────────────────

function GanttRow({ row, dayCount }: { row: MaintenanceGanttRow; dayCount: number }) {
  const cells: React.ReactNode[] = [];
  for (let day = 0; day < dayCount; day++) {
    const inRange = day >= row.dayStart && day <= row.dayEnd;
    cells.push(
      <div
        key={day}
        className={cn(
          "rounded-sm",
          inRange ? "opacity-80" : "opacity-0",
        )}
        style={{
          height: 14,
          background: inRange ? typeColor(row.type) : "transparent",
          marginLeft: day === row.dayStart ? 0 : 1,
          marginRight: day === row.dayEnd ? 0 : 0,
        }}
        title={
          inRange
            ? `${row.title} · ${statusLabel(row.status)} · ${typeColor(row.type)}`
            : undefined
        }
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 truncate text-xs text-[var(--text-primary)]" title={row.title}>
        {row.title}
      </span>
      <span
        className="w-14 shrink-0 text-[10px] text-[var(--text-muted)]"
      >
        {statusLabel(row.status)}
      </span>
      <div
        className="flex-1 grid gap-px"
        style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}
      >
        {cells}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function MaintenanceContent(
  _props?: {
    data?: MaintenanceData | null;
    onRowClick?: (entity: MaintenanceEntity) => void;
  },
) {
  const { data: externalData, onRowClick: _onRowClick } = _props ?? {};
  const { data: envelope, loading, error } = useDashboardData<MaintenanceEnvelope>(
    "/api/admin/maintenance/overview",
    { ttlMs: 180_000, pollMs: 60_000, enabled: externalData == null },
  );
  const maintenanceData: MaintenanceData | null = externalData ?? envelope?.data ?? null;

  if (loading && !maintenanceData) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--bg-surface)] opacity-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--action-danger)]/30 bg-[var(--action-danger)]/10 p-4 text-sm text-[var(--action-danger)]">
        Failed to load maintenance data: {error}
      </div>
    );
  }

  if (!maintenanceData) return null;

  const { kpis, gantt } = maintenanceData;
  const dayCount = 30;
  const labels = dayLabels();

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* scheduled */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Scheduled
          </p>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {kpis.scheduled}
          </span>
        </div>

        {/* in-progress */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            In Progress
          </p>
          <span
            className={cn(
              "text-lg font-semibold",
              kpis.inProgress > 0 ? "text-[var(--action-info)]" : "text-[var(--text-primary)]",
            )}
          >
            {kpis.inProgress}
          </span>
        </div>

        {/* next window countdown */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Next Window
          </p>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {kpis.nextWindowCountdown ?? "—"}
          </span>
        </div>

        {/* notifications sent */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Notifications
          </p>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {kpis.notificationsSent}
          </span>
        </div>
      </div>

      {/* Signature visual: 30-day Gantt */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            30-Day Maintenance Windows
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: TYPE_COLORS.scheduled }} />
              Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: TYPE_COLORS["ad-hoc"] }} />
              Ad-hoc
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: TYPE_COLORS.emergency }} />
              Emergency
            </span>
          </div>
        </div>

        {gantt.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No maintenance windows scheduled in the next 30 days.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">
              Windows are managed via the maintenance scheduler.
            </p>
          </div>
        ) : (
          <div>
            {/* Gantt rows */}
            <div className="space-y-1 mb-2">
              {gantt.map((row) => (
                <GanttRow key={row.id} row={row} dayCount={dayCount} />
              ))}
            </div>

            {/* Day labels */}
            <div
              className="grid gap-px text-[9px] text-[var(--text-muted)] pl-[152px]"
              style={{ gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}
            >
              {labels.map((lbl, i) =>
                i % 3 === 0 ? (
                  <div key={i} className="text-center truncate" title={labels[i]}>
                    {lbl}
                  </div>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
