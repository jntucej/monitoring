"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildHodFacultyAttendanceInspection, type HodFacultyAttendanceRecord } from "@/lib/role-registers/hodInspections";
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

/** Build an EntityInspection for a faculty attendance record (HOD view). */
function buildFacultyAttendanceInspection(r: AttendanceRecord): EntityInspection {
  const tone: "ok" | "warn" | "danger" | "neutral" =
    r.status === "PRESENT" || r.status === "INSIDE" ? "ok"
    : r.status === "ABSENT" ? "danger"
    : "warn";

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Name", value: r.fullName },
            { label: "Designation", value: r.designation },
            { label: "Status", value: r.status },
            { label: "Punctuality", value: r.punctualityStatus ?? "—" },
            { label: "First in", value: r.firstInTime ?? "—" },
            { label: "Last out", value: r.lastOutTime ?? "—" },
            { label: "Hours today", value: r.totalHoursToday ?? "—" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/hod/faculty/attendance" variant="ghost">
            All records
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "attendance",
    title: r.fullName,
    subtitle: r.designation,
    status: <StatusBadge text={r.status} tone={tone} />,
    sections,
    detailHref: "/hod/faculty/attendance",
    detailLabel: "All faculty attendance",
  };
}

interface AttendanceRecord {
  id: string;
  fullName: string;
  designation: string;
  status: string;
  firstInTime?: string | null;
  lastOutTime?: string | null;
  punctualityStatus?: string;
  totalHoursToday?: string;
}

interface FacultyAttendanceResponse {
  success: boolean;
  records?: AttendanceRecord[];
  summary?: {
    totalFaculty?: number;
    presentToday?: number;
    absentCount?: number;
    lateArrivals?: number;
  };
}

export function FacultyAttendanceView() {
  const { data, loading } = useApiResource<FacultyAttendanceResponse>("/api/faculty/attendance", {
    ttlMs: 30_000,
  });
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const records = data?.records ?? [];
  const summary = data?.summary;
  const absentCount = summary?.absentCount ?? records.filter((r) => r.status === "ABSENT").length;
  const lateCount =
    summary?.lateArrivals ?? records.filter((r) => r.punctualityStatus === "LATE").length;
  const totalCount = summary?.totalFaculty ?? records.length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Faculty Attendance</h1>
        <p className="text-xs text-text-muted">
          Today&#39;s check-in status, punctuality, and exceptions
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Absent Today" value={absentCount} tone={absentCount > 0 ? "danger" : "ok"} drilldown={{ label: "Faculty directory", href: "/hod/faculty/directory" }} />
        <KpiCard label="Late Arrivals" value={lateCount} tone={lateCount > 0 ? "warn" : "ok"} drilldown={{ label: "Faculty directory", href: "/hod/faculty/directory" }} />
        <KpiCard label="Total Faculty" value={totalCount} tone="neutral" drilldown={{ label: "Faculty directory", href: "/hod/faculty/directory" }} />
      </div>

      {loading && records.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No attendance records"
          description="Attendance data is currently empty or unavailable."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {records.map((r) => (
              <li
                key={r.id}
                onClick={() => inspect(buildHodFacultyAttendanceInspection(r))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inspect(buildHodFacultyAttendanceInspection(r));
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Inspect attendance record for ${r.fullName}`}
                className="surface-card bg-bg-surface p-3 cursor-pointer hover:bg-bg-elevated/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.fullName}</p>
                    <p className="text-xs text-text-muted">{r.designation}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "PRESENT" || r.status === "INSIDE"
                        ? "bg-emerald-500/10 text-action-success"
                        : r.status === "ABSENT"
                        ? "bg-rose-500/10 text-action-danger"
                        : "bg-amber-500/10 text-action-warning"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                  <span>First in: {r.firstInTime ?? "—"}</span>
                  {r.punctualityStatus === "LATE" && (
                    <span className="text-action-warning font-medium">Late</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AttendanceRecord>
              onRowClick={(r) => inspect(buildHodFacultyAttendanceInspection(r))}
              columns={[
                { header: "Name", accessor: (r) => r.fullName },
                { header: "Designation", accessor: (r) => r.designation },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span
                      className={`text-xs font-semibold ${
                        r.status === "PRESENT" || r.status === "INSIDE"
                          ? "text-action-success"
                          : r.status === "ABSENT"
                          ? "text-action-danger"
                          : "text-action-warning"
                      }`}
                    >
                      {r.status}
                    </span>
                  ),
                },
                {
                  header: "Punctuality",
                  accessor: (r) => (
                    <span
                      className={
                        r.punctualityStatus === "LATE"
                          ? "text-action-warning font-medium"
                          : "text-text-muted"
                      }
                    >
                      {r.punctualityStatus ?? "—"}
                    </span>
                  ),
                },
                { header: "First In", accessor: (r) => r.firstInTime ?? "—" },
              ]}
              data={records}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
