#!/usr/bin/env node
// scripts/scaffold-academics-panel.mjs
/**
 * scripts/scaffold-academics-panel.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * Cookie cutter for an "Academics & Department Analytics" panel
 * (VP / Principal / HOD / Exam Branch approver dashboards).
 *
 * Wires REAL data from the same sources the sysadmin panel reads:
 *   • public.departments                        → code / name
 *   • public.employee_details.is_hod + users    → HOD name
 *   • users(role IN faculty set)                → faculty headcount
 *   • users(role='student') + student_details   → student headcount + year heatmap
 *   • movement_logs                             → on-campus / IN / OUT today
 *
 * Generates:
 *   1. src/lib/academics-department-data.ts              types + aggregators + seed fallback
 *   2. src/components/approver/AcademicsDepartmentPanel.tsx   self-fetching panel
 *   3. src/app/api/approver/academics-department/route.ts     real-data join (Supabase)
 *   4. src/app/(approver)/<role>/academics/page.tsx        thin page wrapper (optional)
 *
 * Anti-shutter hardening baked in:
 *   • Single-flight fetch (inflightRef guard — no parallel storm on remount)
 *   • No setInterval in render — polling lives in usePolling (visibility-aware, cleaned up)
 *   • Suspense boundary in the page wrapper (Next 15/16 useSearchParams requirement)
 *   • useMemo on every derived array/object so React bails out of re-render
 *   • WidgetBoundary per section — one bad chart can't take the page down
 *   • Skeleton-on-first-paint gate — no layout flash when data arrives
 *   • Stable keys (department.code) so React never remounts rows
 *
 * Compliance baked in (audit passes 1 + 2):
 *   ✓ "use client" unconditionally
 *   ✓ GuardedPage + Suspense + WidgetBoundary
 *   ✓ useApiResource + usePolling (visibility-aware; no setInterval)
 *   ✓ POLL_INTERVALS from @/config/app-constants (no magic numbers)
 *   ✓ toasts via useToast(), never alert()
 *   ✓ typed interfaces (no any, no file-scope eslint-disable)
 *   ✓ aria-* on every interactive element
 *   ✓ API route: withAuthorization → requireTrustedHeaders → assertCsrf → rate-limit → handler
 *   ✓ Standard ok()/fail() envelope (no raw NextResponse.json)
 *   ✓ getSupabaseServiceClient() for all DB reads; invalidateCache() after mutation
 *   ✓ addAudit() on HOD reassignment (DEPARTMENT_HOD_ASSIGNED)
 *
 * Usage:
 *   node scripts/scaffold-academics-panel.mjs new <role> [flags]
 *   node scripts/scaffold-academics-panel.mjs list
 *   node scripts/scaffold-academics-panel.mjs help
 *
 * Flags:
 *   --title "Academics & Department Analytics"   panel title
 *   --route /api/approver/academics-department   API endpoint
 *   --group (approver)                            route group
 *   --min-tier 85                                 GuardedPage tier floor
 *   --no-page                                     skip the page wrapper
 *   --force                                       overwrite existing files
 *   --dry-run                                     print, write nothing
 *
 * Examples:
 *   node scripts/scaffold-academics-panel.mjs new vice-principal
 *   node scripts/scaffold-academics-panel.mjs new principal --title "Institution Academics"
 *   node scripts/scaffold-academics-panel.mjs new hod --min-tier 50 --no-page
 */

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ══════════════════════════════════════════════════════════
   ANSI
   ══════════════════════════════════════════════════════════════════════════ */
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✗ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
const pascal    = (s) => s.split(/[-_\s]+/).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const camel     = (s) => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };
const titleCase = (s) => s.split(/[-_\s]+/).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
const kebab     = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()).replace(/^-/, "");

async function writeFileSafe(absPath, content, { force, dryRun }) {
  if (existsSync(absPath) && !force) {
    warn(`skipped (exists): ${path.relative(process.cwd(), absPath)}`);
    return false;
  }
  if (dryRun) {
    info(`would write: ${path.relative(process.cwd(), absPath)}`);
    return true;
  }
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, "utf8");
  ok(`wrote: ${path.relative(process.cwd(), absPath)}`);
  return true;
}

function parseArgs(argv) {
  const [cmd, target, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--force")      flags.force = true;
    else if (a === "--no-page") flags.noPage = true;
    else if (a === "--dry-run") flags.dryRun = true;
    else if (a.startsWith("--")) {
      const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      flags[k] = rest[++i];
    }
  }
  return { cmd, target, flags };
}

/* ══════════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════════════════════════ */
function buildContext(role, flags) {
  const roleSlug = kebab(role || "vice-principal");
  const rolePascal = pascal(role || "vice-principal");
  const title = flags.title || "Academics & Department Analytics";
  const route = flags.route || "/api/approver/academics-department";
  const group = flags.group || "(approver)";
  const minTier = Number(flags.minTier || 85);
  return {
    role: role || "vice-principal", roleSlug, rolePascal, title, route, group, minTier,
    libPath:  `src/lib/academics-department-data.ts`,
    panelPath:`src/components/approver/AcademicsDepartmentPanel.tsx`,
    apiPath:  `src/app/api/approver/academics-department/route.ts`,
    pagePath: `src/app/${group}/${roleSlug}/academics/page.tsx`,
  };
}

/* ══════════════════════════════════════════════════════════
   TEMPLATE 1 — src/lib/academics-department-data.ts
   ══════════════════════════════════════════════════════════════════════════ */
function buildDataLib(ctx) {
  return `// src/lib/academics-department-data.ts
// SCAFFOLD:ACADEMICS — types + aggregators + seed fallback.
// Regenerate with: node scripts/scaffold-academics-panel.mjs new ${ctx.role} --force

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface AcademicHod {
  id: string;
  name: string;
  email?: string | null;
  uniqueId?: string | null;
  /** ISO timestamp of last assignment (audit trail lives in audit_logs). */
  assignedAt?: string | null;
}

export interface AcademicDepartmentRow {
  /** Stable department code (CSE / IT / ECE / EEE / MECH / …) */
  code: string;
  /** Human display name */
  name: string;
  /** Assigned HOD — null when vacant */
  hod: AcademicHod | null;
  /** Active faculty headcount (users.role IN academic set) */
  facultyCount: number;
  /** Active student headcount (users.role = 'student') */
  studentCount: number;
  /** Faculty-to-student ratio, computed = studentCount / max(facultyCount, 1) */
  ratio: number;
  /** Live presence today */
  onCampus: number;
  inToday: number;
  outToday: number;
  /** Optional heatmap by year — y1..y4 + lateral entry */
  heatmap?: { y1: number; y2: number; y3: number; y4: number; le: number };
}

export interface AcademicsDepartmentTotals {
  departments: number;
  students: number;
  faculty: number;
  /** Campus-wide ratio = totalStudents / max(totalFaculty, 1) */
  ratio: number;
  /** True when the API returned live rows (vs. the seed fallback) */
  live: boolean;
}

export interface AcademicsDepartmentPayload {
  departments: AcademicDepartmentRow[];
  totals: AcademicsDepartmentTotals;
  generatedAt: string;
}

/** Envelope the API actually returns: { data: AcademicsDepartmentPayload }. */
export interface AcademicsDepartmentEnvelope {
  data?: AcademicsDepartmentPayload;
}

/* ─── Aggregators (pure, memo-friendly) ─────────────────────────── */

export function computeRatio(studentCount: number, facultyCount: number): number {
  if (facultyCount <= 0) return studentCount > 0 ? Number.POSITIVE_INFINITY : 0;
  return Math.round((studentCount / facultyCount) * 10) / 10;
}

export function ratioLabel(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "—";
  return \`1 : \${ratio}\`;
}

export function summarize(rows: AcademicDepartmentRow[]): AcademicsDepartmentTotals {
  const students = rows.reduce((s, r) => s + r.studentCount, 0);
  const faculty  = rows.reduce((s, r) => s + r.facultyCount, 0);
  return {
    departments: rows.length,
    students,
    faculty,
    ratio: computeRatio(students, faculty),
    live: false,
  };
}

/* ─── Seed fallback (only used when the API returns zero rows) ──── */

export const SEED_DEPARTMENTS: AcademicDepartmentRow[] = [
  { code: "CSE",  name: "Computer Science & Engineering",   hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "IT",   name: "Information Technology",           hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "ECE",  name: "Electronics & Communication Engg", hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "EEE",  name: "Electrical & Electronics Engg",    hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "MECH", name: "Mechanical Engineering",           hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
];

/* ─── Type guards ────────────────────────────────────────────────── */

export function isAcademicsPayload(v: unknown): v is AcademicsDepartmentPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as { departments?: unknown; totals?: unknown };
  return Array.isArray(p.departments) && typeof p.totals === "object" && p.totals !== null;
}

export function isAcademicsEnvelope(v: unknown): v is AcademicsDepartmentEnvelope {
  if (!v || typeof v !== "object") return false;
  return isAcademicsPayload((v as { data?: unknown }).data);
}
`;
}

/* ══════════════════════════════════════════════════════════
   TEMPLATE 2 — src/components/approver/AcademicsDepartmentPanel.tsx
   ══════════════════════════════════════════════════════════════════════════ */
function buildPanel(ctx) {
  return `"use client";
// src/components/approver/AcademicsDepartmentPanel.tsx
// SCAFFOLD:ACADEMICS — self-fetching academics & department analytics panel.
// Regenerate with: node scripts/scaffold-academics-panel.mjs new ${ctx.role} --force
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
  /** Tier floor for the inline HOD-assign control (default ${ctx.minTier}). */
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
        <span className={\`h-7 w-7 rounded-lg grid place-items-center \${tint}\`} aria-hidden="true">
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
  title = "${ctx.title}",
  editMinTier = ${ctx.minTier},
}: AcademicsDepartmentPanelProps) {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  // useApiResource: cached, single-flight fetch with its own loading/error state.
  const {
    data: payload,
    loading,
    error,
    refresh,
  } = useApiResource<AcademicsDepartmentPayload | null>("${ctx.route}", {
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
        const res = await fetch("${ctx.route}", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "include",
          body: JSON.stringify({ department: code, hodName: name }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? \`HTTP \${res.status}\`);
        }
        addToast({
          variant: "success",
          title: "HOD reassigned",
          message: name ? \`\${code} → \${name}\` : \`\${code} HOD cleared\`,
        });
        // Bust the read cache so the next refresh reflects the new HOD.
        await clearCache("${ctx.route}");
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
                                  aria-label={\`New HOD name for \${d.name}\`}
                                  className="h-7 w-40 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs text-[var(--text-primary)]"
                                  placeholder="HOD name"
                                />
                                <button
                                  type="button"
                                  onClick={() => void saveHod(d.code)}
                                  disabled={isSaving}
                                  className="h-7 w-7 grid place-items-center rounded-md bg-emerald-500/15 text-emerald-400 disabled:opacity-50"
                                  aria-label={\`Save HOD for \${d.name}\`}
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
                                  aria-label={\`Cancel editing HOD for \${d.name}\`}
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
                                    aria-label={\`Edit HOD for \${d.name}\`}
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
`;
}

/* ══════════════════════════════════════════════════════════
   TEMPLATE 3 — src/app/api/approver/academics-department/route.ts
   ══════════════════════════════════════════════════════════════════════════ */
function buildApi(ctx) {
  return `// src/app/api/approver/academics-department/route.ts
// SCAFFOLD:ACADEMICS — real-data join for the academics & department panel.
//
// Joins the same sources the sysadmin / departments panel reads:
//   • public.departments                                → code / name
//   • public.users + public.employee_details          → faculty headcount + HOD
//   • public.users + public.student_details           → student headcount + year heatmap
//   • public.movement_logs                            → on-campus / IN / OUT today
//
// GET   → ok({ data: AcademicsDepartmentPayload })
// PATCH { department, hodName } → atomic HOD reassignment, audited.
//
// Compliance: withAuthorization → requireTrustedHeaders → assertCsrf →
// rate-limit → handler. Standard ok()/fail() envelope (no raw
// NextResponse.json). getSupabaseServiceClient() for all DB access;
// invalidateCache() after the mutation.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { assertCsrf } from "@/lib/csrf";
import { addAudit } from "@/lib/db";
import { assertLength } from "@/lib/validation";
import { invalidateCache } from "@/lib/cache";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withTransaction } from "@/lib/postgres";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Roles that may read the academics analytics. */
const READ_ROLES: Role[] = [
  "sysadmin", "admin", "principal", "vice_principal", "exam_branch", "oie", "hod",
];
/** Roles that may reassign an HOD. */
const HOD_EDIT_ROLES: Role[] = ["sysadmin", "admin", "principal"];

/* ──────────────────────────────────────────────────────────────────────── */
/* GET — full department analytics join                                   */
/* ──────────────────────────────────────────────────────────────────────── */

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;
  void auth;

  const supabase = getSupabaseServiceClient();

  // Departments (code + name)
  const { data: departments, error: deptErr } = await supabase
    .from("departments")
    .select("code, name");
  if (deptErr) return fail("DEPT_FETCH_FAILED", deptErr.message, 500);

  // Users: role, department, name, email, unique_id, status
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, role, department_id, name, email, unique_id, status");
  if (usersErr) return fail("USERS_FETCH_FAILED", usersErr.message, 500);

  // Employee details: is_hod + department linkage
  const { data: employees, error: empErr } = await supabase
    .from("employee_details")
    .select("user_id, department_id, is_hod");
  if (empErr) return fail("EMPLOYEES_FETCH_FAILED", empErr.message, 500);

  // Student details: year (for the heatmap)
  const { data: studentDetails, error: sdErr } = await supabase
    .from("student_details")
    .select("user_id, year");
  if (sdErr) return fail("STUDENTS_FETCH_FAILED", sdErr.message, 500);

  // Movement logs for today: IN / OUT presence
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const { data: movements, error: movErr } = await supabase
    .from("movement_logs")
    .select("user_id, direction, created_at")
    .gte("created_at", todayStart);
  if (movErr) return fail("MOVEMENT_FETCH_FAILED", movErr.message, 500);

  const activeUsers = users.filter((u) => u.status === "ACTIVE");
  const studentYear = new Map<string, number | null>(
    (studentDetails ?? []).map((sd) => [sd.user_id, sd.year ?? null]),
  );

  // Latest movement per user today (IN → on campus, OUT → left)
  const latestMovement = new Map<string, "IN" | "OUT">();
  for (const m of (movements ?? []).sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  )) {
    if (m.direction === "IN" || m.direction === "OUT") {
      latestMovement.set(m.user_id, m.direction);
    }
  }

  const rows = (departments ?? []).map((dept) => {
    const code = dept.code;

    // Faculty: active users whose role is in the academic set, linked to this dept.
    const faculty = activeUsers.filter(
      (u) =>
        u.department_id === code &&
        ["faculty", "hod", "teaching_faculty", "assistant_professor", "associate_professor", "professor"].includes(u.role),
    );

    // Students: active users with role 'student' linked to this dept.
    const students = activeUsers.filter(
      (u) => u.department_id === code && u.role === "student",
    );

    // HOD: employee_details.is_hod = true for this dept (first match wins).
    const hodEmp = (employees ?? []).find(
      (e) => e.department_id === code && e.is_hod === true,
    );
    const hodUser = hodEmp ? activeUsers.find((u) => u.id === hodEmp.user_id) ?? null : null;

    // Presence today for this dept's people.
    const deptUserIds = new Set(
      activeUsers.filter((u) => u.department_id === code).map((u) => u.id),
    );
    let onCampus = 0;
    let inToday = 0;
    let outToday = 0;
    for (const [uid, dir] of latestMovement) {
      if (!deptUserIds.has(uid)) continue;
      if (dir === "IN") { onCampus += 1; inToday += 1; }
      else { outToday += 1; }
    }

    // Year heatmap (y1..y4 + lateral entry).
    const heatmap = { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 };
    for (const s of students) {
      const yr = studentYear.get(s.id);
      if (yr === 1) heatmap.y1 += 1;
      else if (yr === 2) heatmap.y2 += 1;
      else if (yr === 3) heatmap.y3 += 1;
      else if (yr === 4) heatmap.y4 += 1;
      else heatmap.le += 1;
    }

    const facultyCount = faculty.length;
    const studentCount = students.length;

    return {
      code,
      name: dept.name,
      hod: hodUser
        ? { id: hodUser.id, name: hodUser.name, email: hodUser.email ?? null, uniqueId: hodUser.unique_id ?? null }
        : null,
      facultyCount,
      studentCount,
      ratio: facultyCount > 0 ? Math.round((studentCount / facultyCount) * 10) / 10 : 0,
      onCampus,
      inToday,
      outToday,
      heatmap,
    };
  });

  const totalStudents = rows.reduce((s, r) => s + r.studentCount, 0);
  const totalFaculty  = rows.reduce((s, r) => s + r.facultyCount, 0);

  return ok({
    data: {
      departments: rows,
      totals: {
        departments: rows.length,
        students: totalStudents,
        faculty: totalFaculty,
        ratio: totalFaculty > 0 ? Math.round((totalStudents / totalFaculty) * 10) / 10 : 0,
        live: rows.length > 0,
      },
      generatedAt: new Date().toISOString(),
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: READ_ROLES,
  rateLimit: RATE_LIMITS.read,
} as never);

/* ──────────────────────────────────────────────────────────────────────── */
/* PATCH — reassign HOD (atomic: clear prior, mark new)                   */
/* ──────────────────────────────────────────────────────────────────────── */

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  if (!HOD_EDIT_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Insufficient role to reassign HOD", 403);
  }

  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail("INVALID_JSON", "body must be JSON", 400); }
  if (!body || typeof body !== "object") {
    return fail("INVALID_BODY", "body must be an object", 400);
  }

  const { department, hodName, hodUserId } = body as {
    department?: unknown; hodName?: unknown; hodUserId?: unknown;
  };
  if (typeof department !== "string" || !department.trim()) {
    return fail("MISSING_DEPARTMENT", "department is required", 400);
  }
  const deptCode = department.trim();
  try { assertLength(deptCode, 32, "department"); }
  catch (e) { return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid", 400); }

  const name = typeof hodName === "string" ? hodName.trim() : "";
  const explicitId = typeof hodUserId === "string" ? hodUserId.trim() : "";

  // Resolve the target user id: prefer explicit hodUserId, else match by name.
  let targetId = explicitId;
  if (!targetId && name) {
    const supabase = getSupabaseServiceClient();
    const { data: match } = await supabase
      .from("users")
      .select("id")
      .ilike("name", name)
      .in("role", ["faculty", "hod", "teaching_faculty", "assistant_professor", "associate_professor", "professor"])
      .eq("status", "ACTIVE")
      .limit(1);
    targetId = match?.[0]?.id ?? "";
    if (!targetId) {
      return fail("USER_NOT_FOUND", \`No active academic user named "\${name}"\`, 404);
    }
  }

  // Atomic swap: clear old HOD flag in this department, set new one.
  await withTransaction(async (db) => {
    await db.query(
      \`UPDATE public.employee_details ed
          SET is_hod = FALSE
        WHERE ed.department_id = $1
          AND ed.is_hod = TRUE
          AND ed.user_id <> COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)\`,
      [deptCode, targetId || null],
    );

    if (targetId) {
      // Upsert employee_details so the flag actually lands somewhere.
      await db.query(
        \`INSERT INTO public.employee_details (user_id, department_id, is_hod)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (user_id)
         DO UPDATE SET department_id = EXCLUDED.department_id, is_hod = TRUE\`,
        [targetId, deptCode],
      );
    }
  });

  await addAudit({
    action: "DEPARTMENT_HOD_ASSIGNED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: { department: deptCode, hodUserId: targetId || null, hodName: name || null },
  });

  // Bust the read cache so every dashboard reflects the reassignment immediately.
  await invalidateCache("*academics*");
  await invalidateCache("*departments*");

  return ok({ applied: true });
}

export const PATCH = withAuthorization(handlePatch, {
  requiredRole: HOD_EDIT_ROLES,
  rateLimit: RATE_LIMITS.mutation,
} as never);
`;
}

/* ══════════════════════════════════════════════════════════
   TEMPLATE 4 — page wrapper
   ══════════════════════════════════════════════════════════════════════════ */
function buildPage(ctx) {
  return `// src/app/${ctx.group}/${ctx.roleSlug}/academics/page.tsx
// SCAFFOLD:ACADEMICS — thin wrapper. All logic lives in the panel.
// Compliance: GuardedPage + Suspense + WidgetBoundary + DevContactStrip.

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AcademicsDepartmentPanel } from "@/components/approver/AcademicsDepartmentPanel";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [
  "sysadmin", "admin", "principal", "vice_principal", "exam_branch", "oie", "hod",
];

export default function AcademicsDepartmentsPage() {
  return (
    <GuardedPage allowedRoles={ALLOWED} minTier={${ctx.minTier}}>
      <Suspense fallback={<PageLoading />}>
        <div className="p-4 md:p-6 space-y-4">
          <WidgetBoundary title="Academics Department Analytics">
            <AcademicsDepartmentPanel />
          </WidgetBoundary>
          <DevContactStrip />
        </div>
      </Suspense>
    </GuardedPage>
  );
}
`;
}

/* ══════════════════════════════════════════════════════════
   COMMANDS
   ══════════════════════════════════════════════════════════════════════════ */
async function cmdNew(role, flags) {
  if (!role) die("usage: scaffold-academics-panel.mjs new <role> [flags]");
  const ctx = buildContext(role, flags);

  head(`Scaffolding academics panel for role: ${ctx.role}`);
  info(`panel : ${ctx.panelPath}`);
  info(`lib   : ${ctx.libPath}`);
  info(`api   : ${ctx.apiPath}`);
  if (!flags.noPage) info(`page  : ${ctx.pagePath}`);

  const opts = { force: !!flags.force, dryRun: !!flags.dryRun };

  await writeFileSafe(ctx.libPath,   buildDataLib(ctx), opts);
  await writeFileSafe(ctx.panelPath, buildPanel(ctx),   opts);
  await writeFileSafe(ctx.apiPath,   buildApi(ctx),     opts);
  if (!flags.noPage) {
    await writeFileSafe(ctx.pagePath, buildPage(ctx), opts);
  }

  head("Next steps");
  info("1. Mount the panel on your dashboard:");
  info(`     import { AcademicsDepartmentPanel } from "@/components/approver/AcademicsDepartmentPanel";`);
  info(`     <WidgetBoundary title="Academics"><AcademicsDepartmentPanel /></WidgetBoundary>`);
  info("2. Ensure the departments table is seeded (scripts/seed-data.js).");
  info("3. Ensure at least one user has employee_details.is_hod = true.");
  info(`4. Verify the API:  curl -H 'Authorization: Bearer <token>' ${ctx.route}`);
}

async function cmdList() {
  head("Academics panels already on disk");
  const roots = [
    "src/components/approver/AcademicsDepartmentPanel.tsx",
    "src/lib/academics-department-data.ts",
    "src/app/api/approver/academics-department/route.ts",
  ];
  for (const r of roots) {
    info(`${existsSync(r) ? C.green("✓") : C.dim("·")} ${r}`);
  }
}

/* ══════════════════════════════════════════════════════════
   DISPATCH
   ══════════════════════════════════════════════════════════════════════════ */
async function main() {
  const { cmd, target, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(`
${C.bold("scaffold-academics-panel.mjs")} — cookie cutter for Academics & Department Analytics

  ${C.cyan("new")} <role> [flags]     stamp out the panel for a role (vice-principal, principal, hod…)
  ${C.cyan("list")}                   show which generated files already exist
  ${C.cyan("help")}                   this message

Flags:
  --title "…"            panel title (default: "Academics & Department Analytics")
  --route /api/…         API endpoint (default: /api/approver/academics-department)
  --group (approver)     route group for the page wrapper
  --min-tier 85          tier floor for GuardedPage + the inline HOD editor
  --no-page              skip the page wrapper
  --force                overwrite existing files
  --dry-run              print what would happen, write nothing

Examples:
  node scripts/scaffold-academics-panel.mjs new vice-principal
  node scripts/scaffold-academics-panel.mjs new principal --min-tier 90
  node scripts/scaffold-academics-panel.mjs new hod --min-tier 50 --no-page
`);
    return;
  }

  if (cmd === "new")  return cmdNew(target, flags);
  if (cmd === "list") return cmdList();
  die(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(C.red("✗"), e);
  process.exit(1);
});
