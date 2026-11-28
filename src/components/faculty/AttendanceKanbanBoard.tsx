"use client";

import React, { useId, useState } from "react";
import { Check, X, Clock, User, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { displayId } from "@/lib/utils";

export interface AttendanceStudentRow {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  status: "present" | "absent" | "delayed";
  subject?: string;
  department?: string;
  year?: number;
  section?: string;
  avatarUrl?: string;
}

export interface AttendanceKanbanKpis {
  total: number;
  present: number;
  absent: number;
  delayed: number;
  attendanceRate?: number;
}

interface AttendanceKanbanBoardProps {
  rows: AttendanceStudentRow[];
  kpis: AttendanceKanbanKpis;
  onInspect?: (student: AttendanceStudentRow) => void;
  classes?: Array<{ id: string; label: string }>;
  selectedClassId?: string;
  onSelectClass?: (classId: string) => void;
  currentMonthLabel?: string;
}

export function AttendanceKanbanBoard({
  rows,
  kpis,
  onInspect,
  classes = [],
  selectedClassId,
  onSelectClass,
  currentMonthLabel = "February",
}: AttendanceKanbanBoardProps) {
  const [selectedDay, setSelectedDay] = useState<number>(14);
  const filterDescId = useId();

  const presentRows = rows.filter((r) => r.status === "present");
  const absentRows = rows.filter((r) => r.status === "absent");
  const delayedRows = rows.filter((r) => r.status === "delayed");

  const total = kpis.total > 0 ? kpis.total : rows.length || 1;
  const presentPct = Math.round((kpis.present / total) * 100);
  const absentPct = Math.round((kpis.absent / total) * 100);
  const delayedPct = Math.round((kpis.delayed / total) * 100);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 shadow-sm">
      {/* Left Column: Calendar & Barcode Progress */}
      <div className="xl:col-span-5 flex flex-col justify-between space-y-5 border-b xl:border-b-0 xl:border-r border-neutral-100 pb-6 xl:pb-0 xl:pr-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">Attendance</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Track student attendance, verify classroom check-ins, and monitor absences.
              </p>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="flex items-center justify-between mt-6 mb-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous month"
                className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 text-xs transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-neutral-900 px-2">{currentMonthLabel}</span>
              <button
                type="button"
                aria-label="Next month"
                className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 text-xs transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 bg-white"
              aria-describedby={filterDescId}
            >
              <Filter className="w-3 h-3 text-neutral-500" />
              <span>Active</span>
              <span className="w-4 h-4 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center font-bold">
                {rows.length}
              </span>
              <span id={filterDescId} className="sr-only">
                Active filter count
              </span>
            </div>
          </div>

          {/* Interactive Mini Calendar Grid */}
          <div className="bg-[#FAFAFB] rounded-2xl p-3.5 border border-neutral-100">
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-neutral-400 mb-2">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs">
              {Array.from({ length: 28 }).map((_, idx) => {
                const day = idx + 1;
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-xs font-medium transition ${
                      isSelected
                        ? "bg-[#111111] text-white shadow-sm font-semibold"
                        : "text-neutral-700 hover:bg-neutral-200/60"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Barcode Ratio Progress Cards */}
        <div className="space-y-3 pt-2">
          {/* Green Attendance Barcode Card */}
          <div className="p-3.5 rounded-2xl bg-[#F4FBF7] border border-emerald-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm font-bold text-xs">
                ✓
              </span>
              <div>
                <div className="text-sm font-bold text-neutral-900">
                  {kpis.present}/{total}
                </div>
                <div className="text-[11px] text-neutral-500">Attendance ({presentPct}%)</div>
              </div>
            </div>
            <div className="flex items-center gap-[2.5px] h-7 w-28">
              {Array.from({ length: 16 }).map((_, i) => {
                const filled = i < Math.round((presentPct / 100) * 16);
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${filled ? "h-full bg-emerald-500" : "h-3 bg-emerald-200/50"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Orange Absences Barcode Card */}
          <div className="p-3.5 rounded-2xl bg-[#FDF6F3] border border-orange-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center shadow-sm font-bold text-xs">
                ✕
              </span>
              <div>
                <div className="text-sm font-bold text-neutral-900">
                  {kpis.absent}/{total}
                </div>
                <div className="text-[11px] text-neutral-500">Absences ({absentPct}%)</div>
              </div>
            </div>
            <div className="flex items-center gap-[2.5px] h-7 w-28">
              {Array.from({ length: 16 }).map((_, i) => {
                const filled = i < Math.round((absentPct / 100) * 16);
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${filled ? "h-full bg-orange-500" : "h-3 bg-orange-200/50"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Purple Delayed Barcode Card */}
          <div className="p-3.5 rounded-2xl bg-[#F6F5FD] border border-indigo-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-sm font-bold text-xs">
                ◔
              </span>
              <div>
                <div className="text-sm font-bold text-neutral-900">
                  {kpis.delayed}/{total}
                </div>
                <div className="text-[11px] text-neutral-500">Delayed ({delayedPct}%)</div>
              </div>
            </div>
            <div className="flex items-center gap-[2.5px] h-7 w-28">
              {Array.from({ length: 16 }).map((_, i) => {
                const filled = i < Math.round((delayedPct / 100) * 16);
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${filled ? "h-full bg-indigo-500" : "h-3 bg-indigo-200/50"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Class Filter & 3-Column Student Kanban */}
      <div className="xl:col-span-7 flex flex-col min-w-0">
        {/* Class Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-xs font-medium text-neutral-500">
            Select a student to view details
          </span>
          {classes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {classes.map((cls) => {
                const active = selectedClassId === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => onSelectClass?.(cls.id)}
                    className={`px-3 py-1 rounded-full text-xs transition font-medium ${
                      active
                        ? "bg-[#111111] text-white font-semibold shadow-sm"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {active ? "● " : ""}
                    {cls.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3-Column Kanban Board */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1 min-w-0">
          {/* Column 1: Attendance (Present) */}
          <div className="bg-[#FAFAFB] rounded-2xl p-3 border border-neutral-100 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Present
              </span>
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                {presentRows.length}
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-0.5 flex-1">
              {presentRows.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
                  No present records
                </div>
              ) : (
                presentRows.map((s) => (
                  <StudentCard key={s.id} student={s} tone="emerald" onInspect={onInspect} />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Absences */}
          <div className="bg-[#FAFAFB] rounded-2xl p-3 border border-neutral-100 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Absences
              </span>
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                {absentRows.length}
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-0.5 flex-1">
              {absentRows.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
                  No absent records
                </div>
              ) : (
                absentRows.map((s) => (
                  <StudentCard key={s.id} student={s} tone="orange" onInspect={onInspect} />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Delayed */}
          <div className="bg-[#FAFAFB] rounded-2xl p-3 border border-neutral-100 flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Delayed
              </span>
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                {delayedRows.length}
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-0.5 flex-1">
              {delayedRows.length === 0 ? (
                <div className="h-28 flex items-center justify-center text-xs text-neutral-400 text-center px-2">
                  No delayed records
                </div>
              ) : (
                delayedRows.map((s) => (
                  <StudentCard key={s.id} student={s} tone="indigo" onInspect={onInspect} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentCard({
  student,
  tone,
  onInspect,
}: {
  student: AttendanceStudentRow;
  tone: "emerald" | "orange" | "indigo";
  onInspect?: (s: AttendanceStudentRow) => void;
}) {
  const rollLabel = student.roll || student.uniqueId || displayId(student.id, "Student");
  const metaLabel =
    student.year != null && student.section
      ? `Y${student.year} · Sec ${student.section}`
      : student.subject || student.department || "Class section";

  const badgeBg = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  }[tone];

  return (
    <button
      type="button"
      onClick={() => onInspect?.(student)}
      className="w-full text-left bg-white rounded-xl p-3 border border-neutral-200/80 hover:border-neutral-400 hover:shadow-sm transition flex items-center justify-between gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 font-semibold text-xs">
          {student.name ? student.name.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-neutral-900 truncate">{student.name}</div>
          <div className="text-[11px] font-mono text-neutral-500 truncate">{rollLabel}</div>
        </div>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badgeBg}`}>
        {metaLabel}
      </span>
    </button>
  );
}
