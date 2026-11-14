"use client";

import React, { useState } from "react";
import { CountUp } from "@/components/admin/shared/CountUp";
import {Users, CheckCircle2, Building2, Clock, UserX, Search, Filter, ArrowRightLeft, MapPin, Mail, Phone, Calendar, Activity, AlertTriangle, ChevronRight}  from "lucide-react";
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
          className="surface-card p-4 bg-bg-surface hover: cursor-pointer transition-all space-y-1 group"
          title="Click to show all faculty records"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Users className="w-3.5 h-3.5 text-action-primary" />
            Total Faculty
          </div>
          <div className="text-2xl font-black text-text-primary">
            <CountUp value={summary.totalFaculty} />
          </div>
          <p className="text-xs text-text-muted truncate">Across {departmentSummaries.length} departments</p>
        </div>

        <div
          onClick={() => setSelectedStatus("INSIDE")}
          className="surface-card p-4 bg-bg-surface hover: cursor-pointer transition-all space-y-1 group"
          title="Click to filter present faculty"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <CheckCircle2 className="w-3.5 h-3.5 text-action-success" />
            Present Today
          </div>
          <div className="text-2xl font-black text-action-success">
            <CountUp value={summary.presentToday} />
          </div>
          <p className="text-xs text-text-muted">{summary.overallAttendanceRate}% attendance rate</p>
        </div>

        <div
          onClick={() => setSelectedStatus("INSIDE")}
          className="surface-card p-4 bg-bg-surface hover: cursor-pointer transition-all space-y-1 group"
          title="Click to filter faculty inside campus"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Building2 className="w-3.5 h-3.5 text-action-primary" />
            Currently Inside
          </div>
          <div className="text-2xl font-black text-action-primary">
            <CountUp value={summary.currentlyInside} />
          </div>
          <p className="text-xs text-text-muted">Active on campus</p>
        </div>

        <div
          onClick={() => setSelectedStatus("OUTSIDE")}
          className="surface-card p-4 bg-bg-surface hover: cursor-pointer transition-all space-y-1 group"
          title="Click to filter faculty currently outside"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <ArrowRightLeft className="w-3.5 h-3.5 text-action-warning" />
            Currently Outside
          </div>
          <div className="text-2xl font-black text-action-warning">
            <CountUp value={summary.currentlyOutside} />
          </div>
          <p className="text-xs text-text-muted">Punched out / Off site</p>
        </div>

        <div
          onClick={() => setSelectedStatus("LATE")}
          className="surface-card p-4 bg-bg-surface hover: cursor-pointer transition-all space-y-1 group"
          title="Click to filter late arrivals"
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Clock className="w-3.5 h-3.5 text-action-danger" />
            Late Check-ins
          </div>
          <div className="text-2xl font-black text-action-danger">
            <CountUp value={summary.lateArrivals} />
          </div>
          <p className="text-xs text-text-muted">After 10:00 AM cut-off</p>
        </div>

        <div className="surface-card p-4 bg-bg-surface space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <UserX className="w-3.5 h-3.5 text-text-muted" />
            Absent / Unchecked
          </div>
          <div className="text-2xl font-black text-text-muted">
            <CountUp value={summary.absentCount} />
          </div>
          <p className="text-xs text-text-muted">No scan logged today</p>
        </div>
      </div>

      {/* Department Breakdown Section */}
      <div className="surface-card p-5 bg-bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-4 h-4 text-action-primary" />
            Departmental Attendance Breakdown
          </h2>
          <span className="text-xs font-mono text-text-muted">
            Overall Rate: <strong className="text-action-success">{summary.overallAttendanceRate}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {departmentSummaries.map((dept) => (
            <div
              key={dept.department}
              onClick={() => setSelectedDept(selectedDept === dept.department ? "ALL" : dept.department)}
              className={`p-3.5 transition cursor-pointer "" "hover:bg-[var(--background)]" "" "hover:bg-[var(--background)]"`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-text-primary truncate max-w-[170px]">
                  {dept.department}
                </span>
                <span className="text-xs font-mono font-bold text-action-success">
                  {dept.attendanceRate}%
                </span>
              </div>

              <div className="w-full h-1.5 bg-bg-surface overflow-hidden mb-2">
                <div
                  className="h-full bg-action-success transition-all"
                  style={{ width: `${dept.attendanceRate}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-text-muted">
                <span>Total: {dept.totalFaculty}</span>
                <span>Present: {dept.presentCount}</span>
                <span className="text-action-primary font-semibold">Inside: {dept.insideCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-4 bg-bg-surface flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search faculty by name, ID, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="surface-card w-full pl-9 pr-4 py-2 bg-[var(--background)] text-xs text-text-primary placeholder-[var(--text-muted)] focus:outline-none focus:"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Filter className="w-3.5 h-3.5" />
            Dept:
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="surface-card px-3 py-2 bg-[var(--background)] text-xs text-text-primary focus:outline-none focus:"
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
            className="surface-card px-3 py-2 bg-[var(--background)] text-xs text-text-primary focus:outline-none focus:"
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
      <div className="surface-card p-6 bg-bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-action-primary" />
              Faculty Attendance Directory ({filteredRecords.length})
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Click any faculty row to open their profile overview & 30-day attendance heatmap.
            </p>
          </div>
          <span className="text-xs text-text-muted">
            Updated live from Gate Logs
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            No faculty members match the applied filters.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w175">
              <thead>
                <tr className="border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider">
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
              <tbody className="divide-y divide-border text-xs">
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
                        <div className="size-4 bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-action-primary text-xs">
                          {fac.fullName.replace("Dr. ", "").replace("Prof. ", "").charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary group-hover:text-action-primary transition">
                            {fac.fullName}
                          </div>
                          <div className="text-xs text-text-muted">{fac.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-action-primary">
                      {fac.uniqueId}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-text-primary">
                      {fac.department}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold "INSIDE" "text-action-success" "OUTSIDE" "text-action-warning" "text-text-muted" "INSIDE" "text-action-success" "OUTSIDE" "text-action-warning" "text-text-muted"`}
                        >
                          {fac.status}
                        </span>
                        {fac.punctualityStatus === "LATE" && (
                          <span className="text-xs text-action-danger font-semibold flex items-center gap-1">
                            <Clock className="size-2" /> LATE (&gt;10:00 AM)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-text-primary">
                      {fac.firstInTime || "—"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-text-muted">
                      {fac.lastOutTime || "—"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs font-semibold text-action-success">
                      {fac.totalHoursToday || "0 hrs"}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-text-muted">
                      {fac.gateLocation ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-action-primary shrink-0" />
                          {fac.gateLocation}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-action-primary group-hover:translate-x-0.5 transition">
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
            <div className="surface-card p-4 bg-bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="size-4 bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-action-primary text-lg">
                    {selectedFaculty.fullName.replace("Dr. ", "").replace("Prof. ", "").charAt(0)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 borderbg-surface "INSIDE" "bg-action-success" "OUTSIDE" "bg-action-warning" "bg-bg-elevated"`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-text-primary">{selectedFaculty.fullName}</h3>
                    <span className="surface-card px-2 py-0.5 bg-indigo-500/10 text-action-primary text-xs font-mono font-bold">
                      {selectedFaculty.uniqueId}
                    </span>
                    <span className="surface-card px-2 py-0.5 bg-bg-elevated/10 text-text-primary text-xs font-bold">
                      {selectedFaculty.department}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{selectedFaculty.designation}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-muted flex-wrap">
                    {selectedFaculty.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-action-primary" />
                        {selectedFaculty.email}
                      </span>
                    )}
                    {selectedFaculty.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3.5 text-action-success" />
                        {selectedFaculty.phone}
                      </span>
                    )}
                    <a
                      href={`/admin/faculty/${selectedFaculty.uniqueId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-action-primary hover:underline"
                    >
                      Full profile <ChevronRight className="size-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="surface-card flex sm:flex-col items-end gap-2 w-full sm:w-auto justify-between sm: pt-2 sm:pt-0">
                <span
                  className={`px-3 py-1 text-xs font-bold "INSIDE" "text-action-success" "OUTSIDE" "text-action-warning" "text-text-muted" "INSIDE" "text-action-success" "OUTSIDE" "text-action-warning" "text-text-muted"`}
                >
                  {selectedFaculty.status === "INSIDE"
                    ? "● CURRENTLY ON CAMPUS"
                    : selectedFaculty.status === "OUTSIDE"
                    ? "○ PUNCHED OUT / OFF SITE"
                    : "✕ ABSENT TODAY"}
                </span>
                {selectedFaculty.punctualityStatus === "LATE" && (
                  <span className="surface-card px-2.5 py-0.5 bg-rose-500/10 text-action-danger text-xs font-bold flex items-center gap-1">
                    <Clock className="size-3.5" /> LATE CHECK-IN (&gt;10:00 AM)
                  </span>
                )}
                {selectedFaculty.punctualityStatus === "ON_TIME" && (
                  <span className="surface-card px-2.5 py-0.5 bg-emerald-500/10 text-action-success text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> ON TIME (&lt;10:00 AM)
                  </span>
                )}
              </div>
            </div>
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="surface-card p-3 bg-bg-surface space-y-1">
                <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-action-success" /> Attendance Rate
                </span>
                <div className="text-xl font-black text-action-success">
                  {selectedFaculty.attendanceRate ?? 92}%
                </div>
                <p className="text-xs text-text-muted">30-day average</p>
              </div>

              <div className="surface-card p-3 bg-bg-surface space-y-1">
                <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-action-primary" /> Today&apos;s Time Logged
                </span>
                <div className="text-xl font-black text-action-primary">
                  {selectedFaculty.totalHoursToday || "0 hrs"}
                </div>
                <p className="text-xs text-text-muted">
                  {selectedFaculty.firstInTime ? `In at ${selectedFaculty.firstInTime}` : "No check-in today"}
                </p>
              </div>

              <div className="surface-card p-3 bg-bg-surface space-y-1">
                <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-action-primary" /> Days Present
                </span>
                <div className="text-xl font-black text-text-primary">
                  {selectedFaculty.monthlyStats?.presentDays ?? 20} <span className="text-xs font-normal text-text-muted">/ 22</span>
                </div>
                <p className="text-xs text-text-muted">Working days present</p>
              </div>

              <div className="surface-card p-3 bg-bg-surface space-y-1">
                <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-action-warning" /> Late Arrivals
                </span>
                <div className="text-xl font-black text-action-warning">
                  {selectedFaculty.monthlyStats?.lateDays ?? 2}
                </div>
                <p className="text-xs text-text-muted">Check-ins after 10:00 AM</p>
              </div>
            </div>
            {/* 30-Day Attendance Heatmap Calendar */}
            <div className="surface-card p-5 bg-bg-surface space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-action-primary" />
                    30-Day Attendance Heatmap Overview
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Click or hover over any day tile below to inspect check-in/out logs & duration.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-action-success inline-block" /> On Time (&lt;10:00 AM)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-action-warning inline-block" /> Late (&gt;10:00 AM)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-action-primary inline-block" /> Inside Today
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-rose-500/40 inline-block" /> Absent
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 bg-bg-elevated/50 inline-block" /> Weekend
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 pt-2">
                {selectedFaculty.attendanceHeatmap?.map((day, idx) => {
                  const dayNum = day.date.slice(8);
                  const isSelected = activeHeatmapDay?.date === day.date;

                  let colorClass = "bg-bg-elevated/40 text-text-muted border-border/30";
                  if (day.status === "ON_TIME") {
                    colorClass = "bg-emerald-500/20 text-action-success border-emerald-500/40 hover:bg-action-success hover:text-white";
                  } else if (day.status === "LATE") {
                    colorClass = "bg-amber-500/20 text-action-warning border-amber-500/40 hover:bg-action-warning hover:text-white";
                  } else if (day.status === "INSIDE") {
                    colorClass = "bg-indigo-500/30 text-indigo-300 border-indigo-500/60 font-bold hover:bg-action-primary hover:text-white animate-pulse";
                  } else if (day.status === "ABSENT") {
                    colorClass = "bg-rose-500/10 text-action-danger border-rose-500/20 hover:bg-rose-500/30";
                  } else if (day.status === "WEEKEND") {
                    colorClass = "bg-bg-elevated/30 text-text-muted border-border/20 opacity-60";
                  }

                  return (
                    <button
                      key={day.date + idx}
                      onClick={() => setActiveHeatmapDay(day)}
                      onMouseEnter={() => setActiveHeatmapDay(day)}
                      className={`p-2 text-center transition flex flex-col items-center justify-center min-h13 "ring-2 ring-indigo-400 scale-105" "" "ring-2 ring-indigo-400 scale-105" ""`}
                    >
                      <span className="text-xs font-bold">{dayNum}</span>
                      <span className="text-xs opacity-80 uppercase">{day.dayLabel.split(",")[0]}</span>
                      {day.hours && day.hours > 0 ? (
                        <span className="text-xs font-mono mt-0.5">{day.hours}h</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {/* Active Day Detail Card */}
              {activeHeatmapDay && (
                <div className="surface-card p-3 bg-[var(--background)] flex items-center justify-between text-xs transition mt-3">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-text-primary">{activeHeatmapDay.dayLabel}</div>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold uppercase "ON_TIME" "text-action-success" "LATE" "text-action-warning" "INSIDE" "text-action-primary" "ABSENT" "text-action-danger" "text-text-muted" "ON_TIME" "text-action-success" "LATE" "text-action-warning" "INSIDE" "text-action-primary" "ABSENT" "text-action-danger" "text-text-muted"`}
                    >
                      {activeHeatmapDay.status === "LATE" ? "LATE ARRIVAL (>10:00 AM)" : activeHeatmapDay.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                    {activeHeatmapDay.inTime && (
                      <span>In: <strong className="text-text-primary">{activeHeatmapDay.inTime}</strong></span>
                    )}
                    {activeHeatmapDay.outTime && (
                      <span>Out: <strong className="text-text-primary">{activeHeatmapDay.outTime}</strong></span>
                    )}
                    {activeHeatmapDay.hours ? (
                      <span>Spent: <strong className="text-action-success">{activeHeatmapDay.hours} hrs</strong></span>
                    ) : null}
                  </div>
                </div>
              )}

            {/* Movement Gate Logs */}
            <div className="surface-card p-4 bg-bg-surface space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-action-success" />
                Recent Gate Scans & Terminal Activity
              </h4>

              {selectedFaculty.recentLogs && selectedFaculty.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectedFaculty.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="surface-card p-2.5 bg-[var(--background)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold "IN" "text-action-success" "text-action-warning" "IN" "text-action-success" "text-action-warning"`}
                        >
                          {log.direction === "IN" ? "GATE ENTRY (IN)" : "GATE EXIT (OUT)"}
                        </span>
                        <span className="font-semibold text-text-primary">{log.gate}</span>
                      </div>
                      <span className="font-mono text-xs text-text-muted flex items-center gap-1">
                        <Clock className="size-3.5 text-action-primary" />
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-text-muted">
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


