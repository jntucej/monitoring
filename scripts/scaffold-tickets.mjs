#!/usr/bin/env node
/**
 * scripts/scaffold-tickets.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Cookie cutter for self-service ticket dashboards ("My Tickets" / "My Requests").
 *
 * Fixes the class of bug where a nav link points at /<role>/tickets but no
 * page, no API filter, and no index exists — the exact hostel-manager 404.
 *
 * Generated files match the LIVE schema of this repo:
 *   - PostgreSQL table: permission_requests  (renamed to `permissions` by
 *     migration 20261026000001, exposed via backward-compat VIEW permission_requests)
 *   - Column for the requester FKey: student_user_id  (renamed to requester_user_id
 *     in the table, but the VIEW re-aliases it back to student_user_id)
 *   - Existing components live at:
 *       @/components/student/PermissionTicketCard   (re-exports PermissionItem)
 *       @/components/approver/PermissionDetailPanel
 *       @/components/approver/PermissionRow          (exports PermissionItem)
 *       @/components/ui/skeleton
 *   - API routes use: getSupabaseServiceClient(), withAuthorization(),
 *     withRateLimit(), AuthContext { userId, role }
 *
 * Generates (shared, idempotent — safe mode):
 *   • src/components/shared/TicketKpiStrip.tsx
 *   • src/components/shared/MyTicketsPanel.tsx
 *   • src/app/api/permissions/my-counts/route.ts
 *
 * Generates (per role — feature mode):
 *   • src/app/(<group>)/<route>/tickets/page.tsx       (thin wrapper)
 *
 * Optionally generates (--with-admin):
 *   • src/app/api/admin/<feature>-tickets/route.ts
 *   • src/app/(sysadmin)/sysadmin/<feature>-tickets/page.tsx
 *
 * Optionally generates (--with-migration):
 *   • database/migrations/<ts>_ticket_indexes.sql
 *
 * Usage:
 *   node scripts/scaffold-tickets.mjs new hostel-manager \
 *     --roles hostel_manager,deputy_warden,caretaker,warden \
 *     --title "My Tickets" \
 *     --with-admin --admin-feature hostel
 *
 *   node scripts/scaffold-tickets.mjs new student --roles student --no-create
 *   node scripts/scaffold-tickets.mjs new faculty --roles faculty,hod \
 *     --new-ticket-href /staff/leaves --title "My Requests"
 *
 *   node scripts/scaffold-tickets.mjs list
 *   node scripts/scaffold-tickets.mjs help
 *
 * Flags:
 *   --roles a,b,c                Roles allowed on the page        (required)
 *   --title "My Tickets"         Display title                   (default: "My Tickets")
 *   --subtitle "..."             Display subtitle                (default: "Permission requests you have raised")
 *   --group (approver)           Route group                     (default: (approver))
 *   --route /hostel-manager      Base route                      (default: /<feature>)
 *   --new-ticket-href /path      "New Ticket" CTA href           (default: /student/permissions/new)
 *   --no-create                  Hide "New Ticket" button entirely
 *   --with-admin                 Emit admin cross-cutting page + API
 *   --admin-feature hostel       Admin feature slug              (default: <feature>)
 *   --with-migration             Emit the DB migration           (default: off)
 *   --force                      Overwrite feature files
 *   --dry-run                    Print, don't write
 */

import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ═══════════════════════════════════════════════════════════════════════════
   ANSI + helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const pascal    = (s) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
const camel     = (s) => { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); };
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const kebab     = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "").replace(/[_\s]+/g, "-");

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/** Write content respecting the safe/force/dry triad. */
async function writeFileSafe(relPath, content, { mode, label } = { mode: "safe" }) {
  const abs = join(ROOT, relPath);
  const exists = await pathExists(abs);
  if (mode === "dry") { info(`[dry-run] would write ${relPath}`); return { written: false }; }
  if (exists && mode === "safe") { warn(`  skipped (exists): ${relPath}`); return { written: false }; }
  await fs.mkdir(dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
  ok(`  wrote: ${relPath}${label ? ` ${C.dim(`(${label})`)}` : ""}`);
  return { written: true };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function buildContext(feature, flags) {
  if (!flags.roles) die("--roles is required (comma-separated list of role codes)");
  const roles = flags.roles.split(",").map((s) => s.trim()).filter(Boolean);
  if (roles.length === 0) die("--roles must contain at least one role code");

  const featureKebab = kebab(feature);
  const featureSnake = featureKebab.replace(/-/g, "_");
  const featurePascal = pascal(feature);

  const group   = flags.group   ?? "(approver)";
  const route   = flags.route   ?? `/${featureKebab}`;
  const title   = flags.title   ?? "My Tickets";
  const subtitle = flags.subtitle ?? "Permission requests you have raised";
  const newHref = flags["new-ticket-href"] ?? "/student/permissions/new";
  const canCreate = flags["no-create"] !== true;
  const withAdmin = flags["with-admin"] === true;
  const adminFeature = kebab(flags["admin-feature"] ?? featureKebab);
  const withMigration = flags["with-migration"] === true;

  return {
    raw: feature,
    kebab: featureKebab,
    snake: featureSnake,
    pascal: featurePascal,
    camel: camel(feature),
    roles, group, route, title, subtitle, newHref, canCreate,
    withAdmin, adminFeature, withMigration,
    rolesLiteral: JSON.stringify(roles),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED 1 — src/components/shared/TicketKpiStrip.tsx
   ═══════════════════════════════════════════════════════════════════════════ */

const TICKET_KPI_STRIP_TSX = `"use client";
// src/components/shared/TicketKpiStrip.tsx
// SCAFFOLD:TICKETS — KPI row for the My Tickets dashboard. Idempotent.

import { Clock, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";

export interface TicketCounts {
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface TicketKpiStripProps {
  counts: TicketCounts | null;
  loading?: boolean;
}

export function TicketKpiStrip({ counts, loading }: TicketKpiStripProps) {
  const items = [
    { label: "Pending",   value: counts?.pending   ?? 0, icon: Clock,         tint: "text-amber-500"   },
    { label: "Approved",  value: counts?.approved  ?? 0, icon: CheckCircle2,  tint: "text-emerald-500" },
    { label: "Rejected",  value: counts?.rejected  ?? 0, icon: XCircle,       tint: "text-rose-500"    },
    { label: "Completed", value: counts?.completed ?? 0, icon: FileText,      tint: "text-sky-500"     },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
        >
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <it.icon className={\`h-3.5 w-3.5 \${it.tint}\`} />}
            {it.label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED 2 — src/components/shared/MyTicketsPanel.tsx
   ═══════════════════════════════════════════════════════════════════════════ */

const MY_TICKETS_PANEL_TSX = `"use client";
// src/components/shared/MyTicketsPanel.tsx
// SCAFFOLD:TICKETS — self-service ticket list. Any role can use it.
//
// Idempotent — regenerate with scripts/scaffold-tickets.mjs new <f> --force
// to update the shared panel across every role.

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, Filter, Inbox, Loader2, Plus, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { TicketKpiStrip, type TicketCounts } from "./TicketKpiStrip";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePolling } from "@/hooks/usePolling";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

interface PermissionsResponse {
  success: boolean;
  data: PermissionItem[];
  total?: number;
}

interface CountsResponse {
  success: boolean;
  data: TicketCounts;
}

export interface MyTicketsPanelProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  newTicketHref?: string;
  canCreate?: boolean;
  /** Optional extra query params appended to /api/permissions?mine=true */
  extraQuery?: string;
  pollMs?: number;
}

export function MyTicketsPanel({
  title = "My Tickets",
  subtitle = "Permission requests you have raised",
  backHref,
  newTicketHref,
  canCreate = true,
  extraQuery = "",
  pollMs = 30_000,
}: MyTicketsPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<string | null>(null);

  const ticketsUrl = useMemo(
    () => \`/api/permissions?mine=true\${extraQuery ? \`&\${extraQuery}\` : ""}\`,
    [extraQuery],
  );

  const { data, loading, error, refresh, refreshKey } =
    useDashboardData<PermissionsResponse>(ticketsUrl, { ttlMs: 5_000, pollMs });

  const { data: countsData, refresh: refreshCounts } =
    useDashboardData<CountsResponse>("/api/permissions/my-counts", {
      ttlMs: 5_000,
      pollMs,
    });

  usePolling(
    useCallback(async () => { await refreshCounts(); }, [refreshCounts]),
    { intervalMs: pollMs, enabled: true },
  );

  const rows = data?.data ?? [];
  const filtered = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="rounded-md p-1.5 hover:bg-[var(--bg-elevated)]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <h1 className="text-fluid-lg font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md p-2 hover:bg-[var(--bg-elevated)] disabled:opacity-50"
            aria-label="Refresh tickets"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
          </button>
          {canCreate && newTicketHref && (
            <Link
              href={newTicketHref}
              className="flex items-center gap-1.5 rounded-md bg-[var(--action-primary)] px-3 py-2 text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <WidgetBoundary>
        <TicketKpiStrip
          counts={countsData?.data ?? null}
          loading={!countsData && loading}
        />
      </WidgetBoundary>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={\`rounded-full px-3 py-1 text-xs transition \${
              filter === f
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }\`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-[var(--action-danger)]/40 bg-[var(--action-danger)]/10 p-3 text-sm text-[var(--action-danger)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && rows.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && !error && (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title={filter === "ALL" ? "No tickets yet" : \`No \${filter.toLowerCase()} tickets\`}
          description={
            filter === "ALL"
              ? "When you raise a permission request it will appear here."
              : "Try a different status filter, or create a new ticket."
          }
          action={
            canCreate && newTicketHref ? (
              <Link
                href={newTicketHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--action-primary)] px-3 py-2 text-sm text-white"
              >
                <Plus className="h-4 w-4" />
                New Ticket
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Ticket list */}
      {filtered.length > 0 && (
        <WidgetBoundary key={refreshKey}>
          <div className="space-y-2">
            {filtered.map((t) => (
              <PermissionTicketCard
                key={t.id}
                ticket={t}
                onSelect={(n) => setSelected(n)}
              />
            ))}
          </div>
        </WidgetBoundary>
      )}

      {/* Detail panel */}
      <PermissionDetailPanel
        ticket={selected}
        onClose={() => setSelected(null)}
        onActionComplete={() => { void refresh(); void refreshCounts(); }}
      />
    </div>
  );
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED 3 — src/app/api/permissions/my-counts/route.ts
   ═══════════════════════════════════════════════════════════════════════════ */

const MY_COUNTS_ROUTE_TS = `// src/app/api/permissions/my-counts/route.ts
// SCAFFOLD:TICKETS — per-user ticket rollup for the KPI strip.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("permission_requests")
    .select("status")
    .eq("student_user_id", auth.userId);

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  const counts = {
    pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0, total: 0,
  };

  for (const row of data ?? []) {
    const status = (row as { status: string }).status;
    counts.total++;
    if (status === "PENDING") counts.pending++;
    else if (status === "APPROVED") counts.approved++;
    else if (status === "REJECTED") counts.rejected++;
    else if (status === "COMPLETED") counts.completed++;
    else if (status === "CANCELLED") counts.cancelled++;
  }

  return NextResponse.json({ success: true, data: counts });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "perm_my_counts",
  maxRequests: 120,
});
`;

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED 4 — database migration (only with --with-migration)
   ═══════════════════════════════════════════════════════════════════════════ */

function migrationSql(ts) {
  return `-- ============================================================================
-- Migration: ${ts}_ticket_indexes
-- Purpose: Self-service "My Tickets" backing indexes + rollup view.
--   • Composite index tuned for the requester-scoped queries
--   • v_my_ticket_counts view — KPI strip without a GROUP BY per request
-- Idempotent — safe to replay.
-- ============================================================================
BEGIN;

-- 1. Indexes --------------------------------------------------------------
-- "My Tickets" — requester's own tickets, newest first.
-- Uses student_user_id (the column name exposed by the permission_requests
--  backward-compat VIEW that API routes query).
CREATE INDEX IF NOT EXISTS idx_permissions_student_status_created
  ON public.permissions (student_user_id, status, created_at DESC);

-- Approval queues — workflow + hostel scope + stage + status.
CREATE INDEX IF NOT EXISTS idx_permissions_workflow_stage_status
  ON public.permissions (workflow_type, current_stage, status);

-- SLA triage — pending rows ordered by deadline.
CREATE INDEX IF NOT EXISTS idx_permissions_sla_pending
  ON public.permissions (sla_deadline)
  WHERE status = 'PENDING' AND sla_deadline IS NOT NULL;

-- 2. KPI rollup view ------------------------------------------------------
-- Uses the actual \`permissions\` table (post-reconciliation) which has
-- \`requester_user_id\` as the requester FKey column.
CREATE OR REPLACE VIEW public.v_my_ticket_counts AS
SELECT
  p.requester_user_id                                    AS user_id,
  COUNT(*) FILTER (WHERE p.status = 'PENDING')           AS pending,
  COUNT(*) FILTER (WHERE p.status = 'APPROVED')          AS approved,
  COUNT(*) FILTER (WHERE p.status = 'REJECTED')          AS rejected,
  COUNT(*) FILTER (WHERE p.status = 'COMPLETED')         AS completed,
  COUNT(*) FILTER (WHERE p.status = 'CANCELLED')         AS cancelled,
  COUNT(*)                                               AS total
FROM public.permissions p
GROUP BY p.requester_user_id;

COMMENT ON VIEW public.v_my_ticket_counts
  IS 'Per-user rollup of ticket states; drives the My Tickets KPI strip '
     'without a GROUP BY on every request.';

-- 3. Self-record (adaptive to both schema_migrations shapes) --------------
DO $$
DECLARE
  has_filename BOOLEAN;
  has_checksum BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations'
                   AND column_name='filename') INTO has_filename;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='schema_migrations'
                   AND column_name='checksum') INTO has_checksum;
  IF has_filename AND has_checksum THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)
    VALUES ('${ts}', '${ts}_ticket_indexes.sql', NOW(),
            md5('${ts}_ticket_indexes'))
    ON CONFLICT (version) DO NOTHING;
  ELSIF has_filename THEN
    INSERT INTO public.schema_migrations (version, filename, applied_at)
    VALUES ('${ts}', '${ts}_ticket_indexes.sql', NOW())
    ON CONFLICT (version) DO NOTHING;
  ELSE
    INSERT INTO public.schema_migrations (version, applied_at)
    VALUES ('${ts}', NOW())
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE — page wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

function featurePage(ctx) {
  return `"use client";
// src/app/${ctx.group}/${ctx.route.replace(/^\//, "")}/tickets/page.tsx
// SCAFFOLD:TICKETS — thin wrapper around MyTicketsPanel.
// Regenerate with: node scripts/scaffold-tickets.mjs new ${ctx.kebab} --force

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { MyTicketsPanel } from "@/components/shared/MyTicketsPanel";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ${ctx.rolesLiteral} as Role[];

function Inner() {
  return (
    <GuardedPage allowedRoles={ALLOWED_ROLES}>
      <MyTicketsPanel
        title=${JSON.stringify(ctx.title)}
        subtitle=${JSON.stringify(ctx.subtitle)}
        backHref=${JSON.stringify(ctx.route)}
        newTicketHref=${ctx.canCreate ? JSON.stringify(ctx.newHref) : "undefined"}
        canCreate={${ctx.canCreate}}
      />
      <DevContactStrip />
    </GuardedPage>
  );
}

export default function ${ctx.pascal}TicketsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Inner />
    </Suspense>
  );
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE — admin cross-cutting page + API (only with --with-admin)
   ═══════════════════════════════════════════════════════════════════════════ */

function adminApiRoute(ctx) {
  return `// src/app/api/admin/${ctx.adminFeature}-tickets/route.ts
// SCAFFOLD:TICKETS — cross-cutting view for sysadmin / admin dashboards.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";

const VIEW_ROLES: Role[] = [
  "sysadmin", "admin", "principal", "warden",
] as Role[];

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!VIEW_ROLES.includes(auth.role as Role)) {
    return NextResponse.json(
      { success: false, code: "FORBIDDEN", error: "Not authorized to view this queue." },
      { status: 403 },
    );
  }

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("permission_requests")
    .select(\`
      ticket_number, workflow_type, current_stage, status,
      student_user_id, created_at,
      student:users(
        id, name, email, phone, role,
        student_details(roll, year, section, hostel_block, room_number, gender)
      )
    \`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { success: false, code: "DB_ERROR", error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ticket_number: r.ticket_number,
    workflow_type: r.workflow_type,
    current_stage: r.current_stage,
    status: r.status,
    student_user_id: r.student_user_id,
    requester_name: (r.student as { name?: string } | null)?.name ?? "—",
    created_at: r.created_at,
  }));

  return NextResponse.json({ success: true, data: rows });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "admin_tickets",
  maxRequests: 60,
});
`;
}

function adminPage(ctx) {
  const AdminPascal = pascal(ctx.adminFeature);
  return `"use client";
// src/app/(sysadmin)/sysadmin/${ctx.adminFeature}-tickets/page.tsx
// SCAFFOLD:TICKETS — cross-cutting ${titleCase(ctx.adminFeature)} ticket view.

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DataTable } from "@/components/ui/DataTable";
import { useDashboardData } from "@/hooks/useDashboardData";
import { ClipboardList } from "lucide-react";

interface Row {
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  student_user_id: string;
  requester_name: string;
  created_at: string;
}

export default function ${AdminPascal}TicketsAdminPage() {
  const { data, loading, error } = useDashboardData<{ success: boolean; data: Row[] }>(
    "/api/admin/${ctx.adminFeature}-tickets",
    { ttlMs: 10_000, pollMs: 60_000 },
  );

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin", "warden", "principal"] as never}>
      <div className="space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-fluid-lg font-semibold">
          <ClipboardList className="h-5 w-5" />
          ${titleCase(ctx.adminFeature)} Tickets
        </h1>
        <DataTable<Row>
          columns={[
            { header: "Ticket", accessor: (r) => <span className="font-mono text-xs">{r.ticket_number}</span> },
            { header: "Type", accessor: (r) => r.workflow_type },
            { header: "Requester", accessor: (r) => r.requester_name },
            { header: "Stage", accessor: (r) => r.current_stage },
            { header: "Status", accessor: (r) => r.status },
            { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleString() },
          ]}
          data={data?.data ?? []}
          loading={loading}
          error={error}
          keyExtractor={(r) => r.ticket_number}
          emptyMessage="No tickets."
        />
      </div>
    </AuthGuard>
  );
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   API permission patch helper — print a diff instruction
   ═══════════════════════════════════════════════════════════════════════════ */

function printPermissionsRoutePatch() {
  head("Manual edit required — src/app/api/permissions/route.ts");
  console.log(C.yellow("  Add the following block inside handleGet(), BEFORE the"));
  console.log(C.yellow("  existing role-based filtering:"));
  console.log("");
  const patch = [
    '  const mineOnly = req.nextUrl.searchParams.get("mine") === "true";',
    "",
    "  if (mineOnly) {",
    "    const { data: mineData, error: mineErr } = await db",
    '      .from("permission_requests")',
    "      .select(`",
    "        id, ticket_number, workflow_type, current_stage, status,",
    "        sla_deadline, created_at, updated_at, description, reason,",
    "        from_date, to_date, priority, hostel_scope,",
    "        student_user_id, digital_signature, stage_history,",
    "        student:users(",
    "          id, name, email, phone, role,",
    "          student_details(roll, year, section, hostel_block, room_number, gender)",
    "        )",
    "      `)",
    '      .eq("student_user_id", userId)',
    '      .order("created_at", { ascending: false })',
    "      .limit(200);",
    "",
    "    if (error) {",
    "      return NextResponse.json(",
    '        { success: false, code: "DB_ERROR", error: error.message },',
    '        { status: 500 },',
    "      );",
    "    }",
    "    return NextResponse.json({ success: true, data: mineData ?? [], total: mineData?.length ?? 0 });",
    "  }",
  ];
  console.log(C.dim("  ─────────────────────────────────────────────────────────────"));
  patch.forEach((l) => console.log(l));
  console.log(C.dim("  ─────────────────────────────────────────────────────────────"));
  console.log("");
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMANDS
   ═══════════════════════════════════════════════════════════════════════════ */

async function cmdNew(feature, flags) {
  const ctx = buildContext(feature, flags);
  const sharedMode  = flags["dry-run"] ? "dry" : "safe";
  const featureMode = flags["dry-run"] ? "dry" : flags.force ? "force" : "safe";

  head(`Scaffolding tickets for "${ctx.kebab}"`);
  info(`roles    = ${ctx.roles.join(", ")}`);
  info(`route    = ${ctx.group}${ctx.route}/tickets`);
  info(`title    = ${ctx.title}`);
  info(`canCreate= ${ctx.canCreate}`);
  if (ctx.withAdmin) info(`admin    = /sysadmin/${ctx.adminFeature}-tickets`);

  head("Shared primitives (idempotent)");
  await writeFileSafe("src/components/shared/TicketKpiStrip.tsx",
    TICKET_KPI_STRIP_TSX, { mode: sharedMode });
  await writeFileSafe("src/components/shared/MyTicketsPanel.tsx",
    MY_TICKETS_PANEL_TSX, { mode: sharedMode });
  await writeFileSafe("src/app/api/permissions/my-counts/route.ts",
    MY_COUNTS_ROUTE_TS, { mode: sharedMode });

  if (ctx.withMigration) {
    head("Database migration");
    const ts = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    await writeFileSafe(
      `database/migrations/${ts}_ticket_indexes.sql`,
      migrationSql(ts),
      { mode: featureMode },
    );
  } else {
    head("Database migration");
    info("skipped (pass --with-migration to emit)");
    info("the query works without it; the view + indexes make it fast");
  }

  head("Feature page");
  await writeFileSafe(
    `src/app/${ctx.group}/${ctx.route.replace(/^\//, "")}/tickets/page.tsx`,
    featurePage(ctx),
    { mode: featureMode },
  );

  if (ctx.withAdmin) {
    head("Admin cross-cutting view");
    await writeFileSafe(
      `src/app/api/admin/${ctx.adminFeature}-tickets/route.ts`,
      adminApiRoute(ctx),
      { mode: featureMode },
    );
    await writeFileSafe(
      `src/app/(sysadmin)/sysadmin/${ctx.adminFeature}-tickets/page.tsx`,
      adminPage(ctx),
      { mode: featureMode },
    );
  }

  printPermissionsRoutePatch();

  head("Next steps");
  console.log(`  1. Apply the /api/permissions/route.ts patch shown above.`);
  if (ctx.withMigration) {
    console.log(`  2. Run: npx tsx scripts/migrate.ts`);
    console.log(`  3. Add a nav entry for ${ctx.group}${ctx.route}/tickets in`);
    console.log(`     src/hooks/useNavigation.ts for roles: ${ctx.roles.join(", ")}`);
  } else {
    console.log(`  2. Apply the same migration by hand (see scaffold-tickets.mjs`);
    console.log(`     header for the SQL) OR re-run with --with-migration.`);
    console.log(`  3. Add a nav entry for ${ctx.group}${ctx.route}/tickets in`);
    console.log(`     src/hooks/useNavigation.ts for roles: ${ctx.roles.join(", ")}`);
  }
  console.log("");
  ok("Done.");
}

async function cmdList() {
  head("Existing My Tickets pages");
  const roots = ["(approver)", "(student)", "(operator)", "(sysadmin)", "(admin)"];
  let found = 0;
  for (const g of roots) {
    const dir = join(ROOT, "src/app", g);
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const tickets = join(dir, e.name, "tickets/page.tsx");
        if (await pathExists(tickets)) {
          console.log(`  • ${g}/${e.name}/tickets`);
          found++;
        }
      }
    } catch { /* group absent */ }
  }
  if (found === 0) info("(none yet)");
}

function cmdHelp() {
  console.log(`
${C.bold("scaffold-tickets")} — self-service ticket dashboards for any role.

${C.bold("Commands")}
  new <feature> [flags]     Generate a My Tickets dashboard
  list                      List existing ticket pages
  help                      Show this help

${C.bold("Flags")}
  --roles a,b,c             Roles allowed on the page        (required)
  --title "My Tickets"      Display title                    (default: "My Tickets")
  --subtitle "..."          Display subtitle
  --group (approver)        Route group                      (default: (approver))
  --route /hostel-manager   Base route                       (default: /<feature>)
  --new-ticket-href /path   "New Ticket" CTA target
  --no-create               Hide the "New Ticket" button
  --with-admin              Emit admin cross-cutting page + API
  --admin-feature <slug>    Admin feature slug               (default: <feature>)
  --with-migration          Emit the DB migration
  --force                   Overwrite feature files
  --dry-run                 Print, don't write

${C.bold("Examples")}
  node scripts/scaffold-tickets.mjs new hostel-manager \\
    --roles hostel_manager,deputy_warden,caretaker,warden \\
    --with-admin --admin-feature hostel --with-migration

  node scripts/scaffold-tickets.mjs new student \\
    --roles student --title "My Requests"

  node scripts/scaffold-tickets.mjs new faculty \\
    --roles faculty,hod --route /faculty \\
    --new-ticket-href /staff/leaves --title "My Requests"
`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISPATCH
   ═══════════════════════════════════════════════════════════════════════════ */

async function main() {
  const argv = process.argv.slice(2);
  const [cmd, ...rest] = argv;
  const flags = parseArgs(rest);

  if (!cmd || cmd === "help" || flags.help) { cmdHelp(); return; }

  try {
    if (cmd === "new") {
      const feature = flags._[0];
      if (!feature) die("Usage: new <feature> [flags]");
      await cmdNew(feature, flags);
    } else if (cmd === "list") {
      await cmdList();
    } else {
      die(`Unknown command "${cmd}". Try \`help\`.`);
    }
  } catch (e) {
    die(e instanceof Error ? e.message : String(e));
  }
}

main();
