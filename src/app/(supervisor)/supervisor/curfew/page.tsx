"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useApiResource } from "@/hooks/useApiResource";
import { getPassTypeName } from "@/hooks/usePassTypes";
import type { GatePass, Role } from "@/lib/types";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { Loader2, MapPin, DoorOpen, CheckSquare, Zap } from "lucide-react";

/* ── helpers ── */

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

function terminalLabel(p: GatePass): string {
  const t = (p as any).terminalId ?? (p as any).terminal_id ?? (p as any).operatorName ?? (p as any).operator;
  return t ? `Desk ${String(t)}` : "Desk n/a";
}

/* ── Outpass approvals ── */

function OutpassApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;

  const [loading, setLoading] = useState(true);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [students, setStudents] = useState<WardenStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, "approving" | "rejecting">>({});
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});
  const [selectedPasses, setSelectedPasses] = useState<string[]>([]);
  const [verifiedParents, setVerifiedParents] = useState<Record<string, boolean>>({});
  const [passTypeFilter, setPassTypeFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [passesRes, studentsRes] = await Promise.all([
        fetch("/api/passes?status=PENDING", { headers: getAuthHeaders(), cache: "no-store" }),
        fetch("/api/students", { headers: getAuthHeaders(), cache: "no-store" }),
      ]);
      const readJson = async (r: Response) => (r.ok ? ((await r.json())?.data ?? []) : []);
      const [loadedPasses, loadedStudents] = await Promise.all([readJson(passesRes), readJson(studentsRes)]);
      const failed: string[] = [];
      if (!passesRes.ok) failed.push("passes");
      if (!studentsRes.ok) failed.push("students");
      if (failed.length === 2) throw new Error("All telemetry sources unavailable");
      if (failed.length) setError(`Could not load: ${failed.join(", ")}`);
      setPasses(Array.isArray(loadedPasses) ? loadedPasses : []);
      setStudents(Array.isArray(loadedStudents) ? loadedStudents : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load telemetry.");
    } finally {
      setLoading(false);
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
      } else setError(json.error?.message || "Action failed");
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setActionState((prev) => {
        const n = { ...prev };
        delete n[passId];
        return n;
      });
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedPasses.length === 0) return;
    await Promise.all(
      selectedPasses.map((passId) => handlePassAction(passId, action, action === "approve" ? "Bulk Approved" : "Bulk Rejected"))
    );
    setSelectedPasses([]);
  };

  const togglePassSelection = (id: string) => {
    setSelectedPasses((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const filteredPasses = passes.filter((p) => {
    if (passTypeFilter === "ALL") return true;
    if (passTypeFilter === "DAY_PASS") return p.reason?.toLowerCase().includes("day");
    if (passTypeFilter === "HOME_OUT") return p.reason?.toLowerCase().includes("home");
    if (passTypeFilter === "DAILY_OUTING")
      return p.reason?.toLowerCase().includes("daily") || p.reason?.toLowerCase().includes("outing") || p.reason?.toLowerCase().includes("short");
    return true;
  });

  // Prune any pass selections that no longer exist.
  const effectiveSelected = selectedPasses.filter((id) => passes.some((p) => p.id === id));

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-muted)] min-w-0">
          Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> · tier {getRoleTier(role)}
          {user?.name ? ` · ${user.name}` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
        {["DAY_PASS", "HOME_OUT", "DAILY_OUTING"].map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setPassTypeFilter(f)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
              passTypeFilter === f ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
            }`}
          >
            {getPassTypeName(f).toUpperCase()}
          </button>
        ))}
        <button type="button"
                    onClick={() => setPassTypeFilter("ALL")}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 ${
            passTypeFilter === "ALL" ? "bg-indigo-500 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
          }`}
        >
          All Types
        </button>
      </div>

      {/* Context chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
        <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[var(--text-muted)] truncate">
            Queue: <span className="font-bold text-[var(--text-primary)]">{filteredPasses.length} pending</span>
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
          <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-[var(--text-muted)] truncate">
            Selected: <span className="font-bold text-[var(--text-primary)]">{effectiveSelected.length}</span>
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-2 text-[11px] min-w-0">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[var(--text-muted)] truncate">
            Auto-refresh: 20s live poll
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3 min-w-0">
          <span>{error}</span>
        </div>
      )}

      {/* Bulk bar */}
      {effectiveSelected.length > 0 && (
        <div className="sticky top-0 z-10 p-3 sm:p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-lg shadow-black/20 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs min-w-0">
            <div className="flex items-center gap-2 font-mono text-[var(--text-muted)] min-w-0">
              <button type="button"
                                onClick={() => setSelectedPasses(effectiveSelected.length === filteredPasses.length ? [] : filteredPasses.map((p) => p.id))}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] font-semibold shrink-0"
              >
                {effectiveSelected.length === filteredPasses.length && filteredPasses.length > 0 ? "Deselect All" : "Select All"}
              </button>
              <span className="truncate">{effectiveSelected.length} selected</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button"
                                onClick={() => handleBulkAction("approve")}
                className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold"
              >
                Approve ({effectiveSelected.length})
              </button>
              <button type="button"
                                onClick={() => handleBulkAction("reject")}
                className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl font-bold"
              >
                Reject ({effectiveSelected.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue */}
      <WidgetBoundary title="Outpass Approvals">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 text-xs overflow-hidden max-h-[70vh] overflow-y-auto min-w-0">
          {filteredPasses.length === 0 ? (
            <p className="p-8 text-center text-[var(--text-muted)]">No pending outpasses match filter criteria.</p>
          ) : (
            filteredPasses.map((p) => {
              const parentPhone = (p as any).parentPhone;
              const isVerified = verifiedParents[p.id] || false;
              const busy = actionState[p.id];
              const hasErr = !!rejectComment[`${p.id}_err`];
              return (
                <div key={p.id} className="py-4 sm:py-5 space-y-3 border-b border-[var(--border)] last:border-b-0 last:pb-0 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={effectiveSelected.includes(p.id)}
                      onChange={() => togglePassSelection(p.id)}
                      className="mt-1 accent-indigo-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--text-primary)] break-words">
                        {safeText(p.studentName, "Unknown student")}{" "}
                        <span className="font-mono text-xs text-indigo-400 font-bold">({safeText(p.roll)})</span>
                      </p>
                      <p className="text-[var(--text-muted)] mt-1 break-words">
                        {getPassTypeName(p.reason)} • {safeText(p.description, "Pass request")} · {fmtPassTime(p.from)} → {fmtPassTime(p.to)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 shrink-0" /> {terminalLabel(p)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button"
                                                onClick={() => handlePassAction(p.id, "approve", rejectComment[p.id] || "")}
                        disabled={!!busy}
                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {busy === "approving" ? "…" : "Approve"}
                      </button>
                      <button type="button"
                                                onClick={() => handlePassAction(p.id, "reject", rejectComment[p.id] || "")}
                        disabled={!!busy}
                        className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {busy === "rejecting" ? "…" : "Reject"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 min-w-0">
                    <div className="p-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 min-w-0">
                      {parentPhone ? (
                        <span className="text-[11px] font-bold text-[var(--text-primary)] break-all">
                          Parent: <a href={`tel:${safeText(parentPhone)}`} className="font-mono text-indigo-400">{safeText(parentPhone)}</a>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">Parent: Not on file</span>
                      )}
                      <label className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-semibold cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isVerified}
                          onChange={(e) => setVerifiedParents((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                          className="accent-emerald-500"
                        />
                        <span>Verified Call</span>
                      </label>
                    </div>
                    <div className="min-w-0">
                      <input
                        value={rejectComment[p.id] || ""}
                        onChange={(e) => setRejectComment((prev) => ({ ...prev, [p.id]: e.target.value, [`${p.id}_err`]: "" }))}
                        placeholder="Rejection remark"
                        className={`w-full text-xs px-3 py-1.5 rounded-xl bg-[var(--bg-base)] border ${
                          hasErr ? "border-rose-500" : "border-[var(--border)]"
                        } text-[var(--text-primary)] focus:outline-none`}
                      />
                      {hasErr && <p className="text-[10px] text-rose-400 mt-1">A remark is required to reject this pass.</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Syncing approval queue…
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

/* ── Wards & Curfew ── */

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
    // session-local only — database/schema.sql has no curfew_strikes table.
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
            className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] flex-1 sm:w-48 min-w-0"
          />
          <select
            value={hostelFilter}
            onChange={(e) => setHostelFilter(e.target.value)}
            className="px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] shrink-0"
          >
            <option value="ALL">All</option>
            <option value="INSIDE">Inside</option>
            <option value="OUTSIDE">Outside</option>
          </select>
        </div>
      </div>

      <WidgetBoundary title="Hostel Wards">
        {rosterViewMode === "list" ? (
          <div className="overflow-x-auto min-w-0 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] border-b border-[var(--border)] font-mono uppercase">
                <tr>
                  <th className="p-3">Ward Student</th>
                  <th className="p-3">Block / Room</th>
                  <th className="p-3">Campus Status</th>
                  <th className="p-3">Demerits</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[var(--text-muted)]">No ward records match.</td>
                  </tr>
                ) : (
                  filteredStudents.slice(0, 20).map((s) => {
                    const isInside = s.status === "ACTIVE" || !s.checkedOutAt;
                    const strikes = studentStrikes[s.id] || 0;
                    return (
                      <tr key={s.id} className="hover:bg-[var(--bg-elevated)]/30">
                        <td className="p-3 font-bold text-[var(--text-primary)]">
                          {s.fullName} <span className="font-mono text-[11px] text-[var(--text-muted)]">({s.roll || s.uniqueId})</span>
                        </td>
                        <td className="p-3 text-[var(--text-muted)] font-mono">
                          {s.hostelBlock || "N/A"} - {s.roomNumber || "N/A"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${isInside ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                            {isInside ? "INSIDE" : "OUT ON PASS"}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          {strikes > 0 ? (
                            <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                              <Zap className="w-3 h-3 text-rose-400" /> {strikes} Strikes
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">0</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button type="button"
                                                        onClick={() => handleAddStrike(s.id)}
                            className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold"
                          >
                            + Strike
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4 text-xs min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[var(--text-primary)]">Hostel A Occupancy Grid</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setSelectedFloor(f)}
                    className={`px-3 py-1 rounded-lg font-bold border ${selectedFloor === f ? "bg-indigo-500 text-white" : "border-[var(--border)] text-[var(--text-muted)]"}`}
                  >
                    Floor {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3 min-w-0">
              {Array.from({ length: 12 }, (_, i) => {
                const roomNum = selectedFloor * 100 + i + 1;
                const matchStudent = students[i % (students.length || 1)];
                const isOut = matchStudent ? matchStudent.status !== "ACTIVE" || Boolean(matchStudent.checkedOutAt) : false;
                const strikes = matchStudent ? studentStrikes[matchStudent.id] || 0 : 0;
                const isLate = strikes > 1;
                return (
                  <div
                    key={roomNum}
                    className={`p-3 rounded-xl border text-center space-y-1 ${isLate ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : isOut ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`}
                  >
                    <p className="font-mono font-bold text-sm">R-{roomNum}</p>
                    <p className="text-[10px] font-bold truncate text-[var(--text-primary)]">
                      {matchStudent?.fullName ? matchStudent.fullName.split(" ")[0] : "Occupant"}
                    </p>
                    <p className="text-[9px] uppercase font-bold">{isLate ? "OVERDUE" : isOut ? "ON PASS" : "PRESENT"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {loading && (
          <div className="p-4 text-center text-xs text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Syncing ward roster…
          </div>
        )}
      </WidgetBoundary>
    </div>
  );
}

export default function CurfewRosterPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CurfewRosterInner />
    </Suspense>
  );
}
