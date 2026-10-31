"use client";
// src/components/sysadmin/domains/identity/PromotionsContent.tsx
// PROMOTIONS kanban dashboard content: PENDING / APPROVED / REJECTED columns
// from role_change_requests, per-column mini donuts (count/total), a per-card
// SLA arc, and the signature role-transition Sankey (from-role -> to-role).
//
// "use client"; CSS vars only; cn from @/lib/utils; viz from kit/viz; minis
// from kit/sidebar.

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Sankey } from "@/components/sysadmin/kit/viz";
import type {
  PromotionsData,
  PromotionRow,
  PromotionStatus,
} from "@/components/sysadmin/domains/identity/types";

interface Props {
  data: PromotionsData | null;
  loading?: boolean;
  error?: string | null;
}

/** Target decision SLA in seconds (48h). Drives the per-card arc coloring. */
const SLA_SECONDS = 48 * 3600;

const COLUMN_ORDER: PromotionStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const COLUMN_TONE: Record<PromotionStatus, string> = {
  PENDING: "var(--action-warning)",
  APPROVED: "var(--action-ok)",
  REJECTED: "var(--action-danger)",
};

export function PromotionsContent({ data, loading, error }: Props) {
  // Total across all columns for the per-column donuts.
  const total = useMemo(() => {
    if (!data) return 0;
    return COLUMN_ORDER.reduce((sum, s) => sum + (data.columns[s]?.length ?? 0), 0);
  }, [data]);

  // Sankey data comes pre-built server-side; fall back to empty when absent.
  const sankey = data?.sankey ?? null;
  const hasSankey =
    sankey != null && (sankey.source.length > 0 || sankey.links.length > 0);

  if (loading && !data) {
    return (
      <WidgetBoundary>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--surface-default)]" />
          ))}
        </div>
      </WidgetBoundary>
    );
  }

  if (error && !data) {
    return (
      <WidgetBoundary>
        <div className="rounded-md border border-[var(--action-danger)] bg-[var(--action-danger)]/10 p-4 text-sm text-[var(--action-danger)]">
          Failed to load promotions: {error}
        </div>
      </WidgetBoundary>
    );
  }

  const d = data!;

  return (
    <WidgetBoundary>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Role Promotions
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Kanban view of role-change requests. Median decision time{" "}
            {d.median_time_to_decision_h > 0 ? formatHours(d.median_time_to_decision_h) : "n/a"}.
          </p>
        </div>

        {/* KPI row: pending / approved this month / rejected */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Kpi label="Pending" value={String(d.pending)} tone="var(--action-warning)" />
          <Kpi
            label="Approved this month"
            value={String(d.approved_this_month)}
            tone="var(--action-ok)"
          />
          <Kpi
            label="Rejected"
            value={String(d.rejected)}
            tone="var(--action-danger)"
          />
        </div>

        {/* Kanban board */}
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMN_ORDER.map((status) => {
            const rows = d.columns[status] ?? [];
            const count = rows.length;
            return (
              <div
                key={status}
                className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLUMN_TONE[status] }}
                    />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <ColumnDonut count={count} total={total} tone={COLUMN_TONE[status]} />
                </div>

                <div className="flex-1 space-y-2">
                  {rows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
                      No {status.toLowerCase()} requests.
                    </div>
                  ) : (
                    rows.map((row) => (
                      <PromotionCard key={row.id} row={row} tone={COLUMN_TONE[status]} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Signature visual: role-transition Sankey */}
        {hasSankey && sankey ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Role transitions (from-role → to-role)
            </h2>
            <Sankey
              source={sankey.source}
              target={sankey.target}
              links={sankey.links}
              height={Math.max(200, sankey.links.length * 48)}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4 text-sm text-[var(--text-muted)]">
            No role transitions recorded yet.
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

// ── Local sub-components ─────────────────────────────────────

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-default)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

/** Per-column mini donut: filled fraction = count/total of all promotions. */
function ColumnDonut({ count, total, tone }: { count: number; total: number; tone: string }) {
  const frac = total > 0 ? count / total : 0;
  const size = 28;
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - frac);
  return (
    <div className="flex items-center gap-1.5" title={`${count} of ${total}`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-xs tabular-nums text-[var(--text-secondary)]">{count}</span>
    </div>
  );
}

/** A single kanban card with an SLA arc (progress vs. the 48h decision SLA). */
function PromotionCard({ row, tone }: { row: PromotionRow; tone: string }) {
  const slaFrac = useMemo(() => {
    if (row.decision_seconds == null) {
      const created = Date.parse(row.created_at);
      if (Number.isNaN(created)) return 0;
      const elapsed = (Date.now() - created) / 1000;
      return Math.min(1, Math.max(0, elapsed / SLA_SECONDS));
    }
    return row.decision_seconds >= SLA_SECONDS ? 1 : row.decision_seconds / SLA_SECONDS;
  }, [row.decision_seconds, row.created_at]);

  const breached = slaFrac >= 1;
  const arcColor = breached ? "var(--action-danger)" : tone;
  const size = 22;
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - slaFrac);

  return (
    <div
      className={cn(
        "rounded-lg border bg-[var(--surface-raised)] p-2.5 text-xs",
        breached ? "border-[var(--action-danger)]/50" : "border-[var(--border)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-[var(--text-primary)]">
            {row.target_user_name ?? row.target_user_id}
          </div>
          <div className="truncate text-[var(--text-muted)]">
            {row.target_user_role ?? "unknown"} → {row.requested_role}
          </div>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          title={
            row.decision_seconds != null
              ? `Decided in ${formatSeconds(row.decision_seconds)}`
              : `Age ${Math.round(slaFrac * 100)}% of SLA`
          }
        >
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={2.5} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={arcColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          </svg>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>{new Date(row.created_at).toLocaleDateString()}</span>
        {row.approver_name && <span>by {row.approver_name}</span>}
      </div>
    </div>
  );
}

// ── Formatting helpers ───────────────────────────────────────

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(0)}m`;
  return `${(m / 60).toFixed(1)}h`;
}
