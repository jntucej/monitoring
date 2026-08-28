"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/admin/StatCard";
import { EntryExitChart } from "@/components/admin/EntryExitChart";
import { StudentList } from "@/components/admin/StudentList";
import {
  Activity, GraduationCap, Briefcase, HardHat,
  UserCheck, RefreshCw, AlertCircle, Flame, ShieldAlert, X, Radio,
  Shield, Zap, Sparkles, Database, ArrowRight
} from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

const LOCKDOWN_SCOPES = [
  { id: "students", label: "Students",       color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "faculty",  label: "Faculty",        color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { id: "staff",    label: "Staff",          color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { id: "workers",  label: "Workers",        color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { id: "all",      label: "ALL CATEGORIES", color: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
];

function LockdownDialog() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { deviceProfile }       = useUIStore();
  const isHighEnd               = deviceProfile === "high-end";

  const toggle = (id: string) => {
    if (id === "all") { setSelected(["all"]); return; }
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev.filter(x => x !== "all"), id]
    );
  };

  const broadcast = async () => {
    if (selected.length === 0 || sending) return;
    setSending(true);
    setApiError(null);
    try {
      const res = await fetch("/api/admin/lockdown", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: selected }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
        setTimeout(() => { setOpen(false); setSent(false); setSelected([]); }, 2200);
      } else {
        setApiError(json.error?.message || "Broadcast failed");
      }
    } catch {
      setApiError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-widest hover:bg-rose-500/20 transition-all"
      >
        <Flame className="w-3.5 h-3.5 group-hover:animate-pulse" />
        Lockdown
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={isHighEnd ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={isHighEnd ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-500/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg">Emergency Lockdown</h2>
                      <p className="text-xs text-rose-300">Broadcast stop-flow to all gate operators</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Select scope. Operators see a <strong className="text-white">red-banner alert</strong> immediately.
                  This does <em>not</em> physically lock gates — it issues a mandatory hold broadcast.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {LOCKDOWN_SCOPES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${s.id === "all" ? "col-span-2" : ""} ${
                        selected.includes(s.id)
                          ? s.color + " ring-2 ring-offset-1 ring-offset-slate-900 ring-current"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={broadcast}
                  disabled={selected.length === 0 || sending || sent}
                  className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-500/30"
                >
                  {sent
                    ? <><Radio className="w-4 h-4 animate-pulse" /> Broadcast Sent to All Gates!</>
                    : sending
                    ? <><Radio className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><ShieldAlert className="w-4 h-4" /> Broadcast Emergency Alert</>}
                </button>
                {apiError && (
                  <p className="mt-2 text-xs text-rose-400 text-center">{apiError}</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();


  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (showLoadingState = false) => {
    if (showLoadingState) setLoading(true);
    setIsRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/dashboard", { headers, cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message ?? "Failed to load dashboard. Database might be initializing.";
        setError(msg);
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error connecting to API");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      load(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Loading live campus telemetry data…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--bg-surface)] animate-pulse border border-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-400 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5" />
            <span>Connection Warning</span>
          </div>
          <p className="text-sm">{error}.</p>
          <button
            onClick={() => load(true)}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const studentStats = data?.personTypeBreakdown?.student || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };
  const facultyStats = data?.personTypeBreakdown?.faculty || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };
  const staffStats = data?.personTypeBreakdown?.staff || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };
  const workerStats = data?.personTypeBreakdown?.worker || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };

  const facultyRate = facultyStats.total > 0
    ? Math.round((facultyStats.onCampus / facultyStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)]">Real-time gate telemetry, student, faculty & worker infometrics</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => load(false)}
            disabled={isRefreshing}
            className={`px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-2 ${
              isRefreshing
                ? "border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "border-[var(--border)]"
            }`}
          >
            <Activity
              className={`w-3.5 h-3.5 text-emerald-400 transition-all ${
                isRefreshing
                  ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse scale-110"
                  : "drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]"
              }`}
            />
            {isRefreshing ? "Syncing..." : "Live Refresh"}
          </button>
          <LockdownDialog />
        </div>
      </div>

      {/* 4 Separate Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Students on Campus"
          value={studentStats.onCampus.toLocaleString()}
          icon={GraduationCap}
          color="#3b82f6"
          trend={`${studentStats.inToday} in / ${studentStats.outToday} out today`}
          onClick={() => router.push("/admin/students")}
        />
        <StatCard
          label="Faculty on Campus"
          value={facultyStats.onCampus.toLocaleString()}
          icon={UserCheck}
          color="#10b981"
          trend={`${facultyRate}% attendance rate`}
          onClick={() => router.push("/admin/faculty")}
        />
        <StatCard
          label="Staff on Campus"
          value={staffStats.onCampus.toLocaleString()}
          icon={Briefcase}
          color="#8b5cf6"
          trend={`${staffStats.inToday} entries today`}
          onClick={() => router.push("/admin/staff")}
        />
        <StatCard
          label="Workers on Campus"
          value={workerStats.onCampus.toLocaleString()}
          icon={HardHat}
          color="#f59e0b"
          trend={`${workerStats.inToday} entries today`}
          onClick={() => router.push("/admin/workers")}
        />
      </div>

      {/* Faculty Dedicated Infometrics Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Faculty Infometrics Summary</h3>
            <p className="text-xs text-[var(--text-muted)]">Live teaching staff tracking & presence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">On Campus</span>
            <span className="font-bold text-emerald-400 text-sm">{facultyStats.onCampus} / {facultyStats.total}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Entries Today</span>
            <span className="font-bold text-blue-400 text-sm">{facultyStats.inToday}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Exits Today</span>
            <span className="font-bold text-amber-400 text-sm">{facultyStats.outToday}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Attendance %</span>
            <span className="font-bold text-emerald-400 text-sm">{facultyRate}%</span>
          </div>
        </div>
      </div>

      {/* Campus Command & Telemetry Operational Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => router.push("/admin/alerts")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-rose-500/40 hover:bg-rose-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-rose-400">
              Outpass Alerts
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-rose-400 transition-colors">
              Security & Curfew Desk
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Review flagged attempts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/announcements")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-amber-500/40 hover:bg-amber-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-amber-400">
              Campus Broadcasts
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-amber-400 transition-colors">
              Announcements Manager
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Issue gate alerts & news <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/occupancy")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-blue-500/40 hover:bg-blue-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-blue-400">
              Spatial Density
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">
              Live Digital Twin
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Monitor zone capacity <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/students")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-emerald-400">
              ID Flagging & Accounts
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
              Manage Security Holds & Bans
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Flag/unflag accounts for scanning <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntryExitChart />
        <StudentList />
      </div>
    </div>
  );
}
