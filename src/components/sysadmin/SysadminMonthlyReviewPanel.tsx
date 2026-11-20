"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  MessageSquare,
  Cpu,
  CheckCircle,
  XCircle,
  Minus,
  TrendingUp,
  TrendingDown,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { usePeriod } from "@/hooks/usePeriod";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders, cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface DomainRow {
  domain: string;
  count: number;
  lastMonth: number;
  delta: number;
  status: "ok" | "warn" | "fail";
}

interface ReviewPayload {
  data: {
    period: string;
    range: { from: string; to: string };
    domains: DomainRow[];
  };
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  alerts: AlertTriangle,
  incidents: XCircle,
  identity: Users,
  complaints: MessageSquare,
  gates: Cpu,
};

const DOMAIN_LABELS: Record<string, string> = {
  alerts: "Alerts",
  incidents: "Incidents",
  identity: "User Provisioning",
  complaints: "Complaints",
  gates: "Gate Events",
};

// ── Component ─────────────────────────────────────────────────────────────

export function SysadminMonthlyReviewPanel() {
  const { period, setPeriod } = usePeriod("this-month");
  const { exportCSV } = useExport();
  const [data, setData] = useState<ReviewPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sysadmin/domains/monthly-review?period=${period.key === "all-time" ? "this-month" : period.key}`,
        { headers: getAuthHeaders(), cache: "no-store" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [period.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.domains.map((d) => ({
        domain: DOMAIN_LABELS[d.domain] ?? d.domain,
        count: d.count,
        lastMonth: d.lastMonth,
        delta: d.delta,
        status: d.status,
      })),
      [
        { key: "domain", header: "Domain" },
        { key: "count", header: "Count" },
        { key: "lastMonth", header: "Last Month" },
        { key: "delta", header: "Delta" },
        { key: "status", header: "Status" },
      ],
      `sysadmin_review_${data.period.replace(/\s/g, "_")}.csv`
    );
  };

  return (
    <WidgetBoundary name="SysadminMonthlyReviewPanel" resetKey={period.key}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Domain Review</h2>
              <p className="text-xs text-text-muted">Monthly summary across sysadmin domains</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="surface-card inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-surface"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <PeriodPicker value={period} onChange={setPeriod} allowCustom={false} />

        {/* Loading */}
        {loading && !data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600">
            <AlertTriangle className="h-4 w-4 inline mr-1" /> {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Data */}
        {data && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.domains.map((d) => {
              const Icon = DOMAIN_ICONS[d.domain] ?? Shield;
              const statusIcon =
                d.status === "ok" ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : d.status === "warn" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-500" />
                );

              return (
                <div
                  key={d.domain}
                  className={cn(
                    "rounded-xl border p-4 space-y-2",
                    d.status === "ok"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : d.status === "warn"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-rose-500/20 bg-rose-500/5"
                  )}
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-text-muted" />
                      <span className="text-xs font-medium text-text-secondary">
                        {DOMAIN_LABELS[d.domain] ?? d.domain}
                      </span>
                    </div>
                    {statusIcon}
                  </div>

                  {/* Count */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-text-primary tabular-nums">{d.count}</span>
                    {d.lastMonth > 0 && (
                      <DeltaBadge
                        value={d.count}
                        reference={d.lastMonth}
                        label=""
                        higherIsBetter={d.domain !== "complaints" && d.domain !== "incidents" && d.domain !== "gates"}
                      />
                    )}
                  </div>

                  {/* Delta detail */}
                  {d.delta !== 0 && (
                    <p className={cn("text-xs tabular-nums", d.delta > 0 ? "text-rose-500" : "text-emerald-500")}>
                      {d.delta > 0 ? "+" : ""}{d.delta} vs last month
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default SysadminMonthlyReviewPanel;
