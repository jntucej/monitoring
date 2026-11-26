"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  const router = useRouter();
  const d = data?.data;
  const openInspector = (dept: DepartmentItem) => {
    const model = buildDepartmentInspection(dept);
    ourInspect({
      ...model,
      detailHref: `/principal/people/departments/${encodeURIComponent(dept.code)}`,
      detailLabel: "Open department page",
    });
  };

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
        <KpiCard
          label="Students"
          value={d?.summary?.totalStudents}
          onClick={() => router.push("/principal/people")}
        />
        <KpiCard
          label="Faculty"
          value={d?.summary?.totalFaculty}
          onClick={() => router.push("/principal/people")}
        />
        <KpiCard
          label="Avg attendance"
          value={d?.summary?.avgAttendance !== undefined ? `${d.summary.avgAttendance}%` : "—"}
          tone="ok"
          onClick={() => router.push("/principal/people/attendance")}
        />
      </div>

      {loading && !d ? (
        <ListSkeleton rows={5} />
      ) : !d || (d.departments ?? []).length === 0 ? (
        <EmptyState title="No departments found" description="Department details are currently unavailable." />
      ) : (
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
                {
                  header: "Page",
                  accessor: (r) => (
                    <Link
                      href={`/principal/people/departments/${encodeURIComponent(r.code)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold text-action-primary hover:underline"
                    >
                      Open &rarr;
                    </Link>
                  ),
                },
              ]}
              data={d?.departments ?? []}
              keyExtractor={(r) => r.code}
              mobileLayout="cards"
            />
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
    </div>
  );
}
