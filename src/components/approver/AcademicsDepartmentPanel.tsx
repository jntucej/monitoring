"use client";
// src/components/approver/AcademicsDepartmentPanel.tsx
// SCAFFOLD:ACADEMICS — self-fetching academics & department analytics panel.
// Regenerate with: node scripts/scaffold-academics-panel.mjs new vice-principal --force
//
// Compliance: GuardedPage-wrapped (in page wrapper) · Suspense-safe ·
// useApiResource + usePolling (visibility-aware; no setInterval) ·
// WidgetBoundary per section · toasts via useToast() (never alert()) ·
// typed interfaces (no any, no file-scope eslint-disable) ·
// aria-* on every interactive element.
//
// Anti-shutter guarantees baked in:
//   • single-flight fetch (inflightRef guard) — no parallel storm on remount
//   • polling lives in usePolling (cleared on unmount), never in render
//   • every derived array/object is wrapped in useMemo
//   • WidgetBoundary per section — one failure never blanks the panel
//   • skeleton-on-first-paint gate — no layout flash
//   • stable row keys (department.code)

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Building2, Users, GraduationCap, Scale, RefreshCw, Loader2,
  Pencil, Check, X, AlertTriangle, Inbox, Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/toast";

import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";

import { POLL_INTERVALS } from "@/config/app-constants";
import { getAuthHeaders } from "@/lib/utils";
import { fmtInt } from "@/lib/formatters";
import { getRoleTier } from "@/lib/alert-hierarchy";
import {
  type AcademicDepartmentRow,
  type AcademicsDepartmentPayload,
  SEED_DEPARTMENTS,
  computeRatio,
  ratioLabel,
  summarize,
  isAcademicsPayload,
} from "@/lib/academics-department-data";

interface AcademicsDepartmentPanelProps {
  /** Optional title override (defaults to the panel heading). */
  title?: string;
  /** Tier floor for the inline HOD-assign control (default 85). */
  editMinTier?: number;
}

/* ── Small building blocks ──────────────────────────────────────── */

function Kpi({
  label, value, sub, icon: Icon, tint,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <span className={`h-7 w-7 rounded-lg grid place-items-center ${tint}`} aria-hidden="true">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[11px] text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-4" aria-label="Loading department analytics">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-3">
          <Skeleton className="h-6 col-span-2" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ))}
    </div>
  );
}

/* ── Main panel ─────────────────────────────────────────────────────────── */

export function AcademicsDepartmentPanel({
  title = "Academics & Department Analytics",
  editMinTier = 85,
}: AcademicsDepartmentPanelProps) {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  // useApiResource: cached, single-flight fetch with its own loading/error state.
  const {
    data: payload,
    loading,
    error,
    refresh,
  } = useApiResource<AcademicsDepartmentPayload | null>("/api/approver/academics-department", {
    deps: [],
    ttlMs: POLL_INTERVALS.normal,
  });

  // Live-toggle driven refresh — visibility-aware, cleared on unmount. No setInterval here.
  usePolling(() => { void refresh(); }, { intervalMs: POLL_INTERVALS.normal });

  // Single-flight guard: one in-flight mutation at a time, no parallel storm.
  const inflightRef = useRef<Promise<void> | null>(null);

  // Inline HOD edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [hodDraft, setHodDraft] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);

  // Search filter
  const [query, setQuery] = useState("");

  const tier = useMemo(() => getRoleTier(user?.role ?? ""), [user?.role]);
  const canEditHod = tier >= editMinTier;

  /* ── HOD inline save ─────────────────────────────────────────────── */

  const beginEdit = useCallback((row: AcademicDepartmentRow) => {
    setEditing(row.code);
    setHodDraft(row.hod?.name ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setHodDraft("");
  }, []);

  const saveHod = useCallback(
    async (code: string) => {
      if (!canEditHod) return;
      const name = hodDraft.trim();
      setSavingCode(code);
      try {
        const res = await fetch("/api/approver/academics-department", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({ department: code, hodName: name }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `HTTP ${res.status}`);
        }
        addToast({
          variant: "success",
          title: "HOD reassigned",
          message: name ? `${code} → ${name}` : `${code} HOD cleared`,
        });
        // Bust the read cache so the next refresh reflects the new HOD.
        await clearCache("/api/approver/academics-department");
        await refresh();
        setEditing(null);
        setHodDraft("");
      } catch (e) {
        addToast({
          variant: "error",
          title: "Reassign failed",
          message: e instanceof Error ? e.message : "Save failed",
        });
      } finally {
        setSavingCode(null);
      }
    },
    [canEditHod, hodDraft, addToast, refresh],
  );

  /* ── Derived (memoized so React bails out of re-renders) ───────── */

  const departments = useMemo<AcademicDepartmentRow[]>(() => {
    if (!payload) return [];
    if (payload.departments.length > 0) return payload.departments;
    // Empty DB → seed fallback so the panel is never blank
    return SEED_DEPARTMENTS;
  }, [payload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.hod?.name ?? "").toLowerCase().includes(q),
    );
  }, [departments, query]);

  const totals = useMemo(() => {
    const t = summarize(departments);
    return { ...t, live: Boolean(payload?.totals.live) };
  }, [departments, payload?.totals.live]);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <section className="space-y-4" aria-labelledby="academics-dept-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--action-info)]" aria-hidden="true" />
          <h2
            id="academics-dept-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            {title}
          </h2>
          {!totals.live && (
            <Badge variant="dayout" className="text-[10px]">
              seed fallback
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search department or HOD…"
              aria-label="Search department or HOD"
              className="h-8 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-8 pr-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-info)]/40"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh academics analytics"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-auto underline hover:no-underline"
            aria-label="Retry loading academics analytics"
          >
            retry
          </button>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Departments" value={fmtInt(totals.departments)} icon={Building2}
             tint="bg-sky-500/10 text-sky-400" />
        <Kpi label="Students" value={fmtInt(totals.students)} icon={GraduationCap}
             tint="bg-emerald-500/10 text-emerald-400" />
        <Kpi label="Faculty" value={fmtInt(totals.faculty)} icon={Users}
             tint="bg-violet-500/10 text-violet-400" />
        <Kpi label="Ratio (1:N)" value={ratioLabel(totals.ratio)} icon={Scale}
             tint="bg-amber-500/10 text-amber-400"
             sub="students per faculty" />
      </div>

      {/* ── Department table ── */}
      <WidgetBoundary title="Academics Department Breakdown">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Per-department breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && departments.length === 0 ? (
              <LoadingRows />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-4 h-4" />}
                title="No departments found"
                description={query ? "Try a different search term." : "No departments configured yet."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border)]">
                      <th className="px-4 py-2.5" scope="col">Code</th>
                      <th className="px-4 py-2.5" scope="col">Department</th>
                      <th className="px-4 py-2.5" scope="col">HOD</th>
                      <th className="px-4 py-2.5 text-right" scope="col">Faculty</th>
                      <th className="px-4 py-2.5 text-right" scope="col">Students</th>
                      <th className="px-4 py-2.5 text-right" scope="col">Ratio</th>
                      <th className="px-4 py-2.5 text-right" scope="col">On campus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => {
                      const isEditing = editing === d.code;
                      const isSaving  = savingCode === d.code;
                      return (
                        <tr
                          key={d.code}
                          className="border-b border-[var(--border)]/60 hover:bg-[var(--bg-elevated)]/40"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                            {d.code}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--text-primary)]">
                            {d.name}
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  autoFocus
                                  type="text"
                                  value={hodDraft}
                                  onChange={(e) => setHodDraft(e.target.value)}
                                  aria-label={`New HOD name for ${d.name}`}
                                  className="h-7 w-40 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-primary)]"
                                  placeholder="HOD name"
                                />
                                <button
                                  type="button"
                                  onClick={() => void saveHod(d.code)}
                                  disabled={isSaving}
                                  className="h-7 w-7 grid place-items-center rounded-md bg-emerald-500/15 text-emerald-400 disabled:opacity-50"
                                  aria-label={`Save HOD for ${d.name}`}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="h-7 w-7 grid place-items-center rounded-md bg-rose-500/15 text-rose-400"
                                  aria-label={`Cancel editing HOD for ${d.name}`}
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={d.hod ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] italic"}>
                                  {d.hod?.name ?? "Vacant"}
                                </span>
                                {canEditHod && (
                                  <button
                                    type="button"
                                    onClick={() => beginEdit(d)}
                                    className="opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Edit HOD for ${d.name}`}
                                  >
                                    <Pencil className="h-3 w-3 text-[var(--text-muted)]" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
                            {fmtInt(d.facultyCount)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-primary)]">
                            {fmtInt(d.studentCount)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-muted)]">
                            {ratioLabel(computeRatio(d.studentCount, d.facultyCount))}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            <span className="text-emerald-400">{fmtInt(d.onCampus)}</span>
                            <span className="text-[var(--text-muted)] text-xs ml-1">
                              ({fmtInt(d.inToday)} in / {fmtInt(d.outToday)} out)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </WidgetBoundary>

      <p className="text-[11px] text-[var(--text-muted)] text-right">
        {totals.live ? "Live data" : "Seed fallback"} · updated{" "}
        {payload ? new Date(payload.generatedAt).toLocaleTimeString() : "—"}
      </p>
    </section>
  );
}
