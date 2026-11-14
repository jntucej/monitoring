"use client";

import React, { useState } from "react";
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
      <div className="surface-card flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, designation..."
            className="surface-card w-full pl-9 pr-4 py-2 bg-bg-base text-xs focus:outline-none focus:"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="surface-card px-3 py-2 bg-bg-base text-xs focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="surface-card px-3 py-2 bg-bg-base text-xs focus:outline-none"
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