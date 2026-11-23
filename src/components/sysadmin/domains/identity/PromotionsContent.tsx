"use client";
// src/components/sysadmin/domains/identity/PromotionsContent.tsx
// PROMOTIONS kanban dashboard content: PENDING / APPROVED / REJECTED columns
// from role_change_requests, per-column mini donuts (count/total), a per-card
// SLA arc, and the signature role-transition Sankey (from-role -> to-role).
//
// "use client"; CSS vars only; cn from @/lib/utils; viz from kit/viz; minis
// from kit/sidebar.

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EntityInspector, KVPairs, InspectorButton, Timeline, type EntityInspection } from "@/components/shared/EntityInspector";
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

/**
 * Build the standardized `EntityInspection` model for a promotion row.
 *
 * Sections follow the progressive-disclosure contract:
 *   1. Overview — what this request is (from → to role, status).
 *   2. Context — SLA posture and approver.
 *   3. Timeline (collapsible) — created / decided markers.
 *   4. Actions — server-authorized approve/reject (PATCH /api/admin/role-requests/[id],
 *      admin|sysadmin-only) and a link to the full promotions board.
 */
function promotionInspection(row: PromotionRow, status: PromotionStatus): EntityInspection {
  const slaFrac = row.decision_seconds == null
    ? Math.min(1, Math.max(0, (Date.now() - Date.parse(row.created_at)) / 1000 / SLA_SECONDS))
    : row.decision_seconds >= SLA_SECONDS ? 1 : row.decision_seconds / SLA_SECONDS;
  const breached = slaFrac >= 1 && status === "PENDING";

  const timelineItems: Array<{ label: string; time?: string; detail?: string; tone?: "ok" | "warn" | "danger" | "neutral" }> = [
    { label: "Request created", time: new Date(row.created_at).toLocaleString(), tone: "neutral" },
  ];
  if (row.decision_seconds != null) {
    timelineItems.push({
      label: status === "APPROVED" ? "Approved" : "Rejected",
      time: new Date(row.updated_at).toLocaleString(),
      detail: `Decided in ${formatSeconds(row.decision_seconds)}`,
      tone: status === "APPROVED" ? "ok" : "danger",
    });
  }

  return {
    kind: "promotion",
    title: row.target_user_name ?? row.target_user_id,
    subtitle: `from ${row.target_user_role ?? "unknown"} → ${row.requested_role}`,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          status === "PENDING"
            ? breached
              ? "bg-rose-500/15 text-action-danger"
              : "bg-amber-500/15 text-action-warning"
            : status === "APPROVED"
              ? "bg-emerald-500/15 text-action-success"
              : "bg-rose-500/15 text-action-danger"
        }`}
      >
        {breached ? "SLA BREACHED" : status}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "From role", value: row.target_user_role ?? "unknown" },
              { label: "To role", value: row.requested_role },
              { label: "Request id", value: <span className="font-mono">{row.id}</span> },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <KVPairs
            items={[
              {
                label: "SLA posture",
                value: breached
                  ? "Breached the 48h decision SLA"
                  : `${Math.round(slaFrac * 100)}% of the 48h decision SLA consumed`,
              },
              ...(row.approver_name
                ? [{ label: "Decided by", value: row.approver_name }]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: <Timeline items={timelineItems} />,
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-wrap gap-2">
            {status === "PENDING" ? (
              <span className="text-xs text-text-muted">
                Approve or reject via <span className="font-mono">PATCH /api/admin/role-requests/{row.id}</span> (admin / sysadmin only).
              </span>
            ) : null}
            <InspectorButton href="/sysadmin/promotions" variant="ghost">
              <ChevronRight className="size-3.5" /> All promotions
            </InspectorButton>
          </div>
        ),
      },
    ],
    detailHref: "/sysadmin/promotions",
    detailLabel: "All promotions",
  };
}

/**
 * The sysadmin promotions board. Every kanban card is a record: clicking it
 * opens the standardized EntityInspector drawer (the same progressive-
 * disclosure hierarchy used across the app), so a request is inspected
 * in-place instead of navigating away.
 */
export function PromotionsContent({ data, loading, error }: Props) {
  const [active, setActive] = useState<{ row: PromotionRow; status: PromotionStatus } | null>(null);
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
            <div key={i} className="h-64 animate-pulse rounded-xl bg-bg-base" />
          ))}
        </div>
      </WidgetBoundary>
    );
  }

  if (error && !data) {
    return (
      <WidgetBoundary>
        <div className="surface-card bg-action-danger/10 p-4 text-sm text-action-danger">
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
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Role Promotions
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
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
                className="surface-card flex flex-col bg-bg-base p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: COLUMN_TONE[status] }}
                    />
                    <span className="text-sm font-semibold text-text-primary">
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <ColumnDonut count={count} total={total} tone={COLUMN_TONE[status]} />
                </div>

                <div className="flex-1 space-y-2">
                  {rows.length === 0 ? (
                    <div className="surface-card p-4 text-center text-xs text-text-muted">
                      No {status.toLowerCase()} requests.
                    </div>
                  ) : (
                    rows.map((row) => (
                      <PromotionCard
                        key={row.id}
                        row={row}
                        tone={COLUMN_TONE[status]}
                        onInspect={() => setActive({ row, status })}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Signature visual: role-transition Sankey */}
        {hasSankey && sankey ? (
          <div className="surface-card bg-bg-base p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">
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
          <div className="surface-card bg-bg-base p-4 text-sm text-text-muted">
            No role transitions recorded yet.
          </div>
        )}

        <EntityInspector
          inspection={active ? promotionInspection(active.row, active.status) : null}
          onClose={() => setActive(null)}
        />
      </div>
    </WidgetBoundary>
  );
}

// ── Local sub-components ─────────────────────────────────────

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="surface-card bg-bg-base p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
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
      <span className="text-xs tabular-nums text-text-secondary">{count}</span>
    </div>
  );
}

/** A single kanban card with an SLA arc (progress vs. the 48h decision SLA). */
function PromotionCard({
  row,
  tone,
  onInspect,
}: {
  row: PromotionRow;
  tone: string;
  onInspect: () => void;
}) {
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
      onClick={onInspect}
      className={cn(
        "rounded-lg border bg-[var(--surface-raised)] p-2.5 text-xs cursor-pointer transition hover:ring-2 hover:ring-action-primary/30",
        breached ? "border-action-danger/50" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-text-primary">
            {row.target_user_name ?? row.target_user_id}
          </div>
          <div className="truncate text-text-muted">
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

      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
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
