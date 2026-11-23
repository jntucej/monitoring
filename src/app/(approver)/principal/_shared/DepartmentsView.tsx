"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildDepartmentInspection } from "@/lib/principal/registerInspections";
import {
  buildDepartmentInspection as buildMainDepartmentInspection,
  type RoleGate,
} from "./entityInspectionModels";
import { useRoleContext } from "@/hooks/useRoleContext";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

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
    summary: {
      totalDepts: number;
      totalStudents: number;
      totalFaculty: number;
      avgAttendance: number;
    };
  };
}

export function DepartmentsView() {
  const { data, loading } = useApiResource<AcademicsResponse>("/api/vp/academics", {
    ttlMs: 60_000,
  });
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildMainDepartmentInspection> | null
  >(null);
  const inspectMain = (dept: DepartmentItem) =>
    setMainInspection(buildMainDepartmentInspection(dept, gate));

  const d = data?.data;
  const openInspector = (dept: DepartmentItem) => ourInspect(buildDepartmentInspection(dept));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Departments</h1>
        <p className="text-xs text-text-muted">
          Headcount and attendance per department
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Departments"
          value={d?.summary?.totalDepts}
          onClick={
            d && d.departments.length > 0 ? () => openInspector(d.departments[0]) : undefined
          }
        />
        <KpiCard label="Students" value={d?.summary?.totalStudents} />
        <KpiCard label="Faculty" value={d?.summary?.totalFaculty} />
        <KpiCard
          label="Avg attendance"
          value={d?.summary?.avgAttendance !== undefined ? `${d.summary.avgAttendance}%` : "—"}
          tone="ok"
        />
      </div>

      {loading && !d ? (
        <ListSkeleton rows={5} />
      ) : !d || (d.departments ?? []).length === 0 ? (
        <EmptyState title="No departments found" description="Department details are currently unavailable." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {(d?.departments ?? []).map((dept) => (
              <li key={dept.code}>
                <button
                  type="button"
                  onClick={() => openInspector(dept)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openInspector(dept);
                  }}
                  aria-label={`Inspect department: ${dept.name}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left cursor-pointer hover:bg-bg-surface/60 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{dept.name}</p>
                      <p className="text-xs text-text-muted">HOD: {dept.hodName ?? "—"}</p>
                    </div>
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs font-semibold text-action-primary">
                      {dept.attendancePct}%
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-text-secondary">
                    <span>{dept.students} students</span>
                    <span>{dept.faculty} faculty</span>
                    <span>1:{dept.ratio}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<DepartmentItem>
              onRowClick={openInspector}
              columns={[
                { header: "Department", accessor: (r) => r.name },
                { header: "HOD", accessor: (r) => r.hodName ?? "—" },
                { header: "Students", accessor: (r) => r.students },
                { header: "Faculty", accessor: (r) => r.faculty },
                { header: "Ratio", accessor: (r) => `1:${r.ratio}` },
                {
                  header: "Attendance",
                  accessor: (r) => `${r.attendancePct}%`,
                },
              ]}
              data={d?.departments ?? []}
              keyExtractor={(r) => r.code}
              mobileLayout="cards"
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
