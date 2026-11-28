"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { BarcodeRatioCard } from "@/components/shared/BarcodeRatioCard";
import { CondonationComposer } from "@/components/student/CondonationComposer";

/**
 * StudentAcademicsHub — a high-context academics view: overall attendance +
 * 75% threshold alert + per-subject barcode ratio cards + assignment status
 * pills + next exam. Reads ONLY real student APIs (no mock data):
 *   /api/student/attendance  -> { summary:{pct,present,total,...}, subjects:[{classId,present,total,pct}] }
 *   /api/student/assignments -> { assignments:[{id,title,dueAt,myStatus,myMarks,maxMarks}] }
 *   /api/student/next-exam   -> { data: {date,label,subject} | null }
 *
 * No raw UUIDs rendered: subject uses the human `classId` (subject code), and
 * assignment rows are keyed by React key only (never rendered text).
 */
interface SubjectRow {
  classId: string;
  present: number;
  absent: number;
  total: number;
  pct: number;
}
interface AssignmentRow {
  id: string;
  title: string;
  dueAt?: string | null;
  myStatus?: string;
  myMarks?: number | null;
  maxMarks?: number | null;
}

export function StudentAcademicsHub() {
  const { data: attRes } = useApiResource<{
    data?: { summary?: { pct?: number; present?: number; total?: number }; subjects?: SubjectRow[] };
  }>("/api/student/attendance");

  const { data: assignRes } = useApiResource<{
    data?: { assignments?: AssignmentRow[] };
  }>("/api/student/assignments");

  const { data: examRes } = useApiResource<{
    data?: { date: string; label: string; subject: string | null } | null;
  }>("/api/student/next-exam");

  const subjects = attRes?.data?.subjects ?? [];
  const summary = attRes?.data?.summary;
  const overallPct = summary?.pct ?? 0;
  const totalClasses = summary?.total ?? 0;
  const totalPresent = summary?.present ?? 0;
  const totalAbsent = totalClasses - totalPresent;

  const assignments = useMemo<AssignmentRow[]>(
    () => assignRes?.data?.assignments ?? [],
    [assignRes?.data?.assignments],
  );
  const nextExam = examRes?.data ?? null;

  const belowThreshold = totalClasses > 0 && overallPct < 75;

  const assignmentCounts = useMemo(() => {
    const c = { pending: 0, submitted: 0, graded: 0, late: 0 };
    for (const a of assignments) {
      const s = String(a.myStatus ?? "PENDING").toUpperCase();
      if (s === "GRADED") c.graded++;
      else if (s === "SUBMITTED") c.submitted++;
      else if (s === "LATE") c.late++;
      else c.pending++;
    }
    return c;
  }, [assignments]);

  const topSubjects = subjects.slice(0, 4);
  const completedAssignments = assignmentCounts.submitted + assignmentCounts.graded;

  return (
    <div className="space-y-4">
      {/* 75% threshold alert */}
      {belowThreshold && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-rose-900">
              Attendance Below 75% Threshold ({overallPct}%)
            </div>
            <p className="text-xs text-rose-800 mt-0.5">
              Attend upcoming sessions or raise a mark dispute if an entry is wrong.
            </p>
          </div>
          <Link
            href="/student/attendance"
            className="px-3 py-1.5 rounded-xl bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800"
          >
            Review Attendance →
          </Link>
        </div>
      )}

      {/* Condonation composer: self-gates — only renders when the student is
          in the condonation band (65–75%) and a remedy is available. */}
      <CondonationComposer />

      {/* Top-3 KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-bg-surface border border-border">
          <div className="text-xs font-semibold text-text-secondary">Overall Attendance</div>
          <div className="text-2xl font-bold text-text-primary tabular-nums mt-1">
            {totalClasses > 0 ? `${overallPct}%` : "—"}
          </div>
          <div className="text-xs font-medium text-text-muted mt-0.5">
            {totalClasses > 0 ? `${totalPresent} of ${totalClasses} classes attended` : "No attendance recorded yet"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-bg-surface border border-border">
          <div className="text-xs font-semibold text-text-secondary">Assignments Done</div>
          <div className="text-2xl font-bold text-text-primary tabular-nums mt-1">
            {assignments.length > 0 ? `${completedAssignments}/${assignments.length}` : "—"}
          </div>
          <div className="text-xs font-medium text-text-muted mt-0.5">
            {assignmentCounts.pending} pending · {assignmentCounts.late} late
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-bg-surface border border-border">
          <div className="text-xs font-semibold text-text-secondary">Next Exam</div>
          <div className="text-base font-bold text-text-primary truncate mt-1">
            {nextExam ? `${nextExam.subject ?? nextExam.label}` : "No upcoming exam"}
          </div>
          <div className="text-xs font-medium text-text-muted mt-0.5">
            {nextExam ? new Date(nextExam.date).toLocaleDateString() : "Check exam schedule"}
          </div>
        </div>
      </div>

      {/* Barcode ratio cards: attendance + top subjects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BarcodeRatioCard
          label="Present Classes"
          count={totalPresent}
          total={totalClasses}
          tone="emerald"
        />
        <BarcodeRatioCard
          label="Missed Classes"
          count={totalAbsent}
          total={totalClasses}
          tone="orange"
        />
        <BarcodeRatioCard
          label="Completed Assignments"
          count={completedAssignments}
          total={assignments.length}
          tone="indigo"
        />
      </div>

      {/* Per-subject risk bars */}
      {topSubjects.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-bg-elevated/50 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-text-primary">Subject Attendance</h3>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/student/attendance" className="text-action-primary hover:underline">
                Full Attendance
              </Link>
              <Link href="/student/marks" className="text-action-primary hover:underline">
                Internal Marks
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border/60">
            {topSubjects.map((s) => (
              <div key={s.classId} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                <span className="w-16 font-semibold text-text-primary truncate">
                  {s.classId || "—"}
                </span>
                <div className="flex-1">
                  <BarcodeRatioCard
                    label={`${s.classId || "Subject"} attendance`}
                    count={s.present}
                    total={s.total}
                    tone={s.pct >= 75 ? "emerald" : s.pct >= 60 ? "orange" : "rose"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent assignments + deep links */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-bg-elevated/50 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-text-primary">Recent Assignments &amp; Deadlines</h3>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link href="/student/marks" className="text-action-primary hover:underline">
              All Marks
            </Link>
            <Link href="/student/exams" className="text-action-primary hover:underline">
              Exam Schedule
            </Link>
          </div>
        </div>
        {assignments.length === 0 ? (
          <div className="p-4 text-xs font-medium text-text-muted">
            No active assignments right now.
          </div>
        ) : (
          <div className="divide-y divide-border/60 text-xs">
            {assignments.slice(0, 5).map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary truncate">{a.title}</div>
                  {a.dueAt && (
                    <div className="text-[11px] font-medium text-text-muted">
                      Due: {new Date(a.dueAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                    a.myStatus === "GRADED"
                      ? "bg-emerald-100 text-emerald-800"
                      : a.myStatus === "SUBMITTED"
                        ? "bg-indigo-100 text-indigo-800"
                        : a.myStatus === "LATE"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-bg-elevated border border-border text-text-secondary"
                  }`}
                >
                  {String(a.myStatus ?? "PENDING")}
                  {a.myMarks != null ? ` · ${a.myMarks}${a.maxMarks ? `/${a.maxMarks}` : ""}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
