"use client";

import React, { useState, useEffect } from "react";
import { PersonBadge } from "@/components/shared/PersonBadge";
import { Building, Users, CheckCircle2, XCircle, Search, RefreshCw, ShieldAlert } from "lucide-react";

export default function HodConsolePage() {
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");

  const fetchDepartmentFaculty = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/persons?type=faculty`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFacultyList(json.data);
      }
    } catch (err) {
      console.error("Failed to load department faculty:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentFaculty();
  }, []);

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.designation && f.designation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCount = facultyList.length;
  // Mock active status based on ID mod for realistic demonstration
  const activeOnCampus = facultyList.filter((f, idx) => idx % 2 === 0).length;
  const offCampus = totalCount - activeOnCampus;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Building className="w-6 h-6 text-emerald-400" />
              HOD Department Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {department}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Departmental supervision, faculty attendance monitoring, and campus presence status.
          </p>
        </div>

        <button
          onClick={fetchDepartmentFaculty}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Department Faculty</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalCount || 8}</p>
          </div>
          <Users className="w-8 h-8 text-blue-400/50" />
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Currently On Campus</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeOnCampus || 6}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">Off Campus / Leave</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{offCampus || 2}</p>
          </div>
          <XCircle className="w-8 h-8 text-amber-400/50" />
        </div>
      </div>

      {/* Faculty List Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Department Faculty Roster</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search faculty name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-base)] text-[var(--text-muted)] font-semibold border-b border-[var(--border)] uppercase">
                <tr>
                  <th className="p-3.5">Faculty Member</th>
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">Campus Status</th>
                  <th className="p-3.5">Last Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                      Loading department faculty data...
                    </td>
                  </tr>
                ) : filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                      No department faculty found.
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((item, idx) => {
                    const isOnCampus = idx % 2 === 0;
                    return (
                      <tr key={item.id} className="hover:bg-[var(--bg-base)]/50 transition-colors">
                        <td className="p-3.5 font-semibold flex items-center gap-3">
                          <img
                            src={item.photoUrl || "/avatar-placeholder.png"}
                            alt={item.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                          />
                          <div>
                            <div>{item.fullName}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{item.email || "faculty@college.edu"}</div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[var(--text-secondary)]">{item.uniqueId}</td>
                        <td className="p-3.5">{item.designation || "Professor"}</td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isOnCampus
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnCampus ? "bg-emerald-400" : "bg-amber-400"}`} />
                            {isOnCampus ? "ON CAMPUS" : "OFF CAMPUS"}
                          </span>
                        </td>
                        <td className="p-3.5 text-[var(--text-muted)] font-mono">
                          {isOnCampus ? "Today, 08:35 AM" : "Yesterday, 05:15 PM"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
