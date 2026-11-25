"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, GraduationCap, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { KpiCard } from "../../../_shared/KpiCard";
import { DataTable } from "@/components/ui/DataTable";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

interface DepartmentItem {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

interface AcademicsResponse {
  success?: boolean;
  data: {
    departments: DepartmentItem[];
    exceptions?: {
      absent?: Array<{ id: string; name: string; role: string; department: string | null }>;
      late?: Array<{ id: string; name: string; role: string; department: string | null; minutesLate: number }>;
      flagged?: Array<{ id: string; name: string; department: string | null; reason: string }>;
    };
  };
}

interface PermissionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  reason?: string | null;
  branch?: string | null;
  student?: { name?: string } | null;
}

export default function PrincipalDepartmentDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params?.code ?? "");

  const { data, loading } = useApiResource<AcademicsResponse>("/api/vp/academics", {
    ttlMs: 60_000,
  });
  const { data: permsData } = useApiResource<{ success?: boolean; data?: PermissionRow[] }>(
    `/api/permissions?limit=100`,
    { ttlMs: 30_000 },
  );

  const dept = (data?.data?.departments ?? []).find(
    (d) => d.code.toLowerCase() === code.toLowerCase() || d.name.toLowerCase() === code.toLowerCase(),
  );

  const exceptions = data?.data?.exceptions;
  const deptFlagged = (exceptions?.flagged ?? []).filter(
    (f) => !f.department || f.department.toLowerCase() === code.toLowerCase() || f.department.toLowerCase() === (dept?.name ?? "").toLowerCase(),
  );
  const deptLate = (exceptions?.late ?? []).filter(
    (l) => !l.department || l.department.toLowerCase() === code.toLowerCase() || l.department.toLowerCase() === (dept?.name ?? "").toLowerCase(),
  );

  const deptPerms = (permsData?.data ?? []).filter(
    (p) => !p.branch || p.branch.toLowerCase() === code.toLowerCase(),
  );

  return (
    <div className="space-y-5" data-role-tier="tier-3">
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Inspect specific academic department metrics, faculty composition, and student enrollments"
        why="Granular department audits reveal faculty workload distributions, student attendance health, and pending permission volumes."
        contextLabel={dept ? `Department Scope · ${dept.name} (${dept.code})` : "Department Scope"}
        statusSummary={dept ? `${deptPerms.length} pending permissions, ${deptFlagged.length} flagged attendance, and ${deptLate.length} late arrivals.` : "Loading department metrics..."}
        primaryAction={{ label: "All Departments", href: "/principal/people/departments" }}
        secondaryAction={{ label: "Assignment Tree", href: "/principal/people/assignment-tree" }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/principal/people/departments")}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-4" />
          Back to Departments
        </button>
        <div className="flex items-center gap-2">
          <Link
            href="/principal/people/attendance"
            className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
          >
            Attendance Exceptions &rarr;
          </Link>
          <Link
            href="/principal/approvals"
            className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-action-primary hover:bg-bg-elevated"
          >
            Approvals Queue &rarr;
          </Link>
        </div>
      </div>

      {loading && !dept ? (
        <Loading />
      ) : !dept ? (
        <div className="surface-card p-6 text-center space-y-2">
          <p className="text-sm font-medium text-text-primary">Department not found</p>
          <p className="text-xs text-text-muted">No department matched &ldquo;{code}&rdquo;.</p>
        </div>
      ) : (
        <>
          <PageHeader
            title={`${dept.name} (${dept.code})`}
            subtitle={`HOD: ${dept.hodName ?? "Unassigned"} · Student-to-Faculty Ratio 1:${dept.ratio}`}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Students" value={dept.students} onClick={() => router.push("/principal/people")} />
            <KpiCard label="Faculty" value={dept.faculty} onClick={() => router.push("/principal/people")} />
            <KpiCard label="Ratio" value={`1:${dept.ratio}`} />
            <KpiCard
              label="Attendance"
              value={`${dept.attendancePct}%`}
              tone={dept.attendancePct >= 75 ? "ok" : "warn"}
              onClick={() => router.push("/principal/people/attendance")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="surface-card p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-action-warning" />
                Department Exceptions ({deptFlagged.length + deptLate.length})
              </h2>
              {deptFlagged.length === 0 && deptLate.length === 0 ? (
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-action-success" />
                  No flagged or late exceptions in this department.
                </p>
              ) : (
                <ul className="divide-y divide-border text-xs">
                  {deptFlagged.map((f) => (
                    <li key={f.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">{f.name}</span>
                      <span className="text-action-danger">
                        <SmartTextRef text={f.reason} currentPath={`/principal/people/departments/${code}`} />
                      </span>
                    </li>
                  ))}
                  {deptLate.map((l) => (
                    <li key={l.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">{l.name}</span>
                      <span className="text-action-warning">{l.minutesLate}m late</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface-card p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-action-primary" />
                Leadership &amp; Scope
              </h2>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-text-muted">Head of Department</dt>
                  <dd className="font-medium text-text-primary mt-0.5">{dept.hodName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Department Code</dt>
                  <dd className="font-mono text-text-primary mt-0.5">{dept.code}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="surface-card p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="size-4 text-action-primary" />
              Department Permission Requests ({deptPerms.length})
            </h2>
            <DataTable
              data={deptPerms.slice(0, 25)}
              keyExtractor={(r) => r.id}
              emptyMessage="No permission requests recorded for this department."
              onRowClick={(r) => router.push(`/principal/approvals?ticket=${encodeURIComponent(r.ticket_number)}`)}
              columns={[
                { header: "Ticket", accessor: (r) => <span className="font-mono text-action-primary">{r.ticket_number}</span> },
                { header: "Student", accessor: (r) => r.student?.name ?? "—" },
                { header: "Workflow", accessor: (r) => r.workflow_type },
                { header: "Stage", accessor: (r) => r.current_stage },
                { header: "Status", accessor: (r) => r.status },
                {
                  header: "Reason",
                  accessor: (r) =>
                    r.reason ? (
                      <SmartTextRef text={r.reason} currentPath={`/principal/people/departments/${code}`} />
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          </section>
        </>
      )}
    </div>
  );
}
