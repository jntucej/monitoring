import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export interface StudentDirectoryRecord {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  department?: string;
  year?: number;
  section?: string;
  status?: string;
  hostelBlock?: string;
  roomNumber?: string;
}

export function buildStudentDirectoryInspection(
  s: StudentDirectoryRecord,
  isHod = false,
): EntityInspection {
  const roll = s.roll ?? s.uniqueId ?? "—";
  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <dl className="space-y-1.5">
          <div><dt className="text-xs text-text-muted">Student Name</dt><dd className="text-sm text-text-primary">{s.name}</dd></div>
          <div><dt className="text-xs text-text-muted">Roll / Unique ID</dt><dd className="text-sm text-text-primary font-mono">{roll}</dd></div>
          <div><dt className="text-xs text-text-muted">Department</dt><dd className="text-sm text-text-primary">{s.department ?? "—"}</dd></div>
          <div><dt className="text-xs text-text-muted">Year / Section</dt><dd className="text-sm text-text-primary">{s.year != null || s.section ? `Year ${s.year ?? "—"} / Sec ${s.section ?? "—"}` : "—"}</dd></div>
          <div><dt className="text-xs text-text-muted">Status</dt><dd className="text-sm text-text-primary">{s.status ?? "ACTIVE"}</dd></div>
          <div><dt className="text-xs text-text-muted">Residential</dt><dd className="text-sm text-text-primary">{s.hostelBlock ? `Hosteller (${s.hostelBlock}${s.roomNumber ? ` - ${s.roomNumber}` : ""})` : "Day Scholar"}</dd></div>
        </dl>
      ),
    },
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Enrolled student in department roster. Linked to attendance and campus movements.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <p className="text-xs text-text-muted">
          {isHod
            ? "Inspection only — student roster records are managed via admissions and admin."
            : "Inspection only — faculty view department student profiles."}
        </p>
      ),
    },
  ];

  return {
    kind: "student",
    title: s.name,
    subtitle: `${roll}${s.department ? ` · ${s.department}` : ""}`,
    status: <span className="text-xs font-semibold text-action-success">{s.status ?? "ACTIVE"}</span>,
    sections,
  };
}
