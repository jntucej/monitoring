"use client";

import React, { useState } from "react";
import { X, Users } from "lucide-react";
import { displayId } from "@/lib/utils";

export interface ScheduleSessionSlot {
  id: string;
  subjectName: string;
  subjectCode?: string;
  section?: string;
  roomNumber?: string;
  startTime: string; // "09:00" or ISO
  endTime: string;   // "10:00"
  dayOfWeek?: number; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  facultyName?: string;
  attendanceMarked?: boolean;
  statusTone?: "purple" | "sky" | "indigo" | "rose" | "amber" | "emerald";
  studentCount?: number;
}

export interface StudentAnalyticsItem {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  delayedCount: number;
  assignmentsCompleted?: number;
  assignmentsTotal?: number;
}

interface WeeklyScheduleGridProps {
  sessions: ScheduleSessionSlot[];
  studentAnalytics?: StudentAnalyticsItem[];
  onInspectSession?: (session: ScheduleSessionSlot) => void;
  onInspectStudent?: (student: StudentAnalyticsItem) => void;
  title?: string;
  dateRangeLabel?: string;
}

const WEEKDAYS = [
  { day: 1, label: "Mon", short: "1 · Mon" },
  { day: 2, label: "Tue", short: "2 · Tue" },
  { day: 3, label: "Wed", short: "3 · Wed" },
  { day: 4, label: "Thu", short: "4 · Thu" },
  { day: 5, label: "Fri", short: "5 · Fri" },
  { day: 6, label: "Sat", short: "6 · Sat" },
  { day: 7, label: "Sun", short: "7 · Sun" },
];

const TIME_BLOCKS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00"];

export function WeeklyScheduleGrid({
  sessions,
  studentAnalytics = [],
  onInspectSession,
  onInspectStudent,
  title = "Weekly Timetable",
  dateRangeLabel = "Class Schedule",
}: WeeklyScheduleGridProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState("");

  // Extract distinct subjects
  const subjects = ["All", ...Array.from(new Set(sessions.map((s) => s.subjectName).filter(Boolean)))];

  const filteredSessions = sessions.filter((s) => {
    if (selectedSubject === "All") return true;
    return s.subjectName === selectedSubject;
  });

  const filteredStudents = studentAnalytics.filter((st) => {
    if (!analyticsSearch) return true;
    const q = analyticsSearch.toLowerCase();
    const roll = st.roll || st.uniqueId || "";
    return st.name.toLowerCase().includes(q) || roll.toLowerCase().includes(q);
  });

  // Map session to day & hour
  const getSessionsForSlot = (dayNum: number, timeStr: string) => {
    const slotHour = parseInt(timeStr.split(":")[0], 10);
    return filteredSessions.filter((s) => {
      // Day match (if dayOfWeek is undefined, treat as Mon-Fri or matching)
      if (s.dayOfWeek !== undefined && s.dayOfWeek !== dayNum) return false;
      // Time match: compare start hour
      if (s.startTime) {
        const h = parseInt(s.startTime.split(":")[0], 10);
        return h === slotHour;
      }
      return false;
    });
  };

  const getSlotColorClasses = (s: ScheduleSessionSlot) => {
    if (s.statusTone === "emerald" || s.attendanceMarked) {
      return "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80";
    }
    if (s.statusTone === "rose") {
      return "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/80";
    }
    if (s.statusTone === "amber") {
      return "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/80";
    }
    if (s.statusTone === "sky") {
      return "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100/80";
    }
    return "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100/80";
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">{title}</h2>
            <div className="text-xs text-neutral-500 font-medium">{dateRangeLabel}</div>
          </div>

          {/* Subject Pills */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            {subjects.slice(0, 6).map((subj) => {
              const active = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-2.5 py-1 rounded-full text-xs transition font-medium ${
                    active
                      ? "bg-[#111111] text-white font-semibold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {active ? "● " : ""}
                  {subj}
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics Switcher Modal Button */}
        <div className="flex items-center gap-2">
          {studentAnalytics.length > 0 && (
            <button
              type="button"
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Student Analytics ({studentAnalytics.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Timetable Grid */}
      <div className="overflow-x-auto border border-neutral-200/80 rounded-2xl">
        {/* Table Header */}
        <div className="min-w-[760px] grid grid-cols-8 bg-[#FAFAFB] border-b border-neutral-200/80 text-xs font-medium text-neutral-500">
          <div className="p-3 text-center">Time</div>
          {WEEKDAYS.map((w) => (
            <div
              key={w.day}
              className={`p-3 text-center border-l border-neutral-100 ${
                w.day === 2 ? "bg-neutral-900 text-white font-semibold" : ""
              }`}
            >
              {w.short}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="min-w-[760px] divide-y divide-neutral-100 text-xs bg-white">
          {TIME_BLOCKS.map((timeStr) => {
            return (
              <div key={timeStr} className="grid grid-cols-8 min-h-[76px]">
                <div className="p-3 text-neutral-400 text-center font-mono text-[11px] select-none flex items-center justify-center">
                  {timeStr}
                </div>
                {WEEKDAYS.map((w) => {
                  const slots = getSessionsForSlot(w.day, timeStr);
                  return (
                    <div
                      key={w.day}
                      className="border-l border-neutral-100 p-1.5 flex flex-col gap-1.5 justify-center min-h-[76px]"
                    >
                      {slots.length === 0 ? (
                        <div className="h-full w-full" />
                      ) : (
                        slots.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onInspectSession?.(s)}
                            className={`p-2 rounded-xl border text-left transition w-full shadow-xs ${getSlotColorClasses(
                              s
                            )}`}
                          >
                            <div className="font-semibold text-xs leading-snug line-clamp-1">{s.subjectName}</div>
                            <div className="text-[10px] opacity-75 font-mono mt-0.5">
                              {s.startTime}–{s.endTime}
                              {s.roomNumber ? ` · Rm ${s.roomNumber}` : ""}
                            </div>
                            <div className="text-[10px] mt-1 flex items-center justify-between">
                              <span className="truncate max-w-[80px]">
                                {s.section ? `Sec ${s.section}` : s.facultyName || "Class"}
                              </span>
                              {s.attendanceMarked && (
                                <span className="font-bold text-[9px] uppercase tracking-wide text-emerald-800">
                                  Marked
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Analytics Switcher Modal */}
      {isAnalyticsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-neutral-200 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Student & Subject Analytics</h3>
                <p className="text-xs text-neutral-500">
                  Review student attendance records, punctuality rates, and academic progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="my-3">
              <input
                type="text"
                placeholder="Search student name or roll..."
                value={analyticsSearch}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            {/* Student List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400">
                  No students matching search criteria.
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const rollLabel = st.roll || st.uniqueId || displayId(st.id, "Student");
                  return (
                    <div
                      key={st.id}
                      className="p-3 rounded-2xl border border-neutral-100 bg-[#FAFAFB] hover:border-neutral-300 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-neutral-900 truncate">{st.name}</div>
                          <div className="text-[11px] font-mono text-neutral-500">{rollLabel}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-neutral-900">{st.attendanceRate}%</div>
                          <div className="text-[10px] text-neutral-500">
                            {st.presentCount}P / {st.absentCount}A
                          </div>
                        </div>
                        {onInspectStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              onInspectStudent(st);
                              setIsAnalyticsModalOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-medium hover:bg-neutral-800 transition"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-neutral-100 flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
