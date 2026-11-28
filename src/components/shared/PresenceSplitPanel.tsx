"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Users, TimerOff, HelpCircle } from "lucide-react";

interface SplitRow {
  key: string;
  label: string;
  inside: number;
  outside: number;
  unknown: number;
  total: number;
}
interface PresenceResponse {
  success: boolean;
  data: {
    byBranch: SplitRow[];
    byHostelBlock: SplitRow[];
    totals: { inside: number; outside: number; unknown: number; total: number };
    generated_at: string;
  };
}

/**
 * PresenceSplitPanel — live Inside vs. Outside headcount split for the
 * supervisory / executive dashboards, by branch and hostel block. Real
 * data via GET /api/admin/presence (campus_occupancy presence). Empty /
 * unknown states are shown explicitly — never fabricated.
 */
export function PresenceSplitPanel({ compact = false }: { compact?: boolean }) {
  const { data, loading, refresh } = useApiResource<PresenceResponse>(
    "/api/admin/presence",
    { ttlMs: 30_000 },
  );

  // The API returns { success, data: { byBranch, byHostelBlock, totals, ... } }
  // (withApiChain convention). The hook yields the full envelope; guard the
  // nested access so an error envelope or a missing payload renders the
  // explicit empty state instead of crashing the page.
  const payload = data?.data;
  const totals = payload?.totals;
  const byBranch = payload?.byBranch ?? [];
  const byHostelBlock = payload?.byHostelBlock ?? [];
  const generatedAt = payload?.generated_at;

  return (
    <WidgetBoundary title="Campus Presence — Inside vs. Outside">
      <div className="space-y-4">
        {/* Grand totals */}
        <div className="grid grid-cols-3 gap-2">
          <TotalCell icon={Users} label="Inside" value={totals?.inside} tone="ok" />
          <TotalCell icon={TimerOff} label="Outside" value={totals?.outside} tone="warn" />
          <TotalCell icon={HelpCircle} label="Unknown" value={totals?.unknown} tone="muted" />
        </div>

        {loading && !data && (
          <p className="text-xs text-text-muted">Loading live presence…</p>
        )}

        {data && byBranch.length === 0 && byHostelBlock.length === 0 && (
          <p className="text-xs text-text-muted">
            No presence data is available yet.
          </p>
        )}

        {payload && (
          <>
            {/* By branch */}
            {byBranch.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  By branch
                </h4>
                <div className="space-y-1.5">
                  {byBranch.map((r) => (
                    <SplitBar key={r.key} row={r} compact={compact} />
                  ))}
                </div>
              </div>
            )}

            {/* By hostel block */}
            {byHostelBlock.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  By hostel block
                </h4>
                <div className="space-y-1.5">
                  {byHostelBlock.map((r) => (
                    <SplitBar key={r.key} row={r} compact={compact} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-text-muted">
              <span>{generatedAt ? `Live · ${new Date(generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Live"}</span>
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-action-primary hover:underline"
              >
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}

function TotalCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | undefined;
  tone: "ok" | "warn" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "text-action-success"
      : tone === "warn"
        ? "text-action-warning"
        : "text-text-muted";
  return (
    <div className="rounded-lg border border-border/60 bg-bg-surface/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <Icon className={"size-3.5 " + cls} aria-hidden />
        {label}
      </div>
      <p className={"mt-1 text-xl font-semibold tabular-nums " + cls}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function SplitBar({ row, compact }: { row: SplitRow; compact: boolean }) {
  const pct = (n: number) => (row.total > 0 ? (n / row.total) * 100 : 0);
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">{row.label}</span>
        <span className="text-text-muted tabular-nums">
          <span className="text-action-success">{row.inside}</span>
          {" / "}
          <span className="text-action-warning">{row.outside}</span>
          {row.unknown > 0 && <span> / {row.unknown}? </span>}
          {compact ? "" : ` (of ${row.total})`}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-bg-elevated">
        <div className="bg-action-success" style={{ width: `${pct(row.inside)}%` }} />
        <div className="bg-action-warning" style={{ width: `${pct(row.outside)}%` }} />
        <div className="bg-text-muted/20" style={{ width: `${pct(row.unknown)}%` }} />
      </div>
    </div>
  );
}
