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

interface ExamException {
  id?: string;
  ticket_number?: string;
  student_name?: string;
  student?: { name?: string };
  reason?: string;
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
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildExamCaseInspection> | null
  >(null);
  const inspectMain = (e: ExamException) =>
    setMainInspection(buildExamCaseInspection(e as ExamCaseRecord, gate));

  const exceptions = Array.isArray(data?.data) ? data.data : [];
  const pendingCount = exceptions.filter((e) => e.status === "PENDING" || !e.status).length;
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();
  const openInspector = (e: ExamException) => ourInspect(buildExamInspection(e));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Examination Oversight</h1>
        <p className="text-xs text-text-muted">
          Exam clearance queues, attendance, and hall exceptions · click any case to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total Clearances" value={exceptions.length} />
        <KpiCard label="Pending Action" value={pendingCount} tone={pendingCount > 0 ? "warn" : "ok"} />
        <KpiCard
          label="Superintendent Status"
          value="Synchronized"
          tone="ok"
        />
      </div>

      {loading && exceptions.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : exceptions.length === 0 ? (
        <EmptyState title="No exam exceptions" description="No hall clearance or exam exceptions reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {exceptions.map((e, idx) => (
              <li key={e.id ?? idx}>
                <button
                  type="button"
                  onClick={() => openInspector(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") openInspector(e);
                  }}
                  aria-label={`Inspect exam exception: ${e.student_name ?? e.student?.name ?? "student"}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left cursor-pointer hover:bg-bg-surface/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{e.student_name ?? e.student?.name ?? "Student"}</p>
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {e.status ?? "PENDING"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{e.reason ?? "Exam hall clearance"}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<ExamException>
              onRowClick={openInspector}
              columns={[
                {
                  header: "Candidate",
                  accessor: (r) => r.student_name ?? r.student?.name ?? "Candidate",
                },
                {
                  header: "Ticket",
                  accessor: (r) => r.ticket_number ?? "—",
                },
                {
                  header: "Reason",
                  accessor: (r) => r.reason ?? "Exam hall clearance",
                },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {r.status ?? "PENDING"}
                    </span>
                  ),
                },
              ]}
              data={exceptions}
              keyExtractor={(r) => r.id ?? r.ticket_number ?? "exam-row"}
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
