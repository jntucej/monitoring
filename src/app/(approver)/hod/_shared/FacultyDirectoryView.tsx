"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildHodFacultyDirectoryInspection, type HodFacultyDirectoryRecord } from "@/lib/role-registers/hodInspections";

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
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [filter, setFilter] = useState<"all" | "assigned" | "active">("all");

  const facultyList = Array.isArray(data?.data) ? data.data : [];
  const visibleFaculty = facultyList.filter((f) => {
    if (filter === "assigned") return Boolean(f.employee_details?.designation);
    if (filter === "active") return Boolean(f.email);
    return true;
  });

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Faculty Directory</h1>
        <p className="text-xs text-text-muted">
          Department faculty roster and employee profiles
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Department Faculty" value={facultyList.length} tone="ok" onClick={() => setFilter("all")} />
        <KpiCard
          label="Designations Assigned"
          value={facultyList.filter((f) => !!f.employee_details?.designation).length}
          tone="neutral"
          onClick={() => setFilter("assigned")}
        />
        <KpiCard
          label="Active Accounts"
          value={facultyList.filter((f) => !!f.email).length}
          tone="info"
          onClick={() => setFilter("active")}
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
        <div className="space-y-5">
          {/* BAND 2: Faculty Action Cards */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Faculty Profiles ({visibleFaculty.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleFaculty.map((faculty) => (
                <button
                  key={faculty.id}
                  type="button"
                  onClick={() => inspect(buildHodFacultyDirectoryInspection(faculty))}
                  className="surface-card bg-bg-surface p-4 text-left hover:bg-bg-elevated/40 transition-colors flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{faculty.name || "—"}</p>
                      <p className="text-xs text-text-muted">
                        {faculty.employee_details?.designation ?? "Faculty Member"}
                      </p>
                    </div>
                    {faculty.employee_details?.employee_id && (
                      <span className="font-mono text-xs text-text-muted">
                        {faculty.employee_details.employee_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border">
                    <span className="truncate">{faculty.email || "No email"}</span>
                    <span className="font-semibold text-action-primary shrink-0 ml-2">Inspect &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* BAND 3: Collapsible Roster Ledger */}
          <details className="surface-card bg-bg-surface/60 p-3">
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Full Faculty Roster Table ({facultyList.length})</span>
              <ChevronDown className="size-4 text-text-muted" />
            </summary>
            <div className="mt-3">
              <DataTable<HodFacultyRow>
                onRowClick={(faculty) => inspect(buildHodFacultyDirectoryInspection(faculty))}
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
          </details>
        </div>
      )}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
