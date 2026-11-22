"use client";

import React, { useMemo, useState } from "react";
import { CountUp } from "@/components/admin/shared/CountUp";
import {
  Briefcase,
  CheckCircle2,
  Building2,
  Clock,
  Search,
  AlertTriangle,
  Activity,
  ChevronRight,
  ShieldAlert,
  User,
  Mail,
  Phone,
  FileDown,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useExport } from "@/hooks/useExport";

export interface StaffLogEntry {
  id: string;
  timestamp: string;
  direction: "IN" | "OUT";
  gate: string;
}

export interface StaffMember {
  id: string;
  uniqueId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: "INSIDE" | "OUTSIDE" | "ABSENT";
  flagStatus?: "suspicious" | "warning" | null;
  firstInTime?: string | null;
  lastOutTime?: string | null;
  punctualityStatus?: "ON_TIME" | "LATE" | "NOT_CHECKED_IN";
  recentLogs?: StaffLogEntry[];
}

interface StaffTrackingProps {
  records: StaffMember[];
  summary: {
    totalStaff: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    warningCount: number;
    overallAttendanceRate: number;
  };
}

export function StaffTracking({ records, summary }: StaffTrackingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "heatmap">("table");
  const { exportCSV } = useExport();

  const departments = Array.from(new Set(records.map((r) => r.department).filter(Boolean)));

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "ALL" || r.department === selectedDept;
    const matchesStatus =
      selectedStatus === "ALL" ||
      r.status === selectedStatus ||
      (selectedStatus === "WRN" && !!r.flagStatus);
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Heatmap: day × time-slot occupancy (last 7 days)
  const heatmap = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
    const grid: Array<Array<number>> = days.map(() => Array(slots.length).fill(0));
    const now = new Date();
    const nowH = String(now.getHours()).padStart(2, "0");
    for (const r of filteredRecords) {
      if (!r.lastOutTime) continue;
      for (let di = 0; di < days.length; di++) {
        for (let si = 0; si < slots.length; si++) {
          if (r.status === "INSIDE" && now.toISOString().slice(0, 10) === days[di]) {
            grid[di][si] += 1;
          }
        }
      }
    }
    return { days, slots, grid, nowDay: now.toISOString().slice(0, 10), nowSlot: nowH };
  }, [filteredRecords]);

  const handleExport = () => {
    exportCSV(
      filteredRecords.map((r) => ({
        name: r.fullName,
        roll: r.uniqueId,
        department: r.department,
        role: r.designation,
        status: r.status,
        firstIn: r.firstInTime ?? "—",
        punctuality: r.punctualityStatus ?? "—",
      })),
      [
        { key: "name", header: "Name" },
        { key: "roll", header: "Roll" },
        { key: "department", header: "Dept" },
        { key: "role", header: "Role" },
        { key: "status", header: "Status" },
        { key: "firstIn", header: "First In" },
        { key: "punctuality", header: "Punctuality" },
      ],
      "staff_tracking.csv"
    );
  };

  return (
    <div className="space-y-6">
      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="surface-card p-4 bg-bg-surface space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase">
            <Briefcase className="w-3.5 h-3.5 text-unit-c" />
            Total Staff
          </div>
          <div className="text-2xl font-black text-text-primary">
            <CountUp value={summary.totalStaff} />
          </div>
          <p className="text-xs text-text-muted font-mono">Administrative Roster</p>
        </div>

        <div className="surface-card p-4 bg-bg-surface space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-action-success" />
            Present Today
          </div>
          <div className="text-2xl font-black text-action-success">
            <CountUp value={summary.presentToday} />
          </div>
          <p className="text-xs text-text-muted">{summary.overallAttendanceRate}% daily rate</p>
        </div>

        <div className="surface-card p-4 bg-bg-surface space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase">
            <Building2 className="w-3.5 h-3.5 text-action-primary" />
            Currently Inside
          </div>
          <div className="text-2xl font-black text-action-primary">
            <CountUp value={summary.currentlyInside} />
          </div>
          <p className="text-xs text-text-muted">Inside Campus</p>
        </div>

        <div className="surface-card p-4 bg-bg-surface space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted uppercase">
            <Clock className="w-3.5 h-3.5 text-action-warning" />
            Currently Outside
          </div>
          <div className="text-2xl font-black text-action-warning">
            <CountUp value={summary.currentlyOutside} />
          </div>
          <p className="text-xs text-text-muted font-mono">Off Campus</p>
        </div>

        <div className="surface-card p-4 bg-bg-surface bg-rose-500/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-action-danger uppercase">
            <ShieldAlert className="w-3.5 h-3.5 text-action-danger" />
            Warnings (WRN)
          </div>
          <div className="text-2xl font-black text-action-danger">
            <CountUp value={summary.warningCount} />
          </div>
          <p className="text-xs text-rose-400/80">Flagged exceptions</p>
        </div>
      </div>
      {/* Filter & Search Bar */}
      <div className="surface-card bg-bg-surface p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, roll, or designation…"
              className="surface-card w-full bg-bg-elevated pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-border bg-bg-elevated text-text-primary text-xs py-2 px-3"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="surface-card bg-bg-elevated border-border text-text-primary text-xs py-2 px-3"
            >
              <option value="ALL">All Status</option>
              <option value="INSIDE">Inside</option>
              <option value="OUTSIDE">Outside</option>
              <option value="ABSENT">Absent</option>
              <option value="WRN">Warnings</option>
            </select>
            {/* View mode + export */}
            <div className="inline-flex rounded-lg p-0.5 gap-0.5 bg-bg-elevated border border-border">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${viewMode === "table" ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-surface"}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("heatmap")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${viewMode === "heatmap" ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-surface"}`}
              >
                Heatmap
              </button>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary rounded-lg bg-bg-elevated border border-border hover:bg-bg-surface disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{filteredRecords.length}</span> staff members ·
          <span className="ml-1 font-mono">{heatmap.days.length}</span> days × <span className="font-mono">{heatmap.slots.length}</span> slots
        </div>
      </div>

      {/* Heatmap view */}
      {viewMode === "heatmap" && (
        <div className="surface-card bg-bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
            7-day × time-slot occupancy
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-80 grid gap-px bgborder rounded-lg overflow-hidden"
              style={{ gridTemplateColumns: `80px repeat(${heatmap.slots.length}, 1fr)` }}>
              {/* Header */}
              <div className="bg-bg-base" />
              {heatmap.slots.map((s) => (
                <div key={s} className="bg-bg-base text-[10px] text-text-muted text-center py-1">{s}</div>
              ))}
              {heatmap.days.map((day, di) => (
                <React.Fragment key={day}>
                  <div className="bg-bg-base text-xs text-text-primary px-2 py-1.5 font-mono flex items-center">
                    {day.slice(5)}
                  </div>
                  {heatmap.slots.map((slot, si) => {
                    const count = heatmap.grid[di][si];
                    const intensity = Math.min(1, count / Math.max(1, filteredRecords.length / 2));
                    const isNow = day === heatmap.nowDay && parseInt(slot) === parseInt(heatmap.nowSlot);
                    return (
                      <div
                        key={slot}
                        className={`h-7 flex items-center justify-center text-[10px] tabular-nums ${
                          isNow ? "ring-2 ring-inset ring-sky-400" : ""
                        } ${count > 0 ? "text-white font-semibold" : "text-text-muted"}`}
                        style={{
                          backgroundColor: count > 0
                            ? `rgba(168, 85, 247, ${0.2 + intensity * 0.8})`
                            : "transparent",
                        }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-text-muted mt-2">
            Darker purple = more staff present · Highlighted cell = current time slot
          </p>
        </div>
      )}
      {/* Staff Roster & Logs Table */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="surface-card p-4 flex justify-between items-center">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-unit-c" />
            Staff Members Roster & Status Logs
          </h3>
          <span className="text-xs text-text-muted">{filteredRecords.length} records</span>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w175">
            <thead>
              <tr className="border-b border-border text-xs font-bold text-text-muted uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department / Role</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">First Check-In</th>
                <th className="py-3 px-4">Tags & Warning</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-purple-500/20 text-unit-c font-bold flex items-center justify-center text-xs">
                          {staff.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">{staff.fullName}</div>
                          <div className="font-mono text-xs text-text-muted">{staff.uniqueId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{staff.department}</div>
                      <div className="text-xs text-text-muted">{staff.designation}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          staff.status === "INSIDE"
                            ? "bg-emerald-500/10 text-action-success border border-emerald-500/20"
                            : staff.status === "OUTSIDE"
                            ? "bg-amber-500/10 text-action-warning border border-amber-500/20"
                            : "bg-rose-500/10 text-action-danger border border-rose-500/20"
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {staff.firstInTime || "--"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {staff.flagStatus ? (
                          <span className="surface-card px-2 py-0.5 text-xs font-bold bg-rose-500/20 text-action-danger animate-pulse flex items-center gap-1">
                            <AlertTriangle className="size-3.5" />
                            WRN
                          </span>
                        ) : (
                          <span className="surface-card px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-action-success">
                            OK
                          </span>
                        )}
                        {staff.punctualityStatus === "LATE" && (
                          <span className="surface-card px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-action-warning">
                            LATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStaff(staff)}
                        className="surface-card px-3 py-1 bg-purple-500/10 text-unit-c hover:bg-purple-500/20 text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        Profile Logs <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Staff Person Detail & Logs Modal */}
      {selectedStaff && (
        <Modal isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title="Staff Member Profile & Scan Logs">
          <div className="space-y-4 max-w-xl mx-auto p-1">
            <div className="surface-card p-4 bg-bg-surface flex items-center gap-4">
              <div className="size-6 bg-purple-500/20 text-unit-c font-black text-xl flex items-center justify-center border-2 border-purple-500/30">
                {selectedStaff.fullName.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-text-primary">{selectedStaff.fullName}</h3>
                <p className="text-xs text-unit-c font-mono">{selectedStaff.uniqueId} — {selectedStaff.designation}</p>
                <p className="text-xs text-text-muted">{selectedStaff.department} Department</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="surface-card p-3 bg-bg-base space-y-1">
                <span className="text-text-muted flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                <p className="font-semibold truncate">{selectedStaff.email || "N/A"}</p>
              </div>
              <div className="surface-card p-3 bg-bg-base space-y-1">
                <span className="text-text-muted flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</span>
                <p className="font-semibold">{selectedStaff.phone || "N/A"}</p>
              </div>
            </div>

            {/* Movement Gate Logs */}
            <div className="surface-card p-4 bg-bg-surface space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-unit-c" />
                Recent Gate Movement Logs
              </h4>

              {selectedStaff.recentLogs && selectedStaff.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectedStaff.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="surface-card p-2.5 bg-bg-base flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            log.direction === "IN"
                              ? "bg-emerald-500/20 text-action-success"
                              : "bg-amber-500/20 text-action-warning"
                          }`}
                        >
                          {log.direction === "IN" ? "ENTRY (IN)" : "EXIT (OUT)"}
                        </span>
                        <span className="font-semibold text-text-primary">{log.gate}</span>
                      </div>
                      <span className="font-mono text-xs text-text-muted">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-4">No recent gate scan logs recorded today.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}