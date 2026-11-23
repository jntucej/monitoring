"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildAuditInspection } from "@/lib/principal/registerInspections";
import {
  buildAuditEventInspection,
  type RoleGate,
} from "./entityInspectionModels";
import { useRoleContext } from "@/hooks/useRoleContext";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AuditLog {
  id: string;
  action: string;
  user_name?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditResponse {
  success?: boolean;
  data: AuditLog[];
}

export function AuditView() {
  const { data, loading } = useApiResource<AuditResponse>("/api/principal/audit", {
    ttlMs: 30_000,
  });

  const logs = Array.isArray(data?.data) ? data.data : [];
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();
  const openInspector = (log: AuditLog) => ourInspect(buildAuditInspection(log));

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildAuditEventInspection> | null
  >(null);
  const inspectMain = (log: AuditLog) =>
    setMainInspection(buildAuditEventInspection(log, gate));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Audit Trail</h1>
        <p className="text-xs text-text-muted">
          Decisions, overrides, and governance records
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Recent Events"
          value={logs.length}
          onClick={logs.length > 0 ? () => openInspector(logs[0]) : undefined}
        />
        <KpiCard label="Audit Logging" value="Active" tone="ok" />
        <KpiCard label="Integrity" value="Verified" tone="ok" />
      </div>

      {loading && logs.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries" description="No audit log events found." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => openInspector(log)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openInspector(log);
                  }}
                  aria-label={`Inspect audit event: ${log.action}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left cursor-pointer hover:bg-bg-surface/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{log.action}</p>
                    <span className="text-xs text-text-muted">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {log.user_name ?? "System"} ({log.user_role ?? "sys"})
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AuditLog>
              onRowClick={openInspector}
              columns={[
                { header: "Action", accessor: (r) => r.action },
                { header: "Actor", accessor: (r) => r.user_name ?? "System" },
                { header: "Role", accessor: (r) => r.user_role ?? "—" },
                {
                  header: "Timestamp",
                  accessor: (r) => new Date(r.timestamp).toLocaleString(),
                },
              ]}
              data={logs}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
