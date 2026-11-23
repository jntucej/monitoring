"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  useEntityInspector,
  EntityInspectorPanel,
} from "@/components/shared/useEntityInspector";
import {
  buildIncidentInspection,
  type AlertRecord,
  type RelatedRecord,
  type IncidentActions,
} from "@/lib/principal/incidentInspection";

interface AlertsResponse {
  success?: boolean;
  data: AlertRecord[];
}

export function IncidentsView() {
  const { data, loading, refresh } = useApiResource<AlertsResponse>("/api/alerts", {
    ttlMs: 15_000,
  });

  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [acting, setActing] = useState(false);

  const alerts = Array.isArray(data?.data) ? data.data : [];
  const highSeverity = alerts.filter(
    (a) => a.severity === "high" || a.severity === "critical"
  ).length;

  /**
   * Resolve the related records for an alert, honestly. The alert row carries
   * gateId + studentRoll; we look them up by id/roll. A failed/absent lookup
   * is marked unavailable (never a fabricated link).
   */
  const openInspector = useCallback(
    async (alert: AlertRecord) => {
      const related: RelatedRecord[] = [];
      if (alert.gateId) {
        related.push({
          kind: "gate",
          id: alert.gateId,
          label: "Gate",
          subtitle: alert.gateId,
        });
      }
      if (alert.studentRoll) {
        related.push({
          kind: "student",
          id: alert.studentRoll,
          label: "Student",
          subtitle: alert.studentRoll,
        });
      }
      // Honest actions: acknowledge/resolve exist for unresolved alerts.
      const actions: IncidentActions = {
        acknowledge: {
          available: !alert.resolved,
          reason: alert.resolved ? "already resolved" : undefined,
        },
        resolve: {
          available: !alert.resolved,
          reason: alert.resolved ? "already resolved" : undefined,
        },
      };
      inspect(
        buildIncidentInspection({
          alert,
          related,
          actions,
          detailHref: undefined,
          detailLabel: undefined,
        })
      );
    },
    [inspect]
  );

  // Re-sync after an action so the register reflects the new state.
  const onActionComplete = useCallback(() => {
    setActing(false);
    closeInspection();
    refresh();
  }, [closeInspection, refresh]);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Incidents & Alerts</h1>
        <p className="text-xs text-text-muted">
          Real-time institutional and security alerts — select any alert to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Active Alerts" value={alerts.length} />
        <KpiCard
          label="Critical / High"
          value={highSeverity}
          tone={highSeverity > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Status"
          value={highSeverity > 0 ? "Requires Attention" : "All Clear"}
          tone={highSeverity > 0 ? "warn" : "ok"}
        />
      </div>

      {loading && alerts.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : alerts.length === 0 ? (
        <EmptyState title="No active alerts" description="No campus alerts or incidents reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {alerts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openInspector(a)}
                  aria-label={`Inspect alert: ${a.title ?? a.message ?? "alert"}`}
                  className="surface-card w-full min-h11 bg-bg-surface p-3 text-left"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{a.title ?? a.message ?? "Alert"}</p>
                    <span className="surface-card bg-action-danger/10 px-2 py-0.5 text-xs text-action-danger">
                      {a.severity ?? "alert"}
                    </span>
                  </div>
                  {a.message && a.title ? (
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{a.message}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AlertRecord>
              onRowClick={(a) => openInspector(a)}
              columns={[
                {
                  header: "Title",
                  accessor: (r) => r.title ?? r.message ?? "Alert",
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
                  header: "Status",
                  accessor: (r) => r.status ?? "OPEN",
                },
              ]}
              data={alerts}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}

      {/* The incident inspector drawer (overview → context → actions). */}
      <EntityInspectorPanel inspection={inspection} onClose={onActionComplete} />
    </div>
  );
}
