"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { Loader2, Zap } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface WardenStudent {
  id: string;
  uniqueId: string;
  fullName: string;
  roll?: string;
  hostelBlock?: string;
  roomNumber?: string;
  status: string;
  checkedOutAt?: string;
}

function CurfewRosterInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<WardenStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("ALL");
  const [rosterViewMode, setRosterViewMode] = useState<"list" | "heatmap">("list");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [studentStrikes, setStudentStrikes] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/students", { headers: getAuthHeaders(), cache: "no-store" });
      if (!res.ok) throw new Error("Ward roster unavailable");
      const json = await res.json();
      setStudents(Array.isArray(json?.data) ? json.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load ward roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(loadData, { intervalMs: 30000 });

  const handleAddStrike = (studentId: string) => {
    setStudentStrikes((prev) => ({ ...prev, [studentId]: (prev[studentId] || 0) + 1 }));
  };

  const exportMovementCSV = () => {
    const headers = ["Student Name", "Roll / ID", "Hostel Block", "Room", "Campus Status", "Curfew Violations"];
    const rows = students.map((s) => [
      `"${s.fullName}"`,
      `"${s.roll || s.uniqueId}"`,
      `"${s.hostelBlock || "N/A"}"`,
      `"${s.roomNumber || "N/A"}"`,
      `"${s.status === "ACTIVE" || !s.checkedOutAt ? "INSIDE CAMPUS" : "OUTSIDE (ON PASS)"}"`,
      studentStrikes[s.id] || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hostel_movement_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      !studentSearch ||
      s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.roll || s.uniqueId)?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchHostel =
      hostelFilter === "ALL" ||
      (hostelFilter === "INSIDE" && (s.status === "ACTIVE" || !s.checkedOutAt)) ||
      (hostelFilter === "OUTSIDE" && s.checkedOutAt);
    return matchSearch && matchHostel;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <p className="text-sm text-[var(--text-muted)] min-w-0">
          Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> · tier {getRoleTier(role)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button"
            onClick={exportMovementCSV}
            className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm min-w-0">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 text-xs shrink-0">
            <button type="button"
              onClick={() => setRosterViewMode("list")}
              className={`px-2 py-1 rounded-lg font-bold ${rosterViewMode === "list" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}
            >
              List
            </button>
            <button type="button"
              onClick={() => setRosterViewMode("heatmap")}
              className={`px-2 py-1 rounded-lg font-bold ${rosterViewMode === "heatmap" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}
            >
              Grid Map
            </button>
          </div>
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search Ward..."
            className="w-full sm:w-64 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {["ALL", "INSIDE", "OUTSIDE"].map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setHostelFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                hostelFilter === f ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}
            >
              {f === "ALL" ? "All Wards" : f === "INSIDE" ? "Inside Campus" : "Outside"}
            </button>
          ))}
        </div>
      </div>

      <WidgetBoundary title="Ward Movement & Curfew Roster">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 overflow-hidden min-w-0">
          {filteredStudents.length === 0 ? (
            <p className="p-8 text-center text-[var(--text-muted)]">No students match current search / hostel filters.</p>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2.5">Student</th>
                    <th className="text-left px-3 py-2.5">Roll</th>
                    <th className="text-left px-3 py-2.5">Hostel / Room</th>
                    <th className="text-left px-3 py-2.5">Status</th>
                    <th className="text-right px-3 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredStudents.map((s) => {
                    const isInside = s.status === "ACTIVE" || !s.checkedOutAt;
                    const strikes = studentStrikes[s.id] || 0;
                    return (
                      <tr key={s.id} className="hover:bg-[var(--bg-elevated)]">
                        <td className="px-3 py-3 font-semibold text-[var(--text-primary)]">{s.fullName}</td>
                        <td className="px-3 py-3 font-mono text-xs text-indigo-400">{s.roll || s.uniqueId}</td>
                        <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                          {s.hostelBlock ? `${s.hostelBlock} — ${s.roomNumber || "Room N/A"}` : "Day Scholar"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isInside ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                            {isInside ? "Inside Campus" : "Outside"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {strikes > 0 && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                                {strikes} Strike{strikes > 1 ? "s" : ""}
                              </span>
                            )}
                            <button type="button"
                              onClick={() => handleAddStrike(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500/20"
                            >
                              + Strike
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {loading && (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Syncing curfew roster…
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function CurfewRosterPage() {
  return (
    <AuthGuard allowedRoles={["supervisor", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <CurfewRosterInner />
      </Suspense>
    </AuthGuard>
  );
}
