"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector, type EntityInspection } from "@/components/shared/EntityInspector";
import { alertInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface IncidentItem {
  id: string;
  severity: string;
  title: string;
  timestamp: string;
  resolved: boolean;
}

interface IncidentsResponse {
  data: {
    incidents: IncidentItem[];
  };
}

export function IncidentsView({ onInspect }: { onInspect?: (m: EntityInspection) => void }) {
  const { data, loading } = useApiResource<IncidentsResponse>(
    "/api/supervisor/dashboard",
    { ttlMs: 15_000 }
  );
  // Internal inspector state only when no external channel is wired, so the
  // page-level EntityInspector stays the single drawer instance.
  const renderInspector = !onInspect;
  const host = useRoleInspectorHost();
  const inspection = host.inspection;
  const inspect = host.inspect;
  const closeInspection = host.closeInspection;

  const rows = data?.data?.incidents ?? [];
  // When the host page owns the inspector (onInspect provided), the alert
  // model routes into that channel; otherwise the view keeps its own
  // internal inspector state as before.
  const openIncident = (item: IncidentItem) => {
    const model = alertInspection(item);
    if (onInspect) onInspect(model);
    else inspect(model);
  };

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Incidents</h1>
        <p className="text-xs text-text-muted">
          {rows.length} incident{rows.length === 1 ? "" : "s"} logged in last 24h
        </p>
      </header>

      {loading && rows.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No incidents" description="No safety or security alerts reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((item) => (
              <li
                key={item.id}
                className="surface-card bg-bg-surface p-3 text-xs cursor-pointer hover:bg-bg-surface/60 transition-colors"
                onClick={() => openIncident(item)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">{item.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      item.resolved
                        ? "bg-action-primary/10 text-action-primary"
                        : "bg-action-danger/10 text-action-danger"
                    }`}
                  >
                    {item.resolved ? "Resolved" : item.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<IncidentItem>
              columns={[
                {
                  header: "Status",
                  accessor: (r) =>
                    r.resolved ? (
                      <span className="flex items-center gap-1 text-action-primary">
                        <CheckCircle2 className="size-4" /> Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-action-danger font-medium">
                        <AlertTriangle className="size-4" /> Open
                      </span>
                    ),
                },
                { header: "Severity", accessor: (r) => <span className="uppercase font-semibold text-xs">{r.severity}</span> },
                { header: "Incident Description", accessor: (r) => r.title },
                {
                  header: "Reported At",
                  accessor: (r) => (
                    <span className="text-xs text-text-muted">
                      {new Date(r.timestamp).toLocaleString()}
                    </span>
                  ),
                },
              ]}
              data={rows}
              keyExtractor={(r) => r.id}
              onRowClick={(r) => openIncident(r)}
            />
          </div>
        </>
      )}

      {renderInspector && <EntityInspector inspection={inspection} onClose={closeInspection} />}
    </div>
  );
}
