"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, GraduationCap, Layers, Loader2, UserX } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { usePersistentQuery } from "@/hooks/usePersistentQuery";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PermissionScopeHint } from "@/components/shared/PermissionScopeHint";

// ── Types ──────────────────────────────────────────────────────────────

interface StudentEntry {
  userId: string;
  roll: string;
  name: string;
  year: number | null;
  section: string | null;
  department: string | null;
  yearOverride: number | null;
  effectiveYear: number | null;
  academicStatus: string | null;
  statusReason: string | null;
  statusSetAt: string | null;
}

interface ClassGroup {
  department: string | null;
  year: number | null;
  section: string | null;
  count: number;
  flagged: number;
  students: StudentEntry[];
}

interface Roster {
  department: string | null;
  totalStudents: number;
  totalFlagged: number;
  byClass: ClassGroup[];
}

type FlagValue = "SUSPENDED" | "DEBARRED" | "LATERAL_JOIN";

const FLAG_META: Record<FlagValue, { label: string; icon: typeof Ban; text: string; solid: string }> = {
  SUSPENDED: { label: "Suspended", icon: UserX,
    text: "text-action-danger",
    solid: "border border-action-danger/30 bg-action-danger/10 text-action-danger" },
  DEBARRED: { label: "Debarred / Repeating", icon: Ban,
    text: "text-action-warning",
    solid: "border border-action-warning/30 bg-action-warning/10 text-action-warning" },
  LATERAL_JOIN: { label: "Lateral Join (with juniors)", icon: GraduationCap,
    text: "text-action-info",
    solid: "border border-action-info/30 bg-action-info/10 text-action-info" },
};

// ── Fetch helpers ─────────────────────────────────────────────────────

async function fetchRoster(dept: string | null): Promise<Roster> {
  const qs = dept ? `?department=${encodeURIComponent(dept)}` : "";
  const res = await fetch(`/api/academic-status${qs}`, { headers: getAuthHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return (body.data ?? body) as Roster;
}

async function setAcademicStatus(
  userId: string,
  academicStatus: FlagValue | null,
  yearOverride: number | null,
  reason: string,
): Promise<void> {
  const res = await fetch("/api/academic-status", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, academicStatus, yearOverride, reason }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
}

// ── Main component ────────────────────────────────────────────────────

function AcademicStatusInner() {
  const user = useAuthStore((s) => s.user);
  const isHod = user?.role === "hod";

  const [roster, setRoster] = useState<Roster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = usePersistentQuery("gate-sysadmin-academic-query");
  const [editing, setEditing] = useState<StudentEntry | null>(null);
  const [draftStatus, setDraftStatus] = useState<FlagValue | "">("");
  const [draftYear, setDraftYear] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pendingFlags, setPendingFlags] = useState<
    Array<{
      user_id: string;
      roll: string;
      name: string;
      department: string | null;
      academic_status: string | null;
      status_reason: string | null;
    }>
  >([]);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/academic-status/pending", { headers: getAuthHeaders() });
      if (!res.ok) return;
      const body = await res.json().catch(() => ({}));
      setPendingFlags(Array.isArray(body?.data) ? body.data : []);
    } catch {
      /* non-approver roles get 403; ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoster(await fetchRoster(null)); // HOD gets auto-scoped server-side
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  const decidePending = async (userId: string, action: "approve" | "reject") => {
    setPendingBusy(userId);
    setPendingMsg(null);
    try {
      const res = await fetch("/api/academic-status/pending", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setPendingMsg(body?.error?.message ?? `Failed to ${action} pending flag.`);
        return;
      }
      setPendingFlags((prev) => prev.filter((p) => p.user_id !== userId));
      setPendingMsg(`Pending academic status ${action}d.`);
      await load();
    } finally {
      setPendingBusy(null);
    }
  };

  useEffect(() => {
    load();
    void loadPending();
  }, [load, loadPending]);

  const filteredGroups = useMemo(() => {
    if (!roster) return [];
    const q = query.trim().toLowerCase();
    if (!q) return roster.byClass;
    return roster.byClass
      .map((g) => ({
        ...g,
        students: g.students.filter(
          (s) =>
            s.roll.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            (s.academicStatus ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.students.length > 0);
  }, [roster, query]);

  const openEditor = (s: StudentEntry) => {
    setEditing(s);
    setDraftStatus((s.academicStatus as FlagValue | null) ?? "");
    setDraftYear(s.yearOverride ? String(s.yearOverride) : "");
    setDraftReason(s.statusReason ?? "");
    setJustSaved(false);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await setAcademicStatus(
        editing.userId,
        draftStatus ? (draftStatus as FlagValue) : null,
        draftYear ? Number(draftYear) : null,
        draftReason,
      );
      setJustSaved(true);
      await load();
      setTimeout(() => {
        setEditing(null);
        setJustSaved(false);
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !roster) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !roster) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-action-danger">{error}</p>
        <button onClick={load} className="mt-3 text-sm text-action-info hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const rosterData = roster!;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Academic Status Governance"
        purpose="Audit, override, and reconcile student academic standing to enforce prerequisite gates and outpass privileges."
        statusSummary={`${rosterData.totalStudents} students tracked across departments with ${rosterData.totalFlagged} active academic flags requiring oversight.`}
        why="Student academic status determines gate access privileges, outpass eligibility, and automated examination hall clearances across campus."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "Classes & Batches", href: "/sysadmin/classes" }}
      />
      {/* Header + stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Academic Status Manager</h1>
          <p className="text-sm text-text-muted mt-1">
            {isHod
              ? `Your department: ${rosterData.department ?? "—"}`
              : "All departments"}{" "}
            · {rosterData.totalStudents} students · {rosterData.totalFlagged} flagged
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roll, name, or status…"
          className="pl-3 pr-4 py-2 text-sm border border-border text-text-primary w-64 focus:outline-none focus:ring-2 focus:ring-action-primary/40"
          aria-label="Search students"
        />
      </div>

      {(pendingFlags.length > 0 || pendingMsg) && (
        <section className="surface-card bg-bg-surface p-4 space-y-3" aria-label="Pending Academic Status Approvals">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Pending Two-Person Approvals ({pendingFlags.length})
            </h2>
            <PermissionScopeHint
              rule="Two-person rule: a second authorized reviewer (Dean, Principal, VP, Chief Warden, or SysAdmin) must approve or reject."
              tone="warn"
            />
            {pendingMsg && <span className="text-xs font-medium text-action-primary">{pendingMsg}</span>}
          </div>
          <div className="space-y-2">
            {pendingFlags.map((pf) => (
              <div key={pf.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">
                    {pf.name} ({pf.roll}) · {pf.academic_status ?? "FLAG"}
                  </p>
                  <p className="text-text-muted">
                    {pf.department ?? "—"} · {pf.status_reason ?? "No reason provided"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pendingBusy === pf.user_id}
                    onClick={() => void decidePending(pf.user_id, "approve")}
                    className="min-h-11 bg-action-primary px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pendingBusy === pf.user_id}
                    onClick={() => void decidePending(pf.user_id, "reject")}
                    className="min-h-11 bg-action-danger px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flag legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(FLAG_META) as FlagValue[]).map((k) => {
          const meta = FLAG_META[k];
          const Icon = meta.icon;
          const count = rosterData.byClass.reduce(
            (acc, g) => acc + g.students.filter((s) => s.academicStatus === k).length,
            0,
          );
          return (
            <span key={k} className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
              <Icon className="h-3 w-3" />
              {meta.label} ({count})
            </span>
          );
        })}
      </div>

      {/* Class groups */}
      <div className="space-y-4">
        {filteredGroups.map((g, i) => (
          <div key={`${g.department}-${g.year}-${g.section}-${i}`} className="bg-bg-surface">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <Layers className="h-4 w-4 text-text-muted" />
                <span>
                  {g.department} · Year {g.year} · Sec {g.section}
                </span>
                <span className="text-xs text-text-muted font-normal">
                  {g.count} students
                </span>
              </div>
              {g.flagged > 0 && (
                <span className="flex items-center gap-1 text-xs text-action-danger font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {g.flagged} flagged
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-2">Roll</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Class</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {g.students.map((s) => {
                  const meta = s.academicStatus ? FLAG_META[s.academicStatus as FlagValue] : null;
                  const Icon = meta?.icon;
                  return (
                    <tr key={s.userId} className="border-t border-border/50 hover:bg-bg-base/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-text-primary">{s.roll}</td>
                      <td className="px-4 py-2.5 text-text-primary">{s.name}</td>
                      <td className="px-4 py-2.5 text-text-muted">
                        {s.year}-{s.section}
                        {s.yearOverride && (
                          <span className="ml-1.5 text-xs text-action-info">
                            (studying Yr {s.yearOverride})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {meta && Icon ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.text}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-text-muted max-w-[180px] truncate">
                        {s.statusReason ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => openEditor(s)}
                          className="text-xs text-action-info hover:underline"
                        >
                          {s.academicStatus ? "Edit" : "Flag"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {filteredGroups.length === 0 && rosterData.totalStudents > 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            No students match your search.
          </p>
        )}
        {rosterData.totalStudents === 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            No students found in {isHod ? "your department" : "this scope"}.
          </p>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="surface-card w-full max-w-md p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {editing.name} <span className="font-mono text-xs text-text-muted">({editing.roll})</span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Currently: {editing.year}-{editing.section}
                {editing.academicStatus && ` · ${FLAG_META[editing.academicStatus as FlagValue]?.label}`}
              </p>
            </div>

            {/* Status buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDraftStatus("")}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  draftStatus === ""
                    ? "border border-action-success bg-action-success/10 text-action-success"
                    : "border border-border text-text-muted hover:text-text-primary"
                }`}
              >
                Clear status
              </button>
              {(Object.keys(FLAG_META) as FlagValue[]).map((k) => {
                const meta = FLAG_META[k];
                const Icon = meta.icon;
                return (
                  <button
                    key={k}
                    onClick={() => setDraftStatus(k)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                      draftStatus === k ? meta.solid : "border border-border text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Year override (for lateral join / debarred) */}
            {(draftStatus === "LATERAL_JOIN" || draftStatus === "DEBARRED") && (
              <div>
                <label className="text-xs font-medium text-text-muted">
                  Studying with year (override)
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={draftYear}
                  onChange={(e) => setDraftYear(e.target.value)}
                  placeholder={`e.g. ${editing.year ? Number(editing.year) - 1 : 1}`}
                  className="mt-1 w-full px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary/40"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="text-xs font-medium text-text-muted">Reason (optional)</label>
              <textarea
                value={draftReason}
                onChange={(e) => setDraftReason(e.target.value)}
                rows={2}
                placeholder="e.g. Failed 1st internal, repeating CSE 3-A"
                className="mt-1 w-full px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary/40 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-2 text-xs text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-action-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : justSaved ? (
                  "Saved ✓"
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────

export default function AcademicStatusPage() {
  return (
    <AuthGuard allowedRoles={["hod", "dean", "principal", "vice_principal", "chief_warden", "admin", "sysadmin"]}>
      <WidgetBoundary>
        <AcademicStatusInner />
      </WidgetBoundary>
    </AuthGuard>
  );
}
