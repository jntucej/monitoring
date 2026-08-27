"use client";

import React, { useState } from "react";
import { HardHat, Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";

export interface WorkerShift {
  id: string;
  workerName: string;
  workerId: string;
  contractor: string;
  scheduledShift: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "on_shift" | "off_shift";
  gate: string;
  shiftAdherence: "on_time" | "late";
  hoursLogged: number;
}

interface WorkerShiftTrackerProps {
  shifts: WorkerShift[];
  summary: {
    totalActive: number;
    onShift: number;
    lateArrivals: number;
    offShift: number;
    shiftAdherenceRate: number;
  };
}

export function WorkerShiftTracker({ shifts, summary }: WorkerShiftTrackerProps) {
  const [filterContractor, setFilterContractor] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const contractors = Array.from(new Set(shifts.map((s) => s.contractor).filter(Boolean)));

  const filteredShifts = shifts.filter((s) => {
    const matchesContractor = filterContractor === "ALL" || s.contractor === filterContractor;
    const matchesStatus = filterStatus === "ALL" || s.status === filterStatus;
    const matchesSearch =
      s.workerName.toLowerCase().includes(search.toLowerCase()) ||
      s.workerId.toLowerCase().includes(search.toLowerCase());
    return matchesContractor && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>On-Duty Workers</span>
            <HardHat className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1">{summary.onShift}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">out of {summary.totalActive} total</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Shift Adherence</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{summary.shiftAdherenceRate}%</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">on-time arrival rate</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Late Check-Ins</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-1">{summary.lateArrivals}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">delayed arrival</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Off Shift</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-1">{summary.offShift}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">completed / off duty</p>
        </div>
      </div>
      {/* Filter and Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search worker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterContractor}
              onChange={(e) => setFilterContractor(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
            >
              <option value="ALL">All Contractors</option>
              {contractors.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="on_shift">On Shift</option>
              <option value="off_shift">Off Shift</option>
            </select>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-[var(--bg-elevated)]/50">
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Contractor</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-elevated)]/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{s.workerName}</div>
                      <div className="font-mono text-[10px] text-amber-400">{s.workerId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{s.contractor}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">{s.scheduledShift}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">{s.checkIn || "--"}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${s.status === "on_shift" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/20"}`}>
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 min-w-[120px]">
                      <div className="text-[10px] text-muted-foreground mb-1">{s.hoursLogged} / 8 hrs</div>
                      <div className="w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(s.hoursLogged / 8) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}