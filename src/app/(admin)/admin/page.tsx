"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fadeInUp } from "@/lib/animations";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { EntryExitChart } from "@/components/admin/EntryExitChart";
import { StudentList } from "@/components/admin/StudentList";
import { CampusStatusCards } from "@/components/admin/CampusStatusCards";
import { GateCardsGrid } from "@/components/admin/GateCardsGrid";
import {
  Activity, GraduationCap, Briefcase, HardHat,
  UserCheck, RefreshCw, AlertCircle, Flame, ShieldAlert, X, Radio,
  Shield, Zap, Sparkles, Database, ArrowRight,
  AlertTriangle, Building2, Users,
  ChevronRight, Bell,
  Radio as RadioIcon
} from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { getAuthHeaders } from "@/hooks/useAuthHeaders";
import { useUIStore } from "@/stores/uiStore";
import type { Lockdown } from "@/lib/db";

const LOCKDOWN_SCOPES = [
  { id: "students", label: "Students",       color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "faculty",  label: "Faculty",        color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { id: "staff",    label: "Staff",          color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { id: "workers",  label: "Workers",        color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { id: "all",      label: "ALL CATEGORIES", color: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
];

const DEPT_COLORS: Record<string, string> = {
  CSE: "bg-blue-500/20 text-blue-400",
  IT: "bg-purple-500/20 text-purple-400",
  ECE: "bg-emerald-500/20 text-emerald-400",
  EEE: "bg-amber-500/20 text-amber-400",
  ME: "bg-rose-500/20 text-rose-400",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function LockdownDialog() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md bg-[var(--bg-surface)] border border-rose-500/30 rounded-3xl p-6 shadow-2xl shadow-rose-500/20">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <h2 className="font-bold text-[var(--text-primary)] text-lg">Emergency Lockdown</h2>
                      <p className="text-xs text-rose-300">Broadcast stop-flow to all gate operators</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                  Select scope. Operators see a <strong className="text-[var(--text-primary)]">red-banner alert</strong> immediately.
                  This does <em>not</em> physically lock gates — it issues a mandatory hold broadcast.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {LOCKDOWN_SCOPES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${s.id === "all" ? "col-span-2" : ""} ${
                        selected.includes(s.id)
                          ? s.color + " ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-current"
                          : "bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
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
                    ? <><RadioIcon className="w-4 h-4 animate-pulse" /> Broadcast Sent to All Gates!</>
                    : sending
                    ? <><RadioIcon className="w-4 h-4 animate-spin" /> Sending…</>
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeLockdown, setActiveLockdown] = useState<Lockdown | null>(null);

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
        setLastUpdated(new Date());
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

  // Fetch active lockdown on mount and poll every 30s (via API, not direct DB call)
  useEffect(() => {
    const fetchLockdown = async () => {
      try {
        const res = await fetch("/api/admin/lockdown", {
          headers: getAuthHeaders(),
        });
        const json = await res.json();
        setActiveLockdown(json.data ?? null);
      } catch {
        // non-blocking: keep previous lockdown state on error
      }
    };
    fetchLockdown();
    const t = setInterval(fetchLockdown, 30_000);
    return () => clearInterval(t);
  }, []);

  // Dynamic polling interval ref: 30s desktop -> 60s mobile (< 768px)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setupInterval = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (typeof document !== "undefined" && document.hidden) return;

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const pollInterval = isMobile ? 60000 : 30000;

      pollIntervalRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        load(false);
      }, pollInterval);
    };

    load(true);
    setupInterval();

    const handleVisibilityChange = () => {
      setupInterval();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Loading live campus telemetry data…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
  const staffStats   = data?.personTypeBreakdown?.staff   || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };
  const workerStats  = data?.personTypeBreakdown?.worker  || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };
  const visitorStats = data?.personTypeBreakdown?.visitor || { total: 0, onCampus: 0, inToday: 0, outToday: 0 };

  const facultyRate = facultyStats.total > 0
    ? Math.round((facultyStats.onCampus / facultyStats.total) * 100)
    : 0;

  // Recent unresolved alerts (top 5)
  const recentAlerts = (data?.alerts ?? []).filter(a => !a.resolved).slice(0, 5);

  // Active gates summary (all gates, sorted by scan count)
  const activeGates = (data?.locations ?? [])
    .sort((a, b) => b.currentScanCount - a.currentScanCount);

  // Department breakdown
  const deptBreakdown = data?.deptBreakdown ?? [];

  // Format last updated
  const formatLastUpdated = () => {
    if (!lastUpdated) return "--";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    return lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
      {/* ── F: Active Lockdown Banner ── */}
      <AnimatePresence>
        {activeLockdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-center gap-4 shadow-lg shadow-rose-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest text-rose-400">⚠ Emergency Lockdown Active</span>
                <span className="text-[10px] font-mono text-rose-300/70">
                  {new Date(activeLockdown.issuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-rose-200/80">Scope:</span>
                {activeLockdown.scopes.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    {s}
                  </span>
                ))}
              </div>
              {activeLockdown.message && (
                <p className="text-xs text-rose-200/60 mt-1">{activeLockdown.message}</p>
              )}
            </div>
            <button
              onClick={() => { setActiveLockdown(null); load(false); }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex items-center justify-end gap-2">
        {/* C: Last Updated timestamp */}
        <LockdownDialog />
      </div>

            {/* ── A: Expanded Status Bar with all person types ── */}
      <CampusStatusCards
        studentStats={studentStats}
        facultyStats={facultyStats}
        staffStats={staffStats}
        workerStats={workerStats}
        visitorStats={visitorStats}
        todayIn={data?.todayIn ?? 0}
        todayOut={data?.todayOut ?? 0}
        totalScans={data?.totalScans ?? 0}
      />
{/* ── B: Recent Alerts Feed ── */}
      {recentAlerts.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-sm hidden sm:inline">🔔 Recent Alerts</span>
              <span className="font-semibold text-sm sm:hidden">🔔</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold">
                {recentAlerts.length} active
              </span>
            </div>
            <button
              onClick={() => router.push("/admin/alerts")}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentAlerts.map((alert) => {
              const severityColors: Record<string, { bg: string; text: string; dot: string }> = {
                critical: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-500" },
                high:     { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-500" },
                medium:   { bg: "bg-blue-500/10", text: "text-blue-400",  dot: "bg-blue-500"  },
                low:      { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-500" },
              };
              const sc = severityColors[alert.severity] ?? severityColors.low;
              return (
                <div key={alert.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-elevated)]/30 transition">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{alert.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{alert.message}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>
                      {alert.severity}
                    </span>
                    {alert.studentRoll && (
                      <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">{alert.studentRoll}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(alert.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

            {/* ── D: Gates at a Glance ── */}
      <GateCardsGrid locations={activeGates} />
{/* ── E: Department Breakdown ── */}
      {deptBreakdown.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm hidden sm:inline">🏛️ Department Breakdown</span>
              <span className="font-semibold text-sm sm:hidden">🏛️</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 hidden sm:block">Today's scan activity by department</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-elevated)]/30">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Entries</th>
                  <th className="py-3 px-4 text-right">Exits</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deptBreakdown.map((dept) => {
                  const colorClass = DEPT_COLORS[dept.deptCode] ?? "bg-slate-500/20 text-slate-400";
                  const total = dept.in + dept.out;
                  return (
                    <tr key={dept.deptCode} className="hover:bg-[var(--bg-elevated)]/30 transition">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${colorClass}`}>{dept.deptCode}</span>
                        <span className="text-[11px] text-[var(--text-muted)] ml-2">{dept.dept}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold text-sm">{dept.in.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-amber-400 font-semibold text-sm">{dept.out.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-[var(--text-primary)] font-bold text-sm">{total.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${dept.pct}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{dept.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── H: Reorganized Quick Actions Grid (8 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          onClick={() => router.push("/admin/alerts")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-rose-500/40 hover:bg-rose-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-rose-400 hidden sm:inline">🚨 Outpass Alerts</span>
            <span className="text-base sm:hidden">🚨</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 hidden sm:block">
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
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-amber-400 hidden sm:inline">📢 Campus Broadcasts</span>
            <span className="text-base sm:hidden">📢</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 hidden sm:block">
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
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-blue-400 hidden sm:inline">⚡ Spatial Density</span>
            <span className="text-base sm:hidden">⚡</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 hidden sm:block">
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
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-emerald-400 hidden sm:inline">🛡️ ID Flagging</span>
            <span className="text-base sm:hidden">🛡️</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 hidden sm:block">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
              Manage Security Holds & Bans
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Flag/unflag accounts for scanning <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/reports")}
          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-cyan-400 hidden sm:inline">📊 Reports</span>
            <span className="text-base sm:hidden">📊</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 hidden sm:block">
            <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
              Historical Data & Exports
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
              Generate reports and export data <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntryExitChart />
        <StudentList />
      </div>
    </motion.div>
  );
}
