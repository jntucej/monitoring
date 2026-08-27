"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

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

  return (
    <div className="space-y-6">
      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] uppercase">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            Total Staff
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">{summary.totalStaff}</div>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Administrative Roster</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Present Today
          </div>
          <div className="text-2xl font-black text-emerald-400">{summary.presentToday}</div>
          <p className="text-[10px] text-[var(--text-muted)]">{summary.overallAttendanceRate}% daily rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] uppercase">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Currently Inside
          </div>
          <div className="text-2xl font-black text-indigo-400">{summary.currentlyInside}</div>
          <p className="text-[10px] text-[var(--text-muted)]">Inside Campus</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] uppercase">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Currently Outside
          </div>
          <div className="text-2xl font-black text-amber-400">{summary.currentlyOutside}</div>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">Off Campus</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-rose-500/30 bg-rose-500/5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400 uppercase">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Warnings (WRN)
          </div>
          <div className="text-2xl font-black text-rose-400">{summary.warningCount}</div>
          <p className="text-[10px] text-rose-400/80">Flagged exceptions</p>
        </div>
      </div>
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[var(--bg-surface)] border border-[var(--border)] p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, designation..."
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="INSIDE">Currently Inside</option>
            <option value="OUTSIDE">Currently Outside</option>
            <option value="ABSENT">Absent Today</option>
            <option value="WRN">Warning Flagged (WRN)</option>
          </select>
        </div>
      </div>
      {/* Staff Roster & Logs Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" />
            Staff Members Roster & Status Logs
          </h3>
          <span className="text-xs text-[var(--text-muted)]">{filteredRecords.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department / Role</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">First Check-In</th>
                <th className="py-3 px-4">Tags & Warning</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs">
                          {staff.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{staff.fullName}</div>
                          <div className="font-mono text-[10px] text-[var(--text-muted)]">{staff.uniqueId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{staff.department}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{staff.designation}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          staff.status === "INSIDE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : staff.status === "OUTSIDE"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            WRN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            OK
                          </span>
                        )}
                        {staff.punctualityStatus === "LATE" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                            LATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStaff(staff)}
                        className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold inline-flex items-center gap-1 transition"
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
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 font-black text-xl flex items-center justify-center border-2 border-purple-500/30">
                {selectedStaff.fullName.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedStaff.fullName}</h3>
                <p className="text-xs text-purple-400 font-mono">{selectedStaff.uniqueId} — {selectedStaff.designation}</p>
                <p className="text-xs text-[var(--text-muted)]">{selectedStaff.department} Department</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] space-y-1">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                <p className="font-semibold truncate">{selectedStaff.email || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] space-y-1">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</span>
                <p className="font-semibold">{selectedStaff.phone || "N/A"}</p>
              </div>
            </div>

            {/* Movement Gate Logs */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Recent Gate Movement Logs
              </h4>

              {selectedStaff.recentLogs && selectedStaff.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {selectedStaff.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.direction === "IN"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {log.direction === "IN" ? "ENTRY (IN)" : "EXIT (OUT)"}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{log.gate}</span>
                      </div>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {log.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">No recent gate scan logs recorded today.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}