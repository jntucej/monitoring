"use client";

import React, { useState } from "react";
import { CountUp } from "@/components/shared/CountUp";
import {
  Users,
  CheckCircle2,
  Building2,
  Clock,
  UserX,
  Search,
  Filter,
  ArrowRightLeft,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Activity,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import type { FacultyMemberAttendance, DepartmentAttendanceSummary, HeatmapDay } from "@/lib/types";
import { Modal } from "@/components/ui/modal";

interface FacultyTrackingProps {
  records: FacultyMemberAttendance[];
  summary: {
    totalFaculty: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    lateArrivals: number;
    absentCount: number;
    overallAttendanceRate: number;
  };
  departmentSummaries: DepartmentAttendanceSummary[];
}

export function FacultyTracking({ records, summary, departmentSummaries }: FacultyTrackingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMemberAttendance | null>(null);
  const [activeHeatmapDay, setActiveHeatmapDay] = useState<HeatmapDay | null>(null);

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || r.department === selectedDept;
    const matchesStatus =
      selectedStatus === "ALL" ||
      r.status === selectedStatus ||
      (selectedStatus === "LATE" && r.punctualityStatus === "LATE");
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { setSelectedStatus("ALL"); setSelectedDept("ALL"); }}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-indigo-500/40 cursor-pointer transition-all space-y-1 group shadow-sm"
          title="Click to show all faculty records"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Total Faculty
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">
            <CountUp value={summary.totalFaculty} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] truncate">Across {departmentSummaries.length} departments</p>
        </div>

        <div
          onClick={() => setSelectedStatus("INSIDE")}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500/40 cursor-pointer transition-all space-y-1 group shadow-sm"
          title="Click to filter present faculty"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Present Today
          </div>
          <div className="text-2xl font-black text-emerald-400">
            <CountUp value={summary.presentToday} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">{summary.overallAttendanceRate}% attendance rate</p>
        </div>

        <div
          onClick={() => setSelectedStatus("INSIDE")}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-indigo-500/40 cursor-pointer transition-all space-y-1 group shadow-sm"
          title="Click to filter faculty inside campus"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Currently Inside
          </div>
          <div className="text-2xl font-black text-indigo-400">
            <CountUp value={summary.currentlyInside} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Active on campus</p>
        </div>

        <div
          onClick={() => setSelectedStatus("OUTSIDE")}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-amber-500/40 cursor-pointer transition-all space-y-1 group shadow-sm"
          title="Click to filter faculty currently outside"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            Currently Outside
          </div>
          <div className="text-2xl font-black text-amber-400">
            <CountUp value={summary.currentlyOutside} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Punched out / Off site</p>
        </div>

        <div
          onClick={() => setSelectedStatus("LATE")}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:border-rose-500/40 cursor-pointer transition-all space-y-1 group shadow-sm"
          title="Click to filter late arrivals"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            Late Check-ins
          </div>
          <div className="text-2xl font-black text-rose-400">
            <CountUp value={summary.lateArrivals} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">After 10:00 AM cut-off</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            <UserX className="w-3.5 h-3.5 text-slate-400" />
            Absent / Unchecked
          </div>
          <div className="text-2xl font-black text-[var(--text-muted)]">
            <CountUp value={summary.absentCount} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">No scan logged today</p>
        </div>
      </div>

      {/* Department Breakdown Section */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Departmental Attendance Breakdown
          </h2>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Overall Rate: <strong className="text-emerald-400">{summary.overallAttendanceRate}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {departmentSummaries.map((dept) => (
            <div
              key={dept.department}
              onClick={() => setSelectedDept(selectedDept === dept.department ? "ALL" : dept.department)}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                selectedDept === dept.department
                  ? "bg-indigo-500/10 border-indigo-500/40"
                  : "bg-[var(--background)]/50 border-[var(--border)] hover:bg-[var(--background)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[170px]">
                  {dept.department}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {dept.attendanceRate}%
                </span>
              </div>

              <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${dept.attendanceRate}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                <span>Total: {dept.totalFaculty}</span>
                <span>Present: {dept.presentCount}</span>
                <span className="text-indigo-400 font-semibold">Inside: {dept.insideCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search faculty by name, ID, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            Dept:
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Departments</option>
            {departmentSummaries.map((d) => (
              <option key={d.department} value={d.department}>
                {d.department}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="INSIDE">Currently Inside</option>
            <option value="OUTSIDE">Currently Outside</option>
            <option value="LATE">Late Check-ins</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Faculty Attendance Directory ({filteredRecords.length})
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Click any faculty row to open their profile overview & 30-day attendance heatmap.
            </p>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Updated live from Gate Logs
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No faculty members match the applied filters.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="pb-3 px-3">Faculty Details</th>
                  <th className="pb-3 px-3">Faculty ID</th>
                  <th className="pb-3 px-3">Department</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">First In</th>
                  <th className="pb-3 px-3">Last Out</th>
                  <th className="pb-3 px-3">Time Logged</th>
                  <th className="pb-3 px-3">Gate Terminal</th>
                  <th className="pb-3 px-3 text-right">Overview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredRecords.map((fac) => (
                  <tr
                    key={fac.id}
                    onClick={() => {
                      setSelectedFaculty(fac);
                      setActiveHeatmapDay(null);
                    }}
                    className="hover:bg-indigo-500/10 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs">
                          {fac.fullName.replace("Dr. ", "").replace("Prof. ", "").charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition">
                            {fac.fullName}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">{fac.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-indigo-400">
                      {fac.uniqueId}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[var(--text-primary)]">
                      {fac.department}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            fac.status === "INSIDE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : fac.status === "OUTSIDE"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {fac.status}
                        </span>
                        {fac.punctualityStatus === "LATE" && (
                          <span className="text-[9px] text-rose-400 font-semibold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> LATE (&gt;10:00 AM)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-primary)]">
                      {fac.firstInTime || "—"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {fac.lastOutTime || "—"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] font-semibold text-emerald-400">
                      {fac.totalHoursToday || "0 hrs"}
                    </td>
                    <td className="py-3.5 px-3 text-[11px] text-[var(--text-muted)]">
                      {fac.gateLocation ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                          {fac.gateLocation}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 group-hover:translate-x-0.5 transition">
                        View Heatmap <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Faculty Overview Modal */}
      {selectedFaculty && (
        <Modal
          isOpen={!!selectedFaculty}
          onClose={() => {
            setSelectedFaculty(null);
            setActiveHeatmapDay(null);
          }}
          title={`${selectedFaculty.fullName} — Attendance Overview`}
          size="xl"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Top Profile Summary Header */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-400 text-lg">
                    {selectedFaculty.fullName.replace("Dr. ", "").replace("Prof. ", "").charAt(0)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-surface)] ${
                      selectedFaculty.status === "INSIDE"
                        ? "bg-emerald-500"
                        : selectedFaculty.status === "OUTSIDE"
                        ? "bg-amber-500"
                        : "bg-slate-500"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedFaculty.fullName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold">
                      {selectedFaculty.uniqueId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-[var(--text-primary)] border border-slate-500/20 text-[10px] font-bold">
                      {selectedFaculty.department}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedFaculty.designation}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-[var(--text-muted)] flex-wrap">
                    {selectedFaculty.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-indigo-400" />
                        {selectedFaculty.email}
                      </span>
                    )}
                    {selectedFaculty.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {selectedFaculty.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--border)]">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    selectedFaculty.status === "INSIDE"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : selectedFaculty.status === "OUTSIDE"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {selectedFaculty.status === "INSIDE"
                    ? "● CURRENTLY ON CAMPUS"
                    : selectedFaculty.status === "OUTSIDE"
                    ? "○ PUNCHED OUT / OFF SITE"
                    : "✕ ABSENT TODAY"}
                </span>
                {selectedFaculty.punctualityStatus === "LATE" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> LATE CHECK-IN (&gt;10:00 AM)
                  </span>
                )}
                {selectedFaculty.punctualityStatus === "ON_TIME" && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ON TIME (&lt;10:00 AM)
                  </span>
                )}
              </div>
            </div>
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Attendance Rate
                </span>
                <div className="text-xl font-black text-emerald-400">
                  {selectedFaculty.attendanceRate ?? 92}%
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">30-day average</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Today&apos;s Time Logged
                </span>
                <div className="text-xl font-black text-indigo-400">
                  {selectedFaculty.totalHoursToday || "0 hrs"}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {selectedFaculty.firstInTime ? `In at ${selectedFaculty.firstInTime}` : "No check-in today"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Days Present
                </span>
                <div className="text-xl font-black text-[var(--text-primary)]">
                  {selectedFaculty.monthlyStats?.presentDays ?? 20} <span className="text-xs font-normal text-[var(--text-muted)]">/ 22</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Working days present</p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Late Arrivals
                </span>
                <div className="text-xl font-black text-amber-400">
                  {selectedFaculty.monthlyStats?.lateDays ?? 2}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Check-ins after 10:00 AM</p>
              </div>
            </div>
            {/* 30-Day Attendance Heatmap Calendar */}
            <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    30-Day Attendance Heatmap Overview
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Click or hover over any day tile below to inspect check-in/out logs & duration.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> On Time (&lt;10:00 AM)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Late (&gt;10:00 AM)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" /> Inside Today
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/40 inline-block" /> Absent
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-700/50 inline-block" /> Weekend
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 pt-2">
                {selectedFaculty.attendanceHeatmap?.map((day, idx) => {
                  const dayNum = day.date.slice(8);
                  const isSelected = activeHeatmapDay?.date === day.date;

                  let colorClass = "bg-slate-800/40 text-slate-400 border-slate-700/30";
                  if (day.status === "ON_TIME") {
                    colorClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500 hover:text-white";
                  } else if (day.status === "LATE") {
                    colorClass = "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500 hover:text-white";
                  } else if (day.status === "INSIDE") {
                    colorClass = "bg-indigo-500/30 text-indigo-300 border-indigo-500/60 font-bold hover:bg-indigo-600 hover:text-white animate-pulse";
                  } else if (day.status === "ABSENT") {
                    colorClass = "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30";
                  } else if (day.status === "WEEKEND") {
                    colorClass = "bg-slate-800/30 text-slate-500 border-slate-700/20 opacity-60";
                  }

                  return (
                    <button
                      key={day.date + idx}
                      onClick={() => setActiveHeatmapDay(day)}
                      onMouseEnter={() => setActiveHeatmapDay(day)}
                      className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center min-h-[52px] ${colorClass} ${
                        isSelected ? "ring-2 ring-indigo-400 scale-105" : ""
                      }`}
                    >
                      <span className="text-[10px] font-bold">{dayNum}</span>
                      <span className="text-[8px] opacity-80 uppercase">{day.dayLabel.split(",")[0]}</span>
                      {day.hours && day.hours > 0 ? (
                        <span className="text-[8px] font-mono mt-0.5">{day.hours}h</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {/* Active Day Detail Card */}
              {activeHeatmapDay && (
                <div className="p-3 rounded-lg bg-[var(--background)] border border-indigo-500/30 flex items-center justify-between text-xs transition mt-3">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-[var(--text-primary)]">{activeHeatmapDay.dayLabel}</div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activeHeatmapDay.status === "ON_TIME"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : activeHeatmapDay.status === "LATE"
                          ? "bg-amber-500/20 text-amber-400"
                          : activeHeatmapDay.status === "INSIDE"
                          ? "bg-indigo-500/20 text-indigo-400"
                          : activeHeatmapDay.status === "ABSENT"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {activeHeatmapDay.status === "LATE" ? "LATE ARRIVAL (>10:00 AM)" : activeHeatmapDay.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-muted)]">
                    {activeHeatmapDay.inTime && (
                      <span>In: <strong className="text-[var(--text-primary)]">{activeHeatmapDay.inTime}</strong></span>
                    )}
                    {activeHeatmapDay.outTime && (
                      <span>Out: <strong className="text-[var(--text-primary)]">{activeHeatmapDay.outTime}</strong></span>
                    )}
                    {activeHeatmapDay.hours ? (
                      <span>Spent: <strong className="text-emerald-400">{activeHeatmapDay.hours} hrs</strong></span>
                    ) : null}
                  </div>
                </div>
              )}

            {/* Movement Gate Logs */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Recent Gate Scans & Terminal Activity
              </h4>

              {selectedFaculty.recentLogs && selectedFaculty.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectedFaculty.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.direction === "IN"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {log.direction === "IN" ? "GATE ENTRY (IN)" : "GATE EXIT (OUT)"}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{log.gate}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  No gate scans logged yet for today.
                </div>
              )}
            </div>

            </div>


          </div>
        </Modal>
      )}
    </div>
  );
}


