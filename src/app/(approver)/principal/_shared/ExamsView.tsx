"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildExamInspection } from "@/lib/principal/registerInspections";
import {
  buildExamCaseInspection,
  type ExamCaseRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { RoleExportButton } from "@/components/shared/RoleExportButton";

interface ExamException {
  id?: string;
  ticket_number?: string;
  student_name?: string;
  candidate?: string;
  roll?: string;
  hall?: string;
  severity?: string;
  resolved?: boolean;
  student?: { name?: string };
  reason?: string;
  description?: string;
  status?: string;
  created_at?: string;
}

interface ExamExceptionsResponse {
  success?: boolean;
  data: ExamException[];
}

export function ExamsView() {
  const { data, loading } = useApiResource<ExamExceptionsResponse>(
    "/api/exam/access-exceptions",
    { ttlMs: 30_000 }
  );

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildExamCaseInspection> | null
  >(null);
  const inspectMain = (e: ExamException) => {
    const normalized: ExamCaseRecord = {
      id: e.id,
      ticket_number: e.ticket_number ?? e.roll ?? e.hall,
      student_name: e.student_name ?? e.candidate ?? e.student?.name,
      reason: e.reason ?? e.description,
      status: e.status ?? (e.resolved ? "RESOLVED" : "PENDING"),
      created_at: e.created_at,
    };
    setMainInspection(buildExamCaseInspection(normalized, gate));
  };

  const exceptions = Array.isArray(data?.data) ? data.data : [];
  const isResolved = (e: ExamException) =>
    Boolean(e.resolved) || (e.status ?? "").toUpperCase() === "RESOLVED";
  const pendingCount = exceptions.filter((e) => !isResolved(e)).length;
  const resolvedCount = exceptions.length - pendingCount;
  const visibleExceptions = exceptions.filter((e) => {
    if (filter === "pending") return !isResolved(e);
    if (filter === "resolved") return isResolved(e);
    return true;
  });
  const openInspector = (e: ExamException) => inspectMain(e);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Examination Oversight</h1>
          <p className="text-xs text-text-muted">
            Exam clearance queues, attendance, and hall exceptions · click any case to inspect &amp; resolve
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Exam exception filters">
          {[
            { key: "all" as const, label: "All", count: exceptions.length },
            { key: "pending" as const, label: "Pending", count: pendingCount },
            { key: "resolved" as const, label: "Resolved", count: resolvedCount },
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
          <RoleExportButton
            resource="exam-clearances"
            filenamePrefix="principal-exam-clearances"
            rows={visibleExceptions}
            columns={[
              { key: "candidate", header: "Candidate", accessor: (r) => r.student_name ?? r.candidate ?? r.student?.name ?? "" },
              { key: "roll", header: "Roll / Ticket", accessor: (r) => r.ticket_number ?? r.roll ?? "" },
              { key: "hall", header: "Hall" },
              { key: "reason", header: "Reason", accessor: (r) => r.reason ?? r.description ?? "" },
              { key: "status", header: "Status", accessor: (r) => r.status ?? (isResolved(r) ? "RESOLVED" : "PENDING") },
            ]}
          />
        </nav>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total Clearances" value={exceptions.length} onClick={() => setFilter("all")} />
        <KpiCard label="Pending Action" value={pendingCount} tone={pendingCount > 0 ? "warn" : "ok"} onClick={() => setFilter("pending")} />
        <KpiCard
          label="Resolved"
          value={resolvedCount}
          tone="ok"
          onClick={() => setFilter("resolved")}
        />
      </div>

      {loading && exceptions.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : visibleExceptions.length === 0 ? (
        <EmptyState title="No exam exceptions" description="No hall clearance or exam exceptions match this filter." />
      ) : (
        <DataTable<ExamException>
          mobileLayout="cards"
          onRowClick={openInspector}
          columns={[
            {
              header: "Candidate",
              accessor: (r) => r.student_name ?? r.candidate ?? r.student?.name ?? "Candidate",
            },
            {
              header: "Roll / Hall",
              accessor: (r) => r.ticket_number ?? (r.roll ? `${r.roll}${r.hall ? ` · ${r.hall}` : ""}` : r.hall ?? "—"),
            },
            {
              header: "Reason",
              accessor: (r) => (
                <SmartTextRef text={r.reason ?? r.description ?? "Exam hall clearance"} currentPath="/principal/examinations" />
              ),
            },
            {
              header: "Status",
              accessor: (r) => (
                <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                  {r.status ?? (isResolved(r) ? "RESOLVED" : "PENDING")}
                </span>
              ),
            },
            {
              header: "Overview",
              accessor: (r) => (
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    openInspector(r);
                  }}
                  className="text-xs font-semibold text-action-primary hover:underline"
                >
                  Open &rarr;
                </button>
              ),
            },
          ]}
          data={visibleExceptions}
          keyExtractor={(r) => r.id ?? r.ticket_number ?? "exam-row"}
        />
      )}

      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
