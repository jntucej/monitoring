"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { AttendanceKanbanBoard, type AttendanceStudentRow, type AttendanceKanbanKpis } from "@/components/faculty/AttendanceKanbanBoard";
import { WeeklyScheduleGrid, type ScheduleSessionSlot, type StudentAnalyticsItem } from "@/components/faculty/WeeklyScheduleGrid";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildStudentDirectoryInspection } from "@/lib/role-registers/studentDirectoryInspection";
import { buildHodScheduleInspection } from "@/lib/role-registers/hodInspections";
import { Users, Calendar, AlertCircle } from "lucide-react";
import type { FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/lib/types";

interface FacultyAttendanceApiResponse {
  success: boolean;
  summary?: {
    totalFaculty: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    lateArrivals: number;
    absentCount: number;
    overallAttendanceRate: number;
  };
  departmentSummaries?: DepartmentAttendanceSummary[];
  records?: FacultyMemberAttendance[];
  error?: string;
}

interface ScheduleApiResponse {
  success?: boolean;
  data?: {
    schedule?: Array<{
      id: string;
      subject: string;
      section: string;
      room: string | null;
      startsAt: string;
      endsAt: string;
      marked: boolean;
    }>;
  };
}

function FacultyAttendanceInner() {
  const [activeTab, setActiveTab] = useState<"kanban" | "schedule">("kanban");
  const { inspection, inspect, closeInspection } = useEntityInspector();

  // Primary attendance resource
  const {
    data: attData,
    loading: attLoading,
    error: attError,
  } = useApiResource<FacultyAttendanceApiResponse>("/api/faculty/attendance", { ttlMs: 30_000 });

  // Schedule resource for timetable grid
  const {
    data: schedData,
  } = useApiResource<ScheduleApiResponse>("/api/hod/schedule", { ttlMs: 30_000 });

  const summary = attData?.summary;
  const records = attData?.records || [];

  // Map real records into Kanban student rows
  const kanbanRows: AttendanceStudentRow[] = records.map((r) => {
    let status: "present" | "absent" | "delayed" = "absent";
    if (r.status === "INSIDE" || r.status === "OUTSIDE") {
      status = r.punctualityStatus === "LATE" ? "delayed" : "present";
    }

    return {
      id: r.id,
      name: r.fullName,
      roll: r.uniqueId || undefined,
      uniqueId: r.uniqueId,
      status,
      subject: r.designation || undefined,
      department: r.department,
    };
  });

  const kpis: AttendanceKanbanKpis = {
    total: summary?.totalFaculty || kanbanRows.length,
    present: summary?.presentToday || kanbanRows.filter((r) => r.status === "present").length,
    absent: summary?.absentCount || kanbanRows.filter((r) => r.status === "absent").length,
    delayed: summary?.lateArrivals || kanbanRows.filter((r) => r.status === "delayed").length,
    attendanceRate: summary?.overallAttendanceRate,
  };

  // Map real schedule rows
  const rawSchedule = schedData?.data?.schedule || [];
  const scheduleSlots: ScheduleSessionSlot[] = rawSchedule.map((s, idx) => ({
    id: s.id,
    subjectName: s.subject,
    section: s.section,
    roomNumber: s.room || undefined,
    startTime: s.startsAt || "09:00",
    endTime: s.endsAt || "10:00",
    dayOfWeek: (idx % 5) + 1, // Mon-Fri cycle
    attendanceMarked: s.marked,
    statusTone: s.marked ? "emerald" : "purple",
  }));

  const studentAnalytics: StudentAnalyticsItem[] = records.map((r) => {
    const isPresent = r.status === "INSIDE" || r.status === "OUTSIDE";
    return {
      id: r.id,
      name: r.fullName,
      roll: r.uniqueId,
      uniqueId: r.uniqueId,
      attendanceRate: r.attendanceRate ?? (isPresent ? 100 : 0),
      presentCount: isPresent ? 1 : 0,
      absentCount: r.status === "ABSENT" ? 1 : 0,
      delayedCount: r.punctualityStatus === "LATE" ? 1 : 0,
    };
  });

  const handleInspectStudent = (student: AttendanceStudentRow | StudentAnalyticsItem) => {
    inspect(
      buildStudentDirectoryInspection({
        id: student.id,
        name: student.name,
        roll: student.roll || student.uniqueId,
        uniqueId: student.uniqueId,
        department: "department" in student ? student.department : undefined,
        status: "status" in student ? student.status.toUpperCase() : "ACTIVE",
      })
    );
  };

  const handleInspectSession = (session: ScheduleSessionSlot) => {
    inspect(
      buildHodScheduleInspection({
        id: session.id,
        subjectName: session.subjectName,
        subjectCode: session.subjectCode,
        section: session.section,
        roomNumber: session.roomNumber,
        startTime: session.startTime,
        endTime: session.endTime,
        attendanceMarked: session.attendanceMarked,
      })
    );
  };

  return (
    <div className="min-h-dvh bg-bg-elevated p-4 sm:p-6 md:p-6 space-y-5">
      {/* 3-Band Layout Band 1: Context Situation Bar */}
      <ContextSituationBar
        roleLabel="Faculty · Teacher Ops"
        purpose="Track student and classroom attendance, review punctuality, and inspect weekly sessions."
        why="Real-time attendance ensures verified presence across batches and supports academic compliance."
        contextLabel="Attendance & Operations"
        statusTone="info"
        statusPill={`${kpis.present}/${kpis.total} Active`}
        statusSummary={`${kpis.attendanceRate ?? Math.round((kpis.present / (kpis.total || 1)) * 100)}% attendance verified across assigned cohorts.`}
        primaryAction={{ label: "My Classes", href: "/faculty/my-classes" }}
        secondaryActions={[
          { label: "Student Directory", href: "/faculty/student-directory" },
          { label: "Reports", href: "/faculty/reports" },
        ]}
      />

      {/* View Switcher Pills */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("kanban")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "kanban"
              ? "bg-[#111111] text-white shadow-sm"
              : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Attendance Board</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "schedule"
              ? "bg-[#111111] text-white shadow-sm"
              : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Weekly Timetable</span>
        </button>
      </div>

      {attError && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-action-warning flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{attError}</span>
        </div>
      )}

      {/* 3-Band Layout Band 2 & 3: Workspace */}
      <WidgetBoundary name="AttendanceWorkspace" title="Teacher Operations Workspace">
        {activeTab === "kanban" ? (
          <AttendanceKanbanBoard
            rows={kanbanRows}
            kpis={kpis}
            onInspect={handleInspectStudent}
          />
        ) : (
          <WeeklyScheduleGrid
            sessions={scheduleSlots}
            studentAnalytics={studentAnalytics}
            onInspectSession={handleInspectSession}
            onInspectStudent={handleInspectStudent}
            title="Assigned Class Timetable"
            dateRangeLabel="Academic Session Schedule"
          />
        )}
      </WidgetBoundary>

      {/* Inspector Panel */}
      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function FacultyAttendancePage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <FacultyAttendanceInner />
    </AuthGuard>
  );
}
