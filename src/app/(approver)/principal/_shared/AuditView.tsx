"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { RoleExportButton } from "@/components/shared/RoleExportButton";

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
  const { data, loading, error } = useApiResource<AuditResponse>("/api/principal/audit", {
    ttlMs: 30_000,
  });

  const logs = Array.isArray(data?.data) ? data.data : [];
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();
  const openInspector = (log: AuditLog) => ourInspect(buildAuditInspection(log));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Audit Trail</h1>
          <p className="text-xs text-text-muted">
            Immutable institutional action log · click any event to inspect
          </p>
        </div>
        <RoleExportButton
          resource="audit-logs"
          filenamePrefix="principal-audit-logs"
          rows={logs}
          columns={[
            { key: "action", header: "Action" },
            { key: "user_name", header: "Actor" },
            { key: "user_role", header: "Role" },
            { key: "timestamp", header: "Timestamp" },
          ]}
        />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Recent Events"
          value={logs.length}
          onClick={logs.length > 0 ? () => openInspector(logs[0]) : undefined}
        />
        <KpiCard
          label="Audit Logging"
          value={error ? "Degraded" : loading && !data ? "Checking..." : "Active"}
          tone={error ? "warn" : "ok"}
        />
        <KpiCard
          label="Integrity"
          value={error ? "Unverified" : loading && !data ? "Checking..." : logs.length > 0 ? "Verified" : "Empty"}
          tone={error ? "warn" : "ok"}
        />
      </div>

      {loading && logs.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries" description="No audit log events found." />
      ) : (
        <DataTable<AuditLog>
          onRowClick={openInspector}
          mobileLayout="cards"
          columns={[
            { header: "Action", accessor: (r) => <SmartTextRef text={r.action} currentPath="/principal/governance/audit" /> },
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
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
    </div>
  );
}
