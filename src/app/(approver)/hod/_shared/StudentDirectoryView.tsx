"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface StudentRow {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  department?: string;
  year?: number;
  section?: string;
  hostelBlock?: string;
  roomNumber?: string;
}

interface StudentsResponse {
  success: boolean;
  data: StudentRow[];
}

export function StudentDirectoryView() {
  const { data, loading } = useApiResource<StudentsResponse>("/api/students", {
    ttlMs: 30_000,
  });

  const students = Array.isArray(data?.data) ? data.data : [];
  const hostelCount = students.filter((s) => !!s.hostelBlock).length;
  const dayScholarCount = students.length - hostelCount;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Student Directory</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Department enrolled students and residential status
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Students" value={students.length} tone="ok" />
        <KpiCard label="Hostellers" value={hostelCount} tone="neutral" />
        <KpiCard label="Day Scholars" value={dayScholarCount} tone="info" />
      </div>

      {loading && students.length === 0 ? (
        <ListSkeleton rows={6} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="No students in your department roster."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {students.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      {s.roll ?? s.uniqueId ?? "—"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    {s.year != null ? `Y${s.year}` : "—"} / {s.section ?? "—"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  {s.hostelBlock ? `Hostel: ${s.hostelBlock}-${s.roomNumber ?? ""}` : "Day Scholar"}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<StudentRow>
              columns={[
                { header: "Name", accessor: (r) => r.name },
                {
                  header: "Roll / ID",
                  accessor: (r) => (
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {r.roll ?? r.uniqueId ?? "—"}
                    </span>
                  ),
                },
                {
                  header: "Year / Section",
                  accessor: (r) =>
                    r.year != null || r.section ? `Y${r.year ?? "—"} / ${r.section ?? "—"}` : "—",
                },
                {
                  header: "Residential Status",
                  accessor: (r) =>
                    r.hostelBlock ? `${r.hostelBlock}-${r.roomNumber ?? ""}` : "Day Scholar",
                },
              ]}
              data={students}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
