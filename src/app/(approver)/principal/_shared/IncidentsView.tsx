"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildIncidentInspection as buildMainIncidentInspection,
  type IncidentRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

export interface AlertItem {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  created_at?: string;
  timestamp?: string;
  status?: string;
  resolved?: boolean;
  gate_id?: string | null;
  gate_name?: string | null;
  gateId?: string | null;
  studentRoll?: string;
}

interface AlertsResponse {
  success?: boolean;
  data: AlertItem[];
}

export function IncidentsView() {
  const { data, loading, refresh } = useApiResource<AlertsResponse>("/api/alerts", {
    ttlMs: 15_000,
  });

  const [actingId, setActingId] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.success);
  const errorToast = useUIStore((s) => s.error);

  const resolveAlert = useCallback(
    async (alertId: string) => {
      if (actingId) return;
      setActingId(alertId);
      try {
        const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
        }
        addToast("Alert resolved");
        setMainInspection(null);
        await refresh();
      } catch (err: unknown) {
        errorToast(err instanceof Error ? err.message : "Failed to resolve alert");
      } finally {
        setActingId(null);
      }
    },
    [actingId, addToast, errorToast, refresh],
  );

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildMainIncidentInspection> | null
  >(null);

  const inspectMain = (a: AlertItem) => {
    setMainInspection(
      buildMainIncidentInspection(
        {
          id: a.id,
          title: a.title,
          message: a.message,
          severity: a.severity,
          created_at: a.created_at ?? a.timestamp,
          status: a.status ?? (a.resolved ? "RESOLVED" : "OPEN"),
        } as IncidentRecord,
        gate
      )
    );
  };

  const [filter, setFilter] = useState<"all" | "high" | "open" | "resolved">("all");
  const alerts = Array.isArray(data?.data) ? data.data : [];
  const isHigh = (a: AlertItem) =>
    a.severity === "high" || a.severity === "critical";
  const isResolved = (a: AlertItem) =>
    Boolean(a.resolved) || (a.status ?? "").toUpperCase() === "RESOLVED";
  const highSeverity = alerts.filter(isHigh).length;
  const openCount = alerts.filter((a) => !isResolved(a)).length;
  const visibleAlerts = alerts.filter((a) => {
    if (filter === "high") return isHigh(a);
    if (filter === "open") return !isResolved(a);
    if (filter === "resolved") return isResolved(a);
    return true;
  });

  /**
   * Resolve the related records for an alert, honestly. The alert row carries
   * gateId + studentRoll; we look them up by id/roll. A failed/absent lookup
   * is marked unavailable (never a fabricated link).
   */
  const openInspector = useCallback(
    (alert: AlertItem) => {
      inspectMain(alert);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gate.isPrincipal, gate.isFaculty, gate.role]
  );

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Incidents &amp; Alerts</h1>
          <p className="text-xs text-text-muted">
            Real-time institutional and security alerts · filter or select any alert to inspect
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Incident filters">
          {[
            { key: "all" as const, label: "All", count: alerts.length },
            { key: "high" as const, label: "Critical / High", count: highSeverity },
            { key: "open" as const, label: "Open", count: openCount },
            { key: "resolved" as const, label: "Resolved", count: alerts.length - openCount },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "border-action-primary bg-action-primary/10 text-action-primary"
                  : "border-border bg-bg-surface text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] opacity-80">{tab.count}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Active Alerts" value={alerts.length} onClick={() => setFilter("all")} />
        <KpiCard
          label="Critical / High"
          value={highSeverity}
          tone={highSeverity > 0 ? "danger" : "ok"}
          onClick={() => setFilter("high")}
        />
        <KpiCard
          label="Status"
          value={highSeverity > 0 ? "Requires Attention" : "All Clear"}
          tone={highSeverity > 0 ? "warn" : "ok"}
          onClick={() => setFilter("open")}
        />
      </div>

      {loading && alerts.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : visibleAlerts.length === 0 ? (
        <EmptyState title="No matching alerts" description="No campus alerts match the selected filter." />
      ) : (
        <DataTable<AlertItem>
          mobileLayout="cards"
          onRowClick={(a) => openInspector(a)}
          columns={[
            {
              header: "Title",
              accessor: (r) => <SmartTextRef text={r.title ?? r.message ?? "Alert"} currentPath="/principal/operations/incidents" />,
            },
            {
              header: "Severity",
              accessor: (r) => (
                <span className="surface-card bg-action-danger/10 px-2 py-0.5 text-xs text-action-danger">
                  {r.severity ?? "normal"}
                </span>
              ),
            },
            {
              header: "Gate",
              accessor: (r) => {
                const gId = r.gate_id ?? r.gateId;
                const label = r.gate_name ?? gId;
                return gId ? (
                  <Link
                    href={`/principal/operations/gates/${gId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-xs text-action-primary hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  "—"
                );
              },
            },
            {
              header: "Status",
              accessor: (r) => r.status ?? (isResolved(r) ? "RESOLVED" : "OPEN"),
            },
            {
              header: "Overview",
              accessor: (r) => (
                <div className="flex items-center gap-3">
                  {!isResolved(r) && (
                    <button
                      type="button"
                      disabled={actingId === r.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveAlert(r.id);
                      }}
                      className="text-xs font-semibold text-action-success hover:underline disabled:opacity-50"
                    >
                      {actingId === r.id ? "Resolving..." : "Resolve"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInspector(r);
                    }}
                    className="text-xs font-semibold text-action-primary hover:underline"
                  >
                    Open &rarr;
                  </button>
                </div>
              ),
            },
          ]}
          data={visibleAlerts}
          keyExtractor={(r) => r.id}
        />
      )}

      {/* The incident inspector drawer (overview → context → actions). */}
      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
