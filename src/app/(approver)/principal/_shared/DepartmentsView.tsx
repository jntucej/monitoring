"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AcademicsResponse {
  success?: boolean;
  data: {
    departments: Array<{
      code: string;
      name: string;
      hodName: string | null;
      faculty: number;
      students: number;
      ratio: number;
      attendancePct: number;
    }>;
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

  const d = data?.data;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Departments</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Headcount and attendance per department
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Departments" value={d?.summary?.totalDepts} />
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
              <li
                key={dept.code}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{dept.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      HOD: {dept.hodName ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--action-primary)]">
                    {dept.attendancePct}%
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-[11px] text-[var(--text-secondary)]">
                  <span>{dept.students} students</span>
                  <span>{dept.faculty} faculty</span>
                  <span>1:{dept.ratio}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable
              columns={[
                { header: "Department", accessor: (r: any) => r.name },
                { header: "HOD", accessor: (r: any) => r.hodName ?? "—" },
                { header: "Students", accessor: (r: any) => r.students },
                { header: "Faculty", accessor: (r: any) => r.faculty },
                { header: "Ratio", accessor: (r: any) => `1:${r.ratio}` },
                {
                  header: "Attendance",
                  accessor: (r: any) => `${r.attendancePct}%`,
                },
              ]}
              data={d?.departments ?? []}
              keyExtractor={(r: any) => r.code}
            />
          </div>
        </>
      )}
    </div>
  );
}
