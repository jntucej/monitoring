"use client";

import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import {
  GraduationCap, Search, RefreshCw, Users, Archive,
  AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Ban, UserCheck,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { parseRollNumber, getGraduationYearFromRoll } from "@/lib/rollNumber";
import { DevContactStrip } from "@/components/shared/DevContactStrip";

interface StudentRow {
  id: string;
  uniqueId?: string;
  name: string;
  roll?: string;
  status: string;
  course?: string;
  year?: number;
  batch?: string;
  email?: string;
}

type Tab = "auto" | "graduated" | "deprovisioned";

export default function AlumniPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [tab, setTab] = useState<Tab>("auto");
  const [search, setSearch] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [singleBusy, setSingleBusy] = useState<string | null>(null);
  const [reprovisionBusy, setReprovisionBusy] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/students?status=ALL", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: any[] = Array.isArray(json.data) ? json.data : json.data?.items ?? [];
      setStudents(data as unknown as StudentRow[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Compute graduation year for each student
  const enriched = useMemo(() => {
    return students.map((s) => {
      const roll = s.roll || s.uniqueId || "";
      const gradYear = getGraduationYearFromRoll(roll);
      const currentYear = new Date().getFullYear();
      const shouldBeGraduated = gradYear !== null && gradYear <= currentYear;
      const isGraduated = s.status === "DEPROVISIONED";
      const isSuspended = s.status === "SUSPENDED" || s.status === "LOCKED";
      return { ...s, roll, gradYear, shouldBeGraduated, isGraduated, isSuspended, courseLabel: s.course || undefined };
    });
  }, [students]);

  // Detect students who should have graduated but are still ACTIVE
  const autoDetected = useMemo(() =>
    enriched.filter((s) => s.shouldBeGraduated && !s.isGraduated && !s.isSuspended && s.status === "ACTIVE"),
    [enriched]);

  // All graduated (DEPROVISIONED) students
  const graduated = useMemo(() =>
    enriched.filter((s) => s.isGraduated),
    [enriched]);

  // Suspended/locked (non-graduated deprovisioned = "removed candidates")
  const removedCandidates = useMemo(() =>
    enriched.filter((s) => s.isSuspended),
    [enriched]);

  const filteredAuto = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return autoDetected;
    return autoDetected.filter((s) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.roll || "").toLowerCase().includes(q) ||
      (s.courseLabel || "").toLowerCase().includes(q));
  }, [autoDetected, search]);

  const filteredGraduated = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return graduated;
    return graduated.filter((s) =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.roll || "").toLowerCase().includes(q));
  }, [graduated, search]);

  const handleSingleGraduate = useCallback(async (student: StudentRow) => {
    setSingleBusy(student.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DEPROVISIONED",
          completed: true,
          completedAt: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed");
      addToast({ variant: "success", message: `${student.name} marked as graduated (DEPROVISIONED).` });
      fetchStudents();
    } catch (err) {
      addToast({ variant: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSingleBusy(null);
    }
  }, [addToast, fetchStudents]);

  const handleBulkGraduate = useCallback(async () => {
    setBulkLoading(true);
    setConfirmBulk(false);
    try {
      const headers = await getAuthHeaders();
      const rolls = filteredAuto.map((s) => s.roll).filter(Boolean);
      const res = await fetch("/api/users/bulk-graduate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ rolls }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Bulk graduate failed");
      addToast({
        variant: "success",
        message: `${json.processed} student(s) graduated. ${json.skipped} skipped.`,
      });
      fetchStudents();
    } catch (err) {
      addToast({ variant: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBulkLoading(false);
    }
  }, [addToast, fetchStudents, filteredAuto]);

  const handleReprovision = useCallback(async (student: StudentRow) => {
    setReprovisionBusy(student.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/users/${student.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE", unlock: true, completed: false, completedAt: null }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed");
      addToast({ variant: "success", message: `${student.name} re-activated.` });
      fetchStudents();
    } catch (err) {
      addToast({ variant: "error", message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setReprovisionBusy(null);
    }
  }, [addToast, fetchStudents]);

  const tabs: Array<{ id: Tab; label: string; count: number; icon: ReactNode }> = [
    { id: "auto", label: "Auto-Detected Graduates", count: autoDetected.length, icon: <GraduationCap size={14} /> },
    { id: "graduated", label: "Graduated Roster", count: graduated.length, icon: <Archive size={14} /> },
    { id: "deprovisioned", label: "Removed / Suspended", count: removedCandidates.length, icon: <Ban size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0d1220] text-white p-4 sm:p-6 lg:p-8">
      <AuthGuard allowedRoles={["sysadmin", "admin"]}>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                <GraduationCap className="text-emerald-400" />
                Alumni &amp; Deprovision
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Graduated students are flagged and deprovisioned — never deleted.
                Historical scan, attendance, and gate data is fully preserved and queryable.
              </p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchStudents(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Backup notice */}
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-800/50">
          <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-amber-200 text-sm font-medium">Before deprovisioning, a pg_dump backup is recommended.</p>
            <p className="text-amber-300/70 text-xs mt-1">
              The master-backup cron runs every 5 minutes and pre-deploy dumps are automatic.
              Deprovisioning only flips the active flag — no rows are deleted, so all history remains intact.
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <KpiCard label="Total Students" value={students.length} icon={<Users size={18} />} color="text-blue-400" />
          <KpiCard label="Auto-Detected" value={autoDetected.length} icon={<GraduationCap size={18} />} color="text-emerald-400" />
          <KpiCard label="Graduated" value={graduated.length} icon={<Archive size={18} />} color="text-violet-400" />
          <KpiCard label="Removed / Suspended" value={removedCandidates.length} icon={<Ban size={18} />} color="text-rose-400" />
        </div>

        {/* Search */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll, or course…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                tab === t.id
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-700/60"
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                tab === t.id ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading students…
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm mb-4">
            <AlertTriangle className="inline mr-2" size={16} /> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* AUTO-DETECTED TAB */}
            {tab === "auto" && (
              <div>
                {filteredAuto.length === 0 ? (
                  <EmptyState icon={<CheckCircle2 size={24} />} text="No auto-detected graduates. All active students are within their academic years." />
                ) : (
                  <>
                    {/* Bulk action */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <p className="text-sm text-slate-400">
                        {filteredAuto.length} active student(s) whose computed graduation year has passed.
                      </p>
                      <button
                        onClick={() => setConfirmBulk(true)}
                        disabled={bulkLoading || filteredAuto.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
                      >
                        {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
                        Mark All Detected as Graduated
                      </button>
                    </div>

                    {/* Confirm dialog */}
                    {confirmBulk && (
                      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-emerald-500/15">
                              <GraduationCap className="text-emerald-400" size={20} />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">Confirm Bulk Graduation</h3>
                              <p className="text-slate-400 text-xs">{filteredAuto.length} student(s) will be marked DEPROVISIONED</p>
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm mb-4">
                            These students will be removed from all active rosters, gate logs, and mess eligibility.
                            Their historical data is preserved. This action can be reversed via the "Re-activate" button.
                          </p>
                          <div className="flex gap-3">
                            <button onClick={() => setConfirmBulk(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition">Cancel</button>
                            <button onClick={handleBulkGraduate} disabled={bulkLoading} className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center justify-center gap-2">
                              {bulkLoading && <Loader2 size={14} className="animate-spin" />}
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Roll</th>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Course</th>
                            <th className="px-4 py-3 text-left">Batch</th>
                            <th className="px-4 py-3 text-left">Adm. Year</th>
                            <th className="px-4 py-3 text-left">Grad. Year</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAuto.map((s) => {
                            const decoded = parseRollNumber(s.roll);
                            return (
                              <tr key={s.id} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-mono text-emerald-300">{s.roll || "—"}</td>
                                <td className="px-4 py-3 text-white">{s.name}</td>
                                <td className="px-4 py-3 text-slate-300">{s.courseLabel || "—"}</td>
                                <td className="px-4 py-3 text-slate-400">{s.batch || "—"}</td>
                                <td className="px-4 py-3 text-slate-400">{decoded?.admissionYear ?? "—"}</td>
                                <td className="px-4 py-3 text-amber-300 font-medium">{s.gradYear ?? "—"}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">ACTIVE</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleSingleGraduate(s)}
                                    disabled={singleBusy === s.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition disabled:opacity-50"
                                  >
                                    {singleBusy === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    Mark Graduated
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* GRADUATED ROSTER TAB */}
            {tab === "graduated" && (
              filteredGraduated.length === 0 ? (
                <EmptyState icon={<Archive size={24} />} text="No graduated students yet. Use the Auto-Detected tab to mark graduates." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Roll</th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Course</th>
                        <th className="px-4 py-3 text-left">Grad. Year</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGraduated.map((s) => (
                        <tr key={s.id} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-mono text-emerald-300">{s.roll || "—"}</td>
                          <td className="px-4 py-3 text-white">{s.name}</td>
                          <td className="px-4 py-3 text-slate-300">{s.courseLabel || "—"}</td>
                          <td className="px-4 py-3 text-violet-300 font-medium">{s.gradYear ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-medium">DEPROVISIONED</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleReprovision(s)}
                              disabled={reprovisionBusy === s.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition disabled:opacity-50"
                            >
                              {reprovisionBusy === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                              Re-activate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* REMOVED / SUSPENDED TAB */}
            {tab === "deprovisioned" && (
              removedCandidates.length === 0 ? (
                <EmptyState icon={<Ban size={24} />} text="No suspended or removed candidates." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Roll</th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {removedCandidates.map((s) => (
                        <tr key={s.id} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-mono text-rose-300">{s.roll || "—"}</td>
                          <td className="px-4 py-3 text-white">{s.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-medium uppercase">{s.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleReprovision(s)}
                              disabled={reprovisionBusy === s.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition disabled:opacity-50"
                            >
                              {reprovisionBusy === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                              Re-activate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}

        <DevContactStrip />
      </AuthGuard>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: ReactNode; color: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
      <div className={`flex items-center gap-2 text-xs text-slate-400 mb-1`}>
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      {icon}
      <p className="mt-3 text-sm">{text}</p>
    </div>
  );
}
