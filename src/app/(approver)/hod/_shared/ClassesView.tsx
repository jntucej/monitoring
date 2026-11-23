"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildHodScheduleInspection, type HodScheduleRecord } from "@/lib/role-registers/hodInspections";
import { TimetableSlotCard } from "@/components/nav/TimetableSlotCard";
import type { ResolvedTimetableSlot } from "@/lib/timetable-resolver";

interface ScheduleItem {
  id: string;
  periodNumber?: number;
  subjectName?: string;
  subjectCode?: string;
  roomNumber?: string;
  startTime?: string;
  endTime?: string;
  attendanceMarked?: boolean;
  className?: string;
  year?: number;
  section?: string;
}

interface ScheduleResponse {
  success?: boolean;
  data?: ScheduleItem[] | { schedule?: ScheduleItem[]; items?: ScheduleItem[] };
}

export function ClassesView() {
  const { data, loading } = useApiResource<ScheduleResponse>("/api/hod/schedule", {
    ttlMs: 30_000,
  });
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [filter, setFilter] = useState<"all" | "pending" | "marked">("pending");

  const raw = data?.data;
  const items: ScheduleItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.schedule)
    ? raw.schedule
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  const markedCount = items.filter((i) => i.attendanceMarked).length;
  const pendingCount = items.length - markedCount;
  const deckItems = items.filter((i) => {
    if (filter === "pending") return !i.attendanceMarked;
    if (filter === "marked") return Boolean(i.attendanceMarked);
    return true;
  });

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Class Schedule</h1>
        <p className="text-xs text-text-muted">
          Department timetable, assigned periods, and attendance status
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Scheduled Classes" value={items.length} tone="ok" onClick={() => setFilter("all")} />
        <KpiCard label="Marked" value={markedCount} tone="ok" onClick={() => setFilter("marked")} />
        <KpiCard
          label="Pending Attendance"
          value={pendingCount}
          tone={pendingCount > 0 ? "warn" : "ok"}
          onClick={() => setFilter("pending")}
        />
      </div>

      {loading && items.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No classes scheduled"
          description="Schedule records are currently unavailable for today."
        />
      ) : (
        <div className="space-y-5">
          {/* BAND 2: Action Deck */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {filter === "pending"
                  ? `Pending Attendance (${deckItems.length})`
                  : filter === "marked"
                  ? `Marked Classes (${deckItems.length})`
                  : `All Scheduled Classes (${deckItems.length})`}
              </h2>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="text-xs font-medium text-action-primary hover:underline"
                >
                  Show all ({items.length})
                </button>
              )}
            </div>

            {deckItems.length === 0 ? (
              <div className="surface-card p-5 text-center space-y-1">
                <CheckCircle2 className="size-5 text-action-success mx-auto" />
                <p className="text-sm font-semibold text-text-primary">
                  All today&apos;s classes have attendance marked.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deckItems.map((item, idx) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const slot: ResolvedTimetableSlot = {
                    id: item.id ?? `slot-${idx}`,
                    date: today,
                    periodNumber: item.periodNumber ?? idx + 1,
                    startTime: item.startTime ?? "09:00",
                    endTime: item.endTime ?? "09:50",
                    classId: item.id ?? `class-${idx}`,
                    classLabel:
                      item.className ??
                      (item.year ? `Y${item.year} - Sec ${item.section ?? "A"}` : "Class"),
                    subjectCode: item.subjectCode ?? "SUB",
                    subjectLabel: item.subjectName ?? item.subjectCode ?? `Period ${item.periodNumber ?? idx + 1}`,
                    facultyId: "hod",
                    facultyName: "Department Faculty",
                    roomNumber: item.roomNumber ?? null,
                    status: item.attendanceMarked ? "confirmed" : "scheduled",
                    attendanceMarked: Boolean(item.attendanceMarked),
                  };
                  return (
                    <TimetableSlotCard
                      key={slot.id}
                      slot={slot}
                      role="hod"
                      onInspect={() => inspect(buildHodScheduleInspection(item))}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* BAND 3: Collapsible Timetable Ledger */}
          <details className="surface-card bg-bg-surface/60 p-3">
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Full Class Timetable Ledger ({items.length})</span>
              <ChevronDown className="size-4 text-text-muted" />
            </summary>
            <div className="mt-3">
              <DataTable<ScheduleItem>
                onRowClick={(item) => inspect(buildHodScheduleInspection(item))}
                columns={[
                  {
                    header: "Period",
                    accessor: (r) => (r.periodNumber ? `Period ${r.periodNumber}` : "—"),
                  },
                  {
                    header: "Subject",
                    accessor: (r) => r.subjectName ?? r.subjectCode ?? "—",
                  },
                  {
                    header: "Class / Room",
                    accessor: (r) =>
                      `${r.className ?? (r.year ? `Y${r.year} ${r.section ?? ""}` : "—")} (Room ${r.roomNumber ?? "—"})`,
                  },
                  {
                    header: "Time",
                    accessor: (r) => (r.startTime ? `${r.startTime} – ${r.endTime ?? ""}` : "—"),
                  },
                  {
                    header: "Attendance",
                    accessor: (r) => (
                      <span
                        className={`text-xs font-semibold ${
                          r.attendanceMarked ? "text-action-success" : "text-action-warning"
                        }`}
                      >
                        {r.attendanceMarked ? "Marked" : "Pending"}
                      </span>
                    ),
                  },
                ]}
                data={items}
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
