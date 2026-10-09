"use client";

import { useState, useCallback, useEffect } from "react";
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
  Unlock,
  Download,
  BarChart2,
  Zap,
  Grid,
  List,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import type { GatePass, Alert } from "@/lib/types";

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

export default function SupervisorDashboardPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
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

  // New Feature States
  const [isLockdown, setIsLockdown] = useState(false);
  const [selectedPasses, setSelectedPasses] = useState<string[]>([]);
  const [verifiedParents, setVerifiedParents] = useState<Record<string, boolean>>({});
  const [passTypeFilter, setPassTypeFilter] = useState<string>("ALL");
  const [rosterViewMode, setRosterViewMode] = useState<"list" | "heatmap">("list");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [studentStrikes, setStudentStrikes] = useState<Record<string, number>>({});

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
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
      const [passesJson, studentsJson, alertsJson] = await Promise.all([
        passesRes.json(),
        studentsRes.json(),
        alertsRes.json(),
      ]);

      const loadedPasses = Array.isArray(passesJson.data) ? passesJson.data : [];
      const loadedStudents = Array.isArray(studentsJson.data) ? studentsJson.data : [];
      const loadedAlerts = Array.isArray(alertsJson.data) ? alertsJson.data : [];

      setPasses(loadedPasses);
      setStudents(loadedStudents);
      setAlerts(loadedAlerts);

      const total = loadedStudents.length || 288;
      const inside = loadedStudents.filter((s: WardenStudent) => s.status === "ACTIVE" || !s.checkedOutAt).length || 245;
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
    for (const passId of selectedPasses) {
      await handlePassAction(passId, action, action === "approve" ? "Bulk Approved by Warden" : "Bulk Rejected by Warden");
    }
    setSelectedPasses([]);
  };

  const togglePassSelection = (id: string) => {
    setSelectedPasses((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleAddStrike = async (studentId: string) => {
    const newCount = (studentStrikes[studentId] || 0) + 1;
    setStudentStrikes((prev) => ({ ...prev, [studentId]: newCount }));
    try {
      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "CURFEW_STRIKE_ADDED",
          details: { studentId, strikeCount: newCount },
        }),
      });
    } catch {
      // non-blocking log
    }
  };

  const handleToggleLockdown = async () => {
    const nextState = !isLockdown;
    try {
      const res = await fetch("/api/admin/lockdown", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: ["students", "all"], reason: nextState ? "Supervisor Emergency Lockdown" : "Lockdown Lifted" }),
      });
      const json = await res.json();
      if (json.success) {
        setIsLockdown(nextState);
      }
    } catch {
      setIsLockdown(nextState);
    }
  };

  const exportMovementCSV = () => {
    const headers = ["Student Name", "Roll / ID", "Hostel Block", "Room", "Campus Status", "Curfew Violations"];
    const rows = students.map((s) => [
      `"${s.fullName}"`,
      `"${s.roll || s.uniqueId}"`,
      `"${s.hostelBlock || "Boys Hostel A"}"`,
      `"${s.roomNumber || "101"}"`,
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
    <div className="space-y-6 pb-12">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                  <span className="sm:hidden">🏫</span>
                  <span className="hidden sm:inline">🏫 Supervisor & Warden Desk</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {user?.employeeId || user?.uniqueId || "WDN-001"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">{user?.name || "Hostel Warden"} • Real-time hostel curfew oversight & outpass desk.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleLockdown}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isLockdown
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-lg shadow-rose-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
              }`}
            >
              {isLockdown ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span>{isLockdown ? "LOCKDOWN ACTIVE" : "Emergency Lockdown"}</span>
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
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-[var(--border)] overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview", icon: Home },
            { id: "approvals", label: "Outpass Approvals", icon: CheckSquare, badge: stats.pendingPasses },
            { id: "curfew", label: "Wards & Curfew", icon: Clock },
            { id: "alerts", label: "Security Radar", icon: ShieldAlert, badge: stats.activeAlerts },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${active ? "bg-[var(--action-primary)] text-white shadow-md shadow-[var(--action-primary)]/20" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {isLockdown && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-between shadow-lg shadow-rose-500/10">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <p className="text-base font-black uppercase tracking-wider text-rose-200">🚨 HOSTEL EMERGENCY LOCKDOWN IN EFFECT</p>
              <p className="text-xs font-normal text-rose-300 mt-0.5">All student outpasses & exit scan authorizations are temporarily suspended by Warden Command.</p>
            </div>
          </div>
          <button onClick={() => setIsLockdown(false)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl font-bold shrink-0">
            Deactivate
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-400" /> Total Wards</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{stats.totalWards}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Inside Hostel</p>
          <p className="text-2xl font-black text-emerald-400">{stats.onCampus}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-amber-400" /> Out on Pass</p>
          <p className="text-2xl font-black text-amber-400">{stats.offCampus}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-sky-400" /> Pending Passes</p>
          <p className="text-2xl font-black text-sky-400">{stats.pendingPasses}</p>
        </div>
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Curfew Alerts</p>
          <p className="text-2xl font-black text-rose-400">{stats.activeAlerts}</p>
        </div>
      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" /> <span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Pending Outpasses ({passes.length})</span>
              </h2>
              {passes.length > 0 && (
                <button onClick={() => setActiveTab("approvals")} className="text-xs text-indigo-400 font-semibold hover:underline">
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
                  <p>No outpasses pending warden sign-off.</p>
                </div>
              ) : (
                passes.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-[var(--bg-elevated)]/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-primary)]">{p.studentName}</span>
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{p.roll}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 uppercase">{p.reason}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{p.description || "Outing Pass"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handlePassAction(p.id, "approve", rejectComment[p.id] || "")} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handlePassAction(p.id, "reject", rejectComment[p.id] || "")} className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <input value={rejectComment[p.id] || ""} onChange={(e) => setRejectComment((prev) => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))} placeholder="Rejection remark (required if rejecting)" className={`flex-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border ${rejectComment[`${p.id}_err`] ? "border-rose-500" : "border-[var(--border)]"} text-[var(--text-primary)] focus:outline-none`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" /> <span className="sm:hidden">🔔</span><span className="hidden sm:inline">🔔 Curfew Radar ({alerts.length})</span>
            </h2>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              <span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Outpass Approvals</span>
            </h2>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {["ALL", "DAY_PASS", "HOME_OUT", "DAILY_OUTING"].map((f) => (
                <button key={f} onClick={() => setPassTypeFilter(f)} className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 ${passTypeFilter === f ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"}`}>
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {filteredPasses.length > 0 && (
            <div className="p-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono text-[var(--text-muted)]">
                <button onClick={() => setSelectedPasses(selectedPasses.length === filteredPasses.length ? [] : filteredPasses.map((p) => p.id))} className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-semibold">
                  {selectedPasses.length === filteredPasses.length ? "Deselect All" : "Select All"}
                </button>
                <span>{selectedPasses.length} selected</span>
              </div>
              {selectedPasses.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleBulkAction("approve")} className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold">Approve ({selectedPasses.length})</button>
                  <button onClick={() => handleBulkAction("reject")} className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold">Reject ({selectedPasses.length})</button>
                </div>
              )}
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 text-xs divide-y divide-[var(--border)]">
            {filteredPasses.length === 0 ? (
              <p className="p-8 text-center text-[var(--text-muted)]">No pending outpasses match filter criteria.</p>
            ) : (
              filteredPasses.map((p) => {
                const parentPhone = (p as any).parentPhone || "+91 98765 43210";
                const isVerified = verifiedParents[p.id] || false;
                return (
                  <div key={p.id} className="py-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selectedPasses.includes(p.id)} onChange={() => togglePassSelection(p.id)} className="mt-1 accent-indigo-500 rounded cursor-pointer" />
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{p.studentName} <span className="font-mono text-xs text-indigo-400 font-bold">({p.roll})</span></p>
                          <p className="text-[var(--text-muted)] mt-1">{p.reason} • {p.description || "Pass request"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handlePassAction(p.id, "approve", rejectComment[p.id] || "")} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold">Approve</button>
                        <button onClick={() => handlePassAction(p.id, "reject", rejectComment[p.id] || "")} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold">Reject</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">Parent: <a href={`tel:${parentPhone}`} className="font-mono text-indigo-400">{parentPhone}</a></span>
                        <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold cursor-pointer">
                          <input type="checkbox" checked={isVerified} onChange={(e) => setVerifiedParents((prev) => ({ ...prev, [p.id]: e.target.checked }))} className="accent-emerald-500" />
                          <span>Verified Call</span>
                        </label>
                      </div>
                      <input value={rejectComment[p.id] || ""} onChange={(e) => setRejectComment((prev) => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))} placeholder="Rejection remark" className="text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)]" />
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              <span className="sm:hidden">👥</span><span className="hidden sm:inline">👥 Hostel Wards</span>
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-1 text-xs">
                <button onClick={() => setRosterViewMode("list")} className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${rosterViewMode === "list" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}>
                  <List className="w-3.5 h-3.5" /> List
                </button>
                <button onClick={() => setRosterViewMode("heatmap")} className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 ${rosterViewMode === "heatmap" ? "bg-indigo-500 text-white" : "text-[var(--text-muted)]"}`}>
                  <Grid className="w-3.5 h-3.5" /> Grid Map
                </button>
              </div>
              <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search Ward..." className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] flex-1 sm:w-48" />
            </div>
          </div>

          {rosterViewMode === "list" ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
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
                          <td className="p-3 text-[var(--text-muted)] font-mono">{s.hostelBlock || "Boys Hostel A"} - {s.roomNumber || "101"}</td>
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Security & Curfew Radar</h2>
          <div className="space-y-3">
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
      </div>
    </div>
  );
}
