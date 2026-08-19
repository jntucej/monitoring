"use client";

import React, { useState, useEffect } from "react";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { Person } from "@/lib/types";
import { HardHat, Search, Clock, ShieldCheck, Filter, UserCheck, Plus } from "lucide-react";

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Person[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const res = await fetch("/api/persons?type=worker");
        if (res.ok) {
          const data = await res.json();
          setWorkers(data.data || []);
        } else {
          // Fallback mock workers for admin demonstration
          setWorkers([
            {
              id: "w1",
              uniqueId: "WRK-001",
              fullName: "Rajesh Kumar",
              personType: "worker",
              department: "Maintenance",
              designation: "Electrician",
              phone: "+91 98765 43210",
              status: "active",
            },
            {
              id: "w2",
              uniqueId: "WRK-002",
              fullName: "Sunil Sharma",
              personType: "worker",
              department: "Gardening",
              designation: "Head Groundskeeper",
              phone: "+91 98765 43211",
              status: "active",
            },
            {
              id: "w3",
              uniqueId: "WRK-003",
              fullName: "Ramesh Patel",
              personType: "worker",
              department: "Housekeeping",
              designation: "Cleaning Staff",
              phone: "+91 98765 43212",
              status: "active",
            },
            {
              id: "w4",
              uniqueId: "WRK-004",
              fullName: "Vikram Singh",
              personType: "worker",
              department: "Maintenance",
              designation: "Plumber",
              phone: "+91 98765 43213",
              status: "active",
            },
          ]);
        }
      } catch {
        setWorkers([
          {
            id: "w1",
            uniqueId: "WRK-001",
            fullName: "Rajesh Kumar",
            personType: "worker",
            department: "Maintenance",
            designation: "Electrician",
            phone: "+91 98765 43210",
            status: "active",
          },
          {
            id: "w2",
            uniqueId: "WRK-002",
            fullName: "Sunil Sharma",
            personType: "worker",
            department: "Gardening",
            designation: "Head Groundskeeper",
            phone: "+91 98765 43211",
            status: "active",
          },
        ]);
      }
      setLoading(false);
    }

    fetchWorkers();
  }, []);

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.designation && w.designation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === "ALL" || w.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(workers.map((w) => w.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Worker Roster & Access Management
              </h1>
              <PersonBadge type="worker" />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Control worker personnel, shift schedules, and time-based entry rules
            </p>
          </div>
        </div>

        <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" />
          Register New Worker
        </button>
      </div>

      {/* Access Rule Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            Total Registered Workers
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">{workers.length}</div>
          <p className="text-[10px] text-[var(--text-muted)]">Contract & Maintenance staff</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Global Worker Shift Rule
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono">06:00 AM – 10:00 PM</div>
          <p className="text-[10px] text-[var(--text-muted)]">Mon - Sat (Sundays Blocked)</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Gate Auto-Enforcement
          </div>
          <div className="text-lg font-bold text-emerald-400">ACTIVE</div>
          <p className="text-[10px] text-[var(--text-muted)]">Scans automatically checked</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search worker by name, ID, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Filter className="w-3.5 h-3.5" />
            Department:
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Worker List Table */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
            Loading worker directory...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No workers found matching the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="pb-3 px-3">Worker Info</th>
                  <th className="pb-3 px-3">Worker ID</th>
                  <th className="pb-3 px-3">Department</th>
                  <th className="pb-3 px-3">Designation</th>
                  <th className="pb-3 px-3">Shift Hours</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {filteredWorkers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-[var(--background)]/50 transition">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                          {worker.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{worker.fullName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{worker.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-amber-400">
                      {worker.uniqueId}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[var(--text-primary)]">
                      {worker.department || "General"}
                    </td>
                    <td className="py-3.5 px-3 text-[var(--text-muted)]">
                      {worker.designation || "Support Staff"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px]">06:00 AM - 10:00 PM</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {worker.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button className="px-3 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--surface)] text-[11px] font-semibold text-blue-400 transition">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
