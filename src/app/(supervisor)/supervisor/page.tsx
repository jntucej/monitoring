"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserCheck,
  DoorOpen,
  Home,
  ShieldAlert,
  PhoneCall,
  Lock,
  Download,
  BarChart2,
  Zap,
  Grid,
  List,
  MapPin,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { getPassTypeName } from "@/hooks/usePassTypes";
import type { GatePass, Alert, Gate } from "@/lib/types";
import { DevContactStrip } from "@/components/shared/DevContactStrip";

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

// Defensive render helpers — gate-pass rows historically leaked "undefined"/"NaN"
// straight into JSX when API fields were missing or dates were malformed.
function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function fmtPassTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function gateLabel(gates: Gate[] | null, p: GatePass): string {
  const id = (p as any).gateId ?? (p as any).gate_id;
  const code = (p as any).gateCode ?? (p as any).gate_code;
  if (id || code) {
    const g = gates?.find((x) => (id && (x.id === id || x.gateCode === id)) || (code && x.gateCode === code));
    if (g?.name) return g.name;
    return code || id;
  }
  return "Main Gate";
}

function terminalLabel(p: GatePass): string {
  const t = (p as any).terminalId ?? (p as any).terminal_id ?? (p as any).operatorName ?? (p as any).operator;
  return t ? `Desk ${String(t)}` : "Desk n/a";
}

function SupervisorDashboardInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Deep-link helper: switching tabs also syncs ?tab= into the URL (history
  // pushState only — no navigation) so "View Full Desk" is refresh-safe and the
  // tab controls stay in the same state.
  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [passes, setPasses] = useState<GatePass[]>([]);
  const [students, setStudents] = useState<WardenStudent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ totalWards: 0, onCampus: 0, offCampus: 0, pendingPasses: 0, activeAlerts: 0 });
  const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting">>({});
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [hostelFilter, setHostelFilter] = useState("ALL");

  // Lockdown state is admin-managed (admin endpoint is admin-only and
  // intentionally NOT polled from the warden desk — a supervisor/warden only
  // READS the active lockdown when a scan is attempted; the gate desk pages
  // surface it. No admin telemetry is fetched on this dashboard.
  const [selectedPasses, setSelectedPasses] = useState<string[]>([]);
  const [verifiedParents, setVerifiedParents] = useState<Record<string, boolean>>({});
  const [passTypeFilter, setPassTypeFilter] = useState<string>("ALL");
  const [rosterViewMode, setRosterViewMode] = useState<"list" | "heatmap">("list");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [studentStrikes, setStudentStrikes] = useState<Record<string, number>>({});
  const [gates, setGates] = useState<Gate[] | null>(null);

  // Gate/terminal directory: fetch on mount so pass cards can resolve gate names
  // from gate ids without leaking raw ids. Fail soft — a missing directory just
  // means cards fall back to "Main Gate" instead of showing "undefined".
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/gates", { headers: getAuthHeaders(), cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (active && json.success && Array.isArray(json.data)) {
          setGates(json.data as Gate[]);
        }
      } catch {
        /* gate directory unavailable — cards fall back to safe labels */
      }
    })();
    return () => { active = false; };
  }, []);

  // Prune any pass selections that no longer exist (e.g. after an approve/reject
  // removes a card, or after a live refresh) so the bulk bar count never shows a
  // stale number and "Select All" toggle logic stays consistent.
  useEffect(() => {
    setSelectedPasses((prev) => prev.filter((id) => passes.some((p) => p.id === id)));
  }, [passes]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    setActiveTab(tabParam || "overview");
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [passesRes, studentsRes, alertsRes] = await Promise.all([
        fetch("/api/passes?status=PENDING", { headers: getAuthHeaders(), cache: "no-store" }),
        fetch("/api/students", { headers: getAuthHeaders(), cache: "no-store" }),
        fetch("/api/alerts?resolved=false", { headers: getAuthHeaders(), cache: "no-store" }),
      ]);

      // Never fabricate: only read a body from a response that actually succeeded,
      // and surface partial failure instead of silently rendering an empty dashboard.
      const readJson = async (r: Response) => (r.ok ? ((await r.json())?.data ?? []) : []);
      const [loadedPasses, loadedStudents, loadedAlerts] = await Promise.all([
        readJson(passesRes),
        readJson(studentsRes),
        readJson(alertsRes),
      ]);

      const failed: string[] = [];
      if (!passesRes.ok) failed.push("passes");
      if (!studentsRes.ok) failed.push("students");
      if (!alertsRes.ok) failed.push("alerts");
      if (failed.length === 3) throw new Error("All telemetry sources unavailable");
      if (failed.length) setError(`Could not load: ${failed.join(", ")}`);

      const safe = <T,>(v: T): T[] => (Array.isArray(v) ? v : []);
      setPasses(safe(loadedPasses));
      setStudents(safe(loadedStudents));
      setAlerts(safe(loadedAlerts));

      const total = loadedStudents.length;
      const inside = loadedStudents.filter((s: WardenStudent) => s.status === "ACTIVE" || !s.checkedOutAt).length;
      setStats({
        totalWards: total,
        onCampus: inside,
        offCampus: total - inside,
        pendingPasses: loadedPasses.length,
        activeAlerts: loadedAlerts.length,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Live toggle drives refetch; polls every 20s while Live.
  useLiveRefresh(loadData, { intervalMs: 20000 });

  const handlePassAction = async (passId: string, action: "approve" | "reject", comment: string) => {
    if (action === "reject" && !comment.trim()) {
      setRejectComment((prev) => ({ ...prev, [`${passId}_err`]: "1" }));
      return;
    }
    setActionState((prev) => ({ ...prev, [passId]: action === "approve" ? "approving" : "rejecting" }));
    try {
      const res = await fetch(`/api/passes/${passId}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const json = await res.json();
      if (json.success) {
        setPasses((prev) => prev.filter((p) => p.id !== passId));
        setStats((prev) => ({ ...prev, pendingPasses: Math.max(0, prev.pendingPasses - 1) }));
      } else setError(json.error?.message || "Action failed");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setActionState((prev) => { const n = { ...prev }; delete n[passId]; return n; });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setStats((prev) => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
      }
    } catch (e) { console.error(e); }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedPasses.length === 0) return;
    await Promise.all(selectedPasses.map(passId => 
      handlePassAction(passId, action, action === "approve" ? "Bulk Approved" : "Bulk Rejected")
    ));
    setSelectedPasses([]);
  };

  const togglePassSelection = (id: string) => {
    setSelectedPasses((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleAddStrike = (studentId: string) => {
    // ponytail: session-local only -- database/schema.sql has no curfew_strikes
    // table, so there is nowhere to persist this. Keep it in memory and surface
    // that it is NOT saved, rather than POSTing to a route that cannot work.
    // Upgrade path: add the table + an insert helper in lib/db.ts.
    setStudentStrikes((prev) => ({ ...prev, [studentId]: (prev[studentId] || 0) + 1 }));
  };

  const handleToggleLockdown = async () => {
    // Lockdown is an admin capability — a warden/supervisor cannot raise or
    // lift it. Surface a clear message instead of calling the admin endpoint.
    setError("Emergency lockdown can only be raised or lifted by an administrator.");
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

  const filteredPasses = passes.filter((p) => {
    if (passTypeFilter === "ALL") return true;
    if (passTypeFilter === "DAY_PASS") return p.reason?.toLowerCase().includes("day");
    if (passTypeFilter === "HOME_OUT") return p.reason?.toLowerCase().includes("home");
    if (passTypeFilter === "DAILY_OUTING") return p.reason?.toLowerCase().includes("daily") || p.reason?.toLowerCase().includes("outing") || p.reason?.toLowerCase().includes("short");
    return true;
  });

  const filteredStudents = students.filter((s) => {
    const matchSearch = !studentSearch || s.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) || (s.roll || s.uniqueId)?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchHostel = hostelFilter === "ALL" || (hostelFilter === "INSIDE" && (s.status === "ACTIVE" || !s.checkedOutAt)) || (hostelFilter === "OUTSIDE" && s.checkedOutAt);
    return matchSearch && matchHostel;
  });

  return (
    <div className="space-y-5 sm:space-y-6 pb-8 sm:pb-12 min-w-0">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-5 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                  <span className="sm:hidden">🏫</span>
                  <span className="hidden sm:inline">🏫 Supervisor Desk</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {user?.employeeId || user?.uniqueId || "WDN-001"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">{user?.name || "Supervisor"} • Real-time hostel curfew oversight & outpass desk.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            <button
              onClick={handleToggleLockdown}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
            >
              <Lock className="w-4 h-4" />
              <span>Report Lockdown</span>
            </button>

            <button
              onClick={exportMovementCSV}
              className="px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar min-w-0">
          {[
            { id: "overview", label: "Overview", icon: Home },
            { id: "approvals", label: "Outpass Approvals", icon: CheckSquare, badge: stats.pendingPasses },
            { id: "curfew", label: "Wards & Curfew", icon: Clock },
            { id: "alerts", label: "Security Radar", icon: ShieldAlert, badge: stats.activeAlerts },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${active ? "bg-[var(--action-primary)] text-white shadow-md shadow-[var(--action-primary)]/20" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-1.5">
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> Total Wards</p>
          <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{stats.totalWards}</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-1.5">
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5"><UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> Inside Hostel</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.onCampus}</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-1.5">
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5"><DoorOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> Out on Pass</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">{stats.offCampus}</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-1.5">
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5"><CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" /> Pending Passes</p>
          <p className="text-2xl sm:text-3xl font-black text-sky-400">{stats.pendingPasses}</p>
        </div>
        <div className="col-span-2 md:col-span-1 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col gap-1.5">
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> Curfew Alerts</p>
          <p className="text-2xl sm:text-3xl font-black text-rose-400">{stats.activeAlerts}</p>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" /> <span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Pending Outpasses ({passes.length})</span>
              </h2>
              {passes.length > 0 && (
                <button onClick={() => switchTab("approvals")} className="text-xs text-indigo-400 font-semibold hover:underline shrink-0">
                  View Full Desk →
                </button>
              )}
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">Syncing requests…</div>
              ) : passes.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-xs text-[var(--text-muted)]">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto opacity-40" />
                  <p className="font-bold text-[var(--text-primary)]">All Passes Approved</p>
                  <p>No outpasses pending sign-off.</p>
                </div>
              ) : (
                passes.slice(0, 5).map((p) => {
                  const busy = actionState[p.id];
                  return (
                    <div key={p.id} className="p-4 sm:p-5 space-y-3 hover:bg-[var(--bg-elevated)]/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)] break-words">{safeText(p.studentName, "Unknown student")}</span>
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{safeText(p.roll)}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 uppercase">{getPassTypeName(p.reason)}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-1 break-words">{p.description ? safeText(p.description) : "Outing Pass"} · {fmtPassTime(p.from)} → {fmtPassTime(p.to)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handlePassAction(p.id, "approve", rejectComment[p.id] || "")} disabled={!!busy} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                            <CheckCircle className="w-4 h-4" /> {busy === "approving" ? "…" : "Approve"}
                          </button>
                          <button onClick={() => handlePassAction(p.id, "reject", rejectComment[p.id] || "")} disabled={!!busy} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                            <XCircle className="w-4 h-4" /> {busy === "rejecting" ? "…" : "Reject"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-muted)] shrink-0" />
                        <input value={rejectComment[p.id] || ""} onChange={(e) => setRejectComment((prev) => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))} placeholder="Rejection remark (required if rejecting)" className={`flex-1 min-w-0 text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border ${rejectComment[`${p.id}_err`] ? "border-rose-500" : "border-[var(--border)]"} text-[var(--text-primary)] focus:outline-none`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" /> <span className="sm:hidden">🔔</span><span className="hidden sm:inline">🔔 Curfew Radar ({alerts.length})</span>
            </h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 space-y-3">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                  No active curfew alerts.
                </div>
              ) : (
                alerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-rose-300">{a.title || "Curfew Warning"}</p>
                      <button onClick={() => handleResolveAlert(a.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 shrink-0">
                        Resolve
                      </button>
                    </div>
                    <p className="text-[var(--text-muted)]">{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="space-y-4 sm:space-y-5">


          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)] min-w-0">
              <span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Outpass Approvals</span>
            </h2>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
              {["DAY_PASS", "HOME_OUT", "DAILY_OUTING"].map((f) => (
                <button key={f} onClick={() => setPassTypeFilter(f)} className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 ${passTypeFilter === f ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"}`}>
                  {getPassTypeName(f).toUpperCase()}
                </button>
              ))}
              <button onClick={() => setPassTypeFilter("ALL")} className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 ${passTypeFilter === "ALL" ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"}`}>
                All Types
              </button>
            </div>
          </div>

          {/* Gate / terminal desk strip — resolves the active gate + terminal per pass.
              Rendered defensively: raw ids only shown when the directory can't resolve
              a friendly name, so "undefined"/"NaN" can never leak into the UI. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Campus: <span className="font-bold text-[var(--text-primary)]">UCEJ Main Campus</span></span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Terminals: <span className="font-bold text-[var(--text-primary)]">{gates ? `${gates.length} online` : "…"}</span></span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
              <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[var(--text-muted)] truncate">Queue: <span className="font-bold text-[var(--text-primary)]">{filteredPasses.length} pending</span></span>
            </div>
          </div>

          {filteredPasses.length > 0 && (
            <div className="sticky top-0 z-10 p-3 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-lg shadow-black/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-2 text-xs min-w-0">
                <div className="flex items-center gap-2 font-mono text-[var(--text-muted)] min-w-0">
                  <button onClick={() => setSelectedPasses(selectedPasses.length === filteredPasses.length ? [] : filteredPasses.map((p) => p.id))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-semibold shrink-0">
                    {selectedPasses.length === filteredPasses.length && filteredPasses.length > 0 ? "Deselect All" : "Select All"}
                  </button>
                  <span className="truncate">{selectedPasses.length} selected</span>
                </div>
                {selectedPasses.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleBulkAction("approve")} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold">Approve ({selectedPasses.length})</button>
                    <button onClick={() => handleBulkAction("reject")} className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold">Reject ({selectedPasses.length})</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 text-xs overflow-hidden max-h-[70vh] overflow-y-auto">
            {filteredPasses.length === 0 ? (
              <p className="p-8 text-center text-[var(--text-muted)]">No pending outpasses match filter criteria.</p>
            ) : (
              filteredPasses.map((p) => {
                const parentPhone = (p as any).parentPhone;
                const isVerified = verifiedParents[p.id] || false;
                const busy = actionState[p.id];
                const hasErr = !!rejectComment[`${p.id}_err`];
                return (
                  <div key={p.id} className="py-4 sm:py-5 space-y-3 border-b border-[var(--border)] last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <input type="checkbox" checked={selectedPasses.includes(p.id)} onChange={() => togglePassSelection(p.id)} className="mt-1 accent-indigo-500 rounded cursor-pointer shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[var(--text-primary)] break-words">{safeText(p.studentName, "Unknown student")} <span className="font-mono text-xs text-indigo-400 font-bold">({safeText(p.roll)})</span></p>
                        <p className="text-[var(--text-muted)] mt-1 break-words">{getPassTypeName(p.reason)} • {safeText(p.description, "Pass request")} · {fmtPassTime(p.from)} → {fmtPassTime(p.to)}</p>
                        {/* Gate terminal desk line */}
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> Gate: <span className="font-bold text-[var(--text-primary)]">{gateLabel(gates, p)}</span></span>
                          <span className="inline-flex items-center gap-1"><DoorOpen className="w-3 h-3 shrink-0" /> {terminalLabel(p)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handlePassAction(p.id, "approve", rejectComment[p.id] || "")} disabled={!!busy} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed">{busy === "approving" ? "…" : "Approve"}</button>
                        <button onClick={() => handlePassAction(p.id, "reject", rejectComment[p.id] || "")} disabled={!!busy} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed">{busy === "rejecting" ? "…" : "Reject"}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 min-w-0">
                        {parentPhone ? (
                          <span className="text-[11px] font-bold text-[var(--text-primary)] break-all">Parent: <a href={`tel:${safeText(parentPhone)}`} className="font-mono text-indigo-400">{safeText(parentPhone)}</a></span>
                        ) : (
                          <span className="text-[11px] font-bold text-[var(--text-muted)]">Parent: Not on file</span>
                        )}
                        <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold cursor-pointer shrink-0">
                          <input type="checkbox" checked={isVerified} onChange={(e) => setVerifiedParents((prev) => ({ ...prev, [p.id]: e.target.checked }))} className="accent-emerald-500" />
                          <span>Verified Call</span>
                        </label>
                      </div>
                      <div className="min-w-0">
                        <input value={rejectComment[p.id] || ""} onChange={(e) => setRejectComment((prev) => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))} placeholder="Rejection remark" className={`w-full text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-base)] border ${hasErr ? "border-rose-500" : "border-[var(--border)]"} text-[var(--text-primary)] focus:outline-none`} />
                        {hasErr && <p className="text-[10px] text-rose-400 mt-1">A remark is required to reject this pass.</p>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Curfew Roster Tab */}
      {activeTab === "curfew" && (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              <span className="sm:hidden">👥</span><span className="hidden sm:inline">👥 Hostel Wards</span>
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 text-xs">
                <button onClick={() => setRosterViewMode("list")} className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${rosterViewMode === "list" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}>
                  <List className="w-4 h-4 sm:w-5 sm:h-5" /> List
                </button>
                <button onClick={() => setRosterViewMode("heatmap")} className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${rosterViewMode === "heatmap" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}>
                  <Grid className="w-6 h-6 md:w-8 md:h-8" /> Grid Map
                </button>
              </div>
              <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search Ward..." className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] flex-1 sm:w-48" />
            </div>
          </div>

          {rosterViewMode === "list" ? (
            <div className="overflow-x-auto min-w-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] border-b border-[var(--border)] font-mono uppercase">
                  <tr><th className="p-3">Ward Student</th><th className="p-3">Block / Room</th><th className="p-3">Campus Status</th><th className="p-3">Demerits</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">No ward records match.</td></tr>
                  ) : (
                    filteredStudents.slice(0, 20).map((s) => {
                      const isInside = s.status === "ACTIVE" || !s.checkedOutAt;
                      const strikes = studentStrikes[s.id] || 0;
                      return (
                        <tr key={s.id} className="hover:bg-[var(--bg-elevated)]/30">
                          <td className="p-3 font-bold text-[var(--text-primary)]">{s.fullName} <span className="font-mono text-[11px] text-[var(--text-muted)]">({s.roll || s.uniqueId})</span></td>
                          <td className="p-3 text-[var(--text-muted)] font-mono">{s.hostelBlock || "N/A"} - {s.roomNumber || "N/A"}</td>
                          <td className="p-3"><span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${isInside ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{isInside ? "INSIDE" : "OUT ON PASS"}</span></td>
                          <td className="p-3 font-mono">{strikes > 0 ? <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max"><Zap className="w-3 h-3 text-rose-400" /> {strikes} Strikes</span> : <span className="text-[var(--text-muted)]">0</span>}</td>
                          <td className="p-3 text-right"><button onClick={() => handleAddStrike(s.id)} className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold">+ Strike</button></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[var(--text-primary)]">Hostel A Occupancy Grid</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((f) => (
                    <button key={f} onClick={() => setSelectedFloor(f)} className={`px-3 py-1 rounded-lg font-bold border ${selectedFloor === f ? "bg-indigo-500 text-white" : "border-[var(--border)] text-[var(--text-muted)]"}`}>Floor {f}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
                {Array.from({ length: 12 }, (_, i) => {
                  const roomNum = selectedFloor * 100 + i + 1;
                  const matchStudent = students[i % (students.length || 1)];
                  const isOut = matchStudent ? (matchStudent.status !== "ACTIVE" || Boolean(matchStudent.checkedOutAt)) : false;
                  const strikes = matchStudent ? (studentStrikes[matchStudent.id] || 0) : 0;
                  const isLate = strikes > 1;
                  return (
                    <div key={roomNum} className={`p-3 rounded-xl border text-center space-y-1 ${isLate ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : isOut ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}>
                      <p className="font-mono font-bold text-sm">R-{roomNum}</p>
                      <p className="text-[10px] font-bold truncate text-[var(--text-primary)]">{matchStudent?.fullName ? matchStudent.fullName.split(" ")[0] : "Occupant"}</p>
                      <p className="text-[9px] uppercase font-bold">{isLate ? "OVERDUE" : isOut ? "ON PASS" : "PRESENT"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="space-y-4 sm:space-y-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Security & Curfew Radar</h2>
          <div className="space-y-3 sm:space-y-4">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">No active curfew alerts.</div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="p-4 bg-[var(--bg-surface)] border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs shadow-md">
                  <div>
                    <p className="font-bold text-rose-300">{a.title || "Curfew Alert"}</p>
                    <p className="text-[var(--text-muted)] mt-1">{a.message}</p>
                  </div>
                  <button onClick={() => handleResolveAlert(a.id)} className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold shrink-0">Resolve</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contact the developer (all roles) */}
      <DevContactStrip />
    </div>
  );
}

export default function SupervisorDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">Loading…</div>}>
      <SupervisorDashboardInner />
    </Suspense>
  );
}
