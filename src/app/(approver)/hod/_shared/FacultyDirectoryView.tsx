"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface HodFacultyRow {
  id: string;
  name: string;
  email?: string;
  employee_details?: {
    designation?: string;
    employee_id?: string;
  } | null;
}

interface HodFacultyResponse {
  success: boolean;
  data: HodFacultyRow[];
}

export function FacultyDirectoryView() {
  const { data, loading } = useApiResource<HodFacultyResponse>("/api/hod/faculty", {
    ttlMs: 30_000,
  });

  const facultyList = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Faculty Directory</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Department faculty roster and employee profiles
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Department Faculty" value={facultyList.length} tone="ok" />
        <KpiCard
          label="Designations Assigned"
          value={facultyList.filter((f) => !!f.employee_details?.designation).length}
          tone="neutral"
        />
        <KpiCard
          label="Active Accounts"
          value={facultyList.filter((f) => !!f.email).length}
          tone="info"
        />
      </div>

      {loading && facultyList.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : facultyList.length === 0 ? (
        <EmptyState
          title="No faculty members found"
          description="No faculty members are assigned to your department yet."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {facultyList.map((faculty) => (
              <li
                key={faculty.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{faculty.name || "—"}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {faculty.employee_details?.designation ?? "Faculty Member"}
                    </p>
                  </div>
                  {faculty.employee_details?.employee_id && (
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {faculty.employee_details.employee_id}
                    </span>
                  )}
                </div>
                {faculty.email && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{faculty.email}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<HodFacultyRow>
              columns={[
                { header: "Name", accessor: (r) => r.name || "—" },
                {
                  header: "Designation",
                  accessor: (r) => r.employee_details?.designation ?? "Faculty Member",
                },
                {
                  header: "Employee ID",
                  accessor: (r) => r.employee_details?.employee_id ?? "—",
                },
                { header: "Email", accessor: (r) => r.email || "—" },
              ]}
              data={facultyList}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
