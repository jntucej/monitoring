"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildIncidentInspection,
  type IncidentRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { CommandPivotDrawer, type CommandPivotTarget } from "@/components/nav/level3/CommandPivotDrawer";

interface AlertItem {
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
}

interface AlertsResponse {
  success?: boolean;
  data: AlertItem[];
}

export function IncidentsView() {
  const { data, loading } = useApiResource<AlertsResponse>("/api/alerts", {
    ttlMs: 15_000,
  });

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [inspection, setInspection] = useState<
    ReturnType<typeof buildIncidentInspection> | null
  >(null);
  const [pivot, setPivot] = useState<CommandPivotTarget | null>(null);

  const inspect = (a: AlertItem) => {
    setInspection(
      buildIncidentInspection(
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
    setPivot({
      kind: "gate",
      id: a.gate_id ?? a.id,
      title: a.title ?? a.message ?? "Alert",
      subtitle: `${a.severity ?? "alert"} · ${a.status ?? "OPEN"}${a.gate_name ? " · " + a.gate_name : ""}`,
      fullRoute: a.gate_id ? `/admin/gates/${a.gate_id}` : `/admin/alerts`,
      relatedLinks: [
        { label: "Gate Activity", href: "/principal/operations/gates" },
        { label: "Incidents", href: "/principal/operations/incidents" },
        { label: "Hostel", href: "/principal/operations/hostel" },
        { label: "People", href: "/principal/people" },
        { label: "Escalations", href: "/principal/escalations" },
        { label: "Cases", href: "/principal/cases" },
      ],
    });
  };

  const alerts = Array.isArray(data?.data) ? data.data : [];
  const highSeverity = alerts.filter(
    (a) => a.severity === "high" || a.severity === "critical"
  ).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Incidents & Alerts</h1>
        <p className="text-xs text-text-muted">
          Real-time institutional and security alerts · click any alert to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Active Alerts" value={alerts.length} />
        <KpiCard label="Critical / High" value={highSeverity} tone={highSeverity > 0 ? "danger" : "ok"} />
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
              <li
                key={a.id}
                className="surface-card bg-bg-surface p-3 cursor-pointer hover:bg-bg-surface/60 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => inspect(a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inspect(a);
                }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{a.title ?? a.message ?? "Alert"}</p>
                  <span className="surface-card bg-action-danger/10 px-2 py-0.5 text-xs text-action-danger">
                    {a.severity ?? "alert"}
                  </span>
                </div>
                {a.message && a.title && (
                  <p className="mt-1 text-xs text-text-secondary">{a.message}</p>
                )}
                {a.gate_name || a.gate_id ? (
                  <p className="mt-1 text-xs font-mono text-text-muted">
                    {a.gate_name ?? a.gate_id}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AlertItem>
              onRowClick={(a) => inspect(a)}
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
                  header: "Gate",
                  accessor: (r) => r.gate_name ?? r.gate_id ?? "—",
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

      <EntityInspector inspection={inspection} onClose={() => { setInspection(null); setPivot(null); }} />
      <CommandPivotDrawer target={pivot} onClose={() => setPivot(null)} />
    </div>
  );
}
