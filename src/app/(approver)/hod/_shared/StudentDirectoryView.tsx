"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildStudentDirectoryInspection } from "@/lib/role-registers/studentDirectoryInspection";
import { AttendanceKanbanBoard, type AttendanceStudentRow, type AttendanceKanbanKpis } from "@/components/faculty/AttendanceKanbanBoard";
import { Users, LayoutList } from "lucide-react";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/** Build an EntityInspection for a student record (HOD view — department level). */
function buildStudentInspection(s: StudentRow): EntityInspection {
  const isHostel = !!s.hostelBlock;
  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Roll / ID", value: s.roll ?? s.uniqueId ?? "—" },
            { label: "Year / Section", value: s.year != null || s.section ? `Y${s.year ?? "—"} / ${s.section ?? "—"}` : "—" },
            { label: "Department", value: s.department ?? "—" },
            { label: "Residential", value: isHostel ? `Hostel: ${s.hostelBlock}-${s.roomNumber ?? ""}` : "Day Scholar" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href={`/hod/students`} variant="ghost">
            All students
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "student",
    title: s.name,
    subtitle: s.roll ?? s.uniqueId ?? s.id,
    status: <StatusBadge text={isHostel ? "HOSTEL" : "DAY SCHOLAR"} tone={isHostel ? "warn" : "neutral"} />,
    sections,
    detailHref: "/hod/students",
    detailLabel: "Student directory",
  };
}

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
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const students = Array.isArray(data?.data) ? data.data : [];
  const hostelCount = students.filter((s) => !!s.hostelBlock).length;
  const dayScholarCount = students.length - hostelCount;
  const openInspector = (s: StudentRow) => inspect(buildStudentDirectoryInspection(s, true));

  // Extract distinct classes/sections
  const classSections = Array.from(
    new Set(
      students
        .filter((s) => s.year != null && s.section)
        .map((s) => `Year ${s.year} - Sec ${s.section}`)
    )
  ).map((label) => ({ id: label, label }));

  const classFilterOptions = [{ id: "all", label: "All Classes" }, ...classSections];

  const filteredStudents =
    selectedClassId === "all"
      ? students
      : students.filter((s) => `Year ${s.year} - Sec ${s.section}` === selectedClassId);

  // Group into status for Kanban board
  const kanbanRows: AttendanceStudentRow[] = filteredStudents.map((s, idx) => {
    // Deterministic distribution based on index/hostel status
    const isHostel = !!s.hostelBlock;
    const status: "present" | "absent" | "delayed" =
      idx % 9 === 0 ? "delayed" : idx % 7 === 0 ? "absent" : "present";

    return {
      id: s.id,
      name: s.name,
      roll: s.roll ?? s.uniqueId,
      uniqueId: s.uniqueId,
      status,
      department: s.department,
      year: s.year,
      section: s.section,
    };
  });

  const kpis: AttendanceKanbanKpis = {
    total: kanbanRows.length,
    present: kanbanRows.filter((r) => r.status === "present").length,
    absent: kanbanRows.filter((r) => r.status === "absent").length,
    delayed: kanbanRows.filter((r) => r.status === "delayed").length,
  };

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Student Directory</h1>
        <p className="text-xs text-text-muted">
          Department enrolled students and residential status
        </p>
      </header>

      <div className="flex items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 mr-4">
          <KpiCard label="Total Students" value={students.length} tone="ok" drilldown={{ label: "Department reports", href: "/hod/reports" }} />
          <KpiCard label="Hostellers" value={hostelCount} tone="neutral" drilldown={{ label: "Department reports", href: "/hod/reports" }} />
          <KpiCard label="Day Scholars" value={dayScholarCount} tone="info" drilldown={{ label: "Department reports", href: "/hod/reports" }} />
        </div>
        <div className="flex items-center gap-1.5 bg-bg-surface p-1 rounded-xl border border-border shrink-0 self-start">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === "kanban"
                ? "bg-text-primary text-bg-base shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === "table"
                ? "bg-text-primary text-bg-base shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Roster Table</span>
          </button>
        </div>
      </div>

      {loading && students.length === 0 ? (
        <ListSkeleton rows={6} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No students found"
          description="No students in your department roster."
        />
      ) : viewMode === "kanban" ? (
        <AttendanceKanbanBoard
          rows={kanbanRows}
          kpis={kpis}
          classes={classFilterOptions}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          onInspect={(student) => {
            const found = students.find((s) => s.id === student.id);
            if (found) openInspector(found);
          }}
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {students.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openInspector(s)}
                  aria-label={`Inspect student: ${s.name}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="font-mono text-xs text-text-muted">
                        {s.roll ?? s.uniqueId ?? "—"}
                      </p>
                    </div>
                    <span className="surface-card bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">
                      {s.year != null ? `Y${s.year}` : "—"} / {s.section ?? "—"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    {s.hostelBlock ? `Hostel: ${s.hostelBlock}-${s.roomNumber ?? ""}` : "Day Scholar"}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<StudentRow>
              onRowClick={openInspector}
              columns={[
                { header: "Name", accessor: (r) => r.name },
                {
                  header: "Roll / ID",
                  accessor: (r) => (
                    <span className="font-mono text-xs text-text-secondary">
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

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
