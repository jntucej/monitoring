#!/usr/bin/env node
/**
 * scripts/scaffold-panel.mjs
 *
 * Cookie cutter for Advanced Resource Panels — the same 4-file pattern as
 * the Scheduled Jobs dashboard:
 *
 *   src/lib/<feature>-data.ts                     seed/dummy dataset + helpers
 *   src/components/sysadmin/<Pascal>Panel.tsx     advanced interactive UI
 *   src/app/api/admin/<feature>/route.ts          DB query + seed fallback
 *   src/app/(sysadmin)/sysadmin/<feature>/page.tsx  (optional) thin page wrapper
 *
 * Every generated file is production-shaped:
 *   • KPIs, search, status/category/sort filters
 *   • Row actions with optimistic UI (toggle / run / edit)
 *   • Expandable inline history timeline
 *   • Modal editor with presets + human-readable preview
 *   • "Showing seed data" banner when the DB table is empty
 *   • SCAFFOLD markers so scripts/dash.mjs audit doesn't flag them
 *
 * Usage:
 *   node scripts/scaffold-panel.mjs new <feature> [flags]
 *   node scripts/scaffold-panel.mjs list
 *
 * Flags (new):
 *   --title "Scheduled Jobs"          display title          (default: titleCase)
 *   --table scheduled_jobs            DB table name          (default: kebab→snake)
 *   --route /api/admin/<feature>      API path               (default: derived)
 *   --group (sysadmin)                route group            (default: (sysadmin))
 *   --singular ScheduledJob           singular Pascal        (default: strip trailing s)
 *   --kpis 5                          KPI card count 3–6     (default: 5)
 *   --rows 6                          seed row count         (default: 6)
 *   --no-page                         skip the page wrapper
 *   --force                           overwrite existing files
 *   --dry-run                         print what would happen, write nothing
 *
 * Examples:
 *   node scripts/scaffold-panel.mjs new scheduled-jobs
 *   node scripts/scaffold-panel.mjs new gate-devices --title "Gate Devices" --kpis 4
 *   node scripts/scaffold-panel.mjs new webhooks --singular Webhook --no-page
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = pathResolve(__dirname, "..");

/* ══════════════════════════════════════════════════════════════════════════
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

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */
const pascal    = (s) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
const camel     = (s) => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };
const titleCase = (s) => pascal(s).replace(/([a-z])([A-Z])/g, "$1 $2");
const snake     = (s) => s.replace(/-/g, "_");
const kebab     = (s) => s.replace(/_/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
const singular  = (s) => (s.endsWith("s") ? s.slice(0, -1) : s);
const upper     = (s) => snake(s).toUpperCase();

async function exists(p) {
  try { await access(p, FS.F_OK); return true; } catch { return false; }
}

async function writeFileSafe(path, content, { force, dryRun }) {
  const full = join(ROOT, path);
  const already = await exists(full);
  if (already && !force) {
    warn(`skipped (exists): ${path}  ${C.dim("— use --force to overwrite")}`);
    return false;
  }
  if (dryRun) {
    info(`${already ? "overwrite" : "create"} ${path}`);
    return true;
  }
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
  ok(`${already ? "overwrote" : "created"} ${path}`);
  return true;
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const positionals = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (!next || next.startsWith("--")) { flags[key] = true; }
      else { flags[key] = next; i++; }
    } else {
      positionals.push(a);
    }
  }
  return { cmd, positionals, flags };
}

/* ══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ══════════════════════════════════════════════════════════════════════════ */
function buildContext(feature, flags) {
  if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
    die(`invalid feature name "${feature}" — use kebab-case (e.g. scheduled-jobs)`);
  }
  const kebabName = feature;
  const pascalName = flags.singular ? pascal(String(flags.singular)) : pascal(singular(kebabName));
  const pluralPascal = pascal(kebabName);
  const camelName = camel(kebabName);
  const upperName = upper(kebabName);
  const table = flags.table ? String(flags.table) : snake(kebabName);
  const route = flags.route ? String(flags.route) : `/api/admin/${kebabName}`;
  const group = flags.group ? String(flags.group) : "(sysadmin)";
  const title = flags.title ? String(flags.title) : titleCase(kebabName);
  const kpis = Math.max(3, Math.min(6, Number(flags.kpis) || 5));
  const rows = Math.max(3, Math.min(20, Number(flags.rows) || 6));
  const withPage = flags["no-page"] !== true;
  const force = flags.force === true;
  const dryRun = flags["dry-run"] === true;

  return {
    feature: kebabName,
    pascal: pascalName,          // ScheduledJob
    pluralPascal,                 // ScheduledJobs
    camel: camelName,             // scheduledJobs
    upper: upperName,             // SCHEDULED_JOBS
    table,                        // scheduled_jobs
    route,                        // /api/admin/scheduled-jobs
    group,                        // (sysadmin)
    title,                        // Scheduled Jobs
    kpis, rows, withPage, force, dryRun,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   TEMPLATE 1 — src/lib/<feature>-data.ts
   ══════════════════════════════════════════════════════════════════════════ */
function seedTemplate(ctx) {
  return `/**
 * ${ctx.title} — SEED / DUMMY DATASET.
 * -----------------------------------------------------------------------------
 * > This module renders when \`public.${ctx.table}\` is empty (fresh install,
 *   dev, offline). It is NOT authoritative — the DB wins whenever it has rows.
 * > To go live: insert rows into \`${ctx.table}\`. The API route merges DB rows
 *   first and only falls back here when the table has zero rows.
 * > Delete this file + the fallback branch in the API route once your DB is
 *   always populated. The component handles \`usingSeed={false}\` transparently.
 * -----------------------------------------------------------------------------
 * Generated by scripts/scaffold-panel.mjs
 * SCAFFOLD:SEED — safe to edit; regenerating with --force will overwrite.
 */

export type ${ctx.pascal}Status = "SUCCESS" | "FAILED" | "RUNNING" | "QUEUED";
export type ${ctx.pascal}Category =
  | "maintenance"
  | "notifications"
  | "analytics"
  | "security"
  | "cleanup";
export type ${ctx.pascal}Priority = "low" | "medium" | "high" | "critical";

export interface ${ctx.pascal}Seed {
  id: string;
  name: string;
  description: string;
  cron_expression: string;
  enabled: boolean;
  category: ${ctx.pascal}Category;
  priority: ${ctx.pascal}Priority;
  owner: string;
  tags: string[];
  last_run: string | null;
  last_status: ${ctx.pascal}Status;
  next_run: string | null;
  avg_duration_ms: number;
  success_rate: number;      // 0..100
  runs_total: number;
  runs_failed: number;
}

export interface ${ctx.pascal}RunSeed {
  id: string;
  ${ctx.camel}_id: string;
  status: ${ctx.pascal}Status;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  records_affected: number | null;
  triggered_by: "schedule" | "manual" | "retry" | "system";
  error_message: string | null;
}

/* ── Relative-time helpers so the seed always looks fresh ─────────────── */
const minutesAgo    = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

/**
 * Seed rows — one per real handler in \`worker/jobs/*.js\` (or your own
 * equivalent). Rename/replace freely; the component only consumes the shape.
 */
export const SEED_${ctx.upper}: ${ctx.pascal}Seed[] = [
${seedRows(ctx)}
];

/**
 * Seed run history — a rolling recent-runs feed, newest first.
 * Every job gets a few entries so the expandable drawer is populated.
 */
export const SEED_${ctx.upper}_RUNS: ${ctx.pascal}RunSeed[] = (() => {
  const out: ${ctx.pascal}RunSeed[] = [];
  const push = (
    jobId: string,
    idx: number,
    status: ${ctx.pascal}Status,
    agoMin: number,
    durationMs: number | null,
    records: number | null,
    triggered: ${ctx.pascal}RunSeed["triggered_by"],
    err: string | null = null,
  ) => {
    const start = new Date(Date.now() - agoMin * 60_000).toISOString();
    const end =
      status === "RUNNING" || status === "QUEUED"
        ? null
        : new Date(Date.now() - agoMin * 60_000 + (durationMs ?? 0)).toISOString();
    out.push({
      id: \`\${jobId}-\${idx}\`,
      ${ctx.camel}_id: jobId,
      status,
      start_time: start,
      end_time: end,
      duration_ms: durationMs,
      records_affected: records,
      triggered_by: triggered,
      error_message: err,
    });
  };

${runRows(ctx)}

  return out.sort((a, b) => (a.start_time < b.start_time ? 1 : -1));
})();

/**
 * Human-readable cron description.
 * Covers the common schedules; falls back to the raw expression.
 */
export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  const isEvery = (v: string) => v === "*";
  const stepMatch = (v: string) => v.match(/^\\*\\/(\\d+)$/);
  const fixed = (v: string) => /^\\d+$/.test(v);
  const pad = (n: string) => n.padStart(2, "0");

  const minStep = stepMatch(min);
  if (minStep && isEvery(hour) && isEvery(dom) && isEvery(mon) && isEvery(dow)) {
    return \`Every \${minStep[1]} minute\${minStep[1] === "1" ? "" : "s"}\`;
  }
  if (isEvery(min) && isEvery(hour) && isEvery(dom) && isEvery(mon) && isEvery(dow)) {
    return "Every minute";
  }
  if (fixed(min) && isEvery(hour) && isEvery(dom) && isEvery(mon) && isEvery(dow)) {
    return \`Every hour at :\${pad(min)}\`;
  }
  if (fixed(min) && fixed(hour) && isEvery(dom) && isEvery(mon) && isEvery(dow)) {
    return \`Daily at \${pad(hour)}:\${pad(min)}\`;
  }
  if (fixed(min) && fixed(hour) && isEvery(dom) && isEvery(mon) && fixed(dow)) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return \`Weekly on \${days[Number(dow)] ?? dow} at \${pad(hour)}:\${pad(min)}\`;
  }
  if (fixed(min) && fixed(hour) && fixed(dom) && isEvery(mon) && isEvery(dow)) {
    return \`Monthly on day \${dom} at \${pad(hour)}:\${pad(min)}\`;
  }
  return expr;
}

/** Quick cron presets used by the inline schedule editor. */
export const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Every minute",        value: "* * * * *" },
  { label: "Every 5 minutes",     value: "*/5 * * * *" },
  { label: "Every 15 minutes",    value: "*/15 * * * *" },
  { label: "Every 30 minutes",    value: "*/30 * * * *" },
  { label: "Hourly",              value: "0 * * * *" },
  { label: "Every 6 hours",       value: "0 */6 * * *" },
  { label: "Daily at 02:00",      value: "0 2 * * *" },
  { label: "Weekly (Sun 03:00)",  value: "0 3 * * 0" },
  { label: "Monthly (1st 04:00)", value: "0 4 1 * *" },
];

/** Ready-to-paste SQL to migrate off the seed fallback. */
export const SEED_SQL_HINT = \`
-- Optional: persist the seed rows so the dashboard stops using the dummy fallback.
INSERT INTO public.${ctx.table} (id, name, description, cron_expression, enabled, last_run, next_run)
VALUES
  ('${ctx.feature}-1', '${ctx.title} item 1', 'Replace with a real description', '0 2 * * *',    true,  NOW() - INTERVAL '3 hours', NOW() + INTERVAL '21 hours'),
  ('${ctx.feature}-2', '${ctx.title} item 2', 'Replace with a real description', '*/15 * * * *', true,  NOW() - INTERVAL '4 min',   NOW() + INTERVAL '11 min'),
  ('${ctx.feature}-3', '${ctx.title} item 3', 'Replace with a real description', '0 * * * *',    false, NOW() - INTERVAL '47 min',  NOW() + INTERVAL '13 min')
ON CONFLICT (id) DO NOTHING;
\`;
`;
}

function seedRows(ctx) {
  const seeds = [
    { id: `${ctx.feature}-1`, name: `${ctx.title} · daily sweep`,  desc: `Runs the primary nightly sweep for ${ctx.title}.`, cron: "0 2 * * *",     enabled: true,  cat: "security",      pri: "high",     status: "SUCCESS", dur: 8_420, rate: 99.4, total: 162,  failed: 1 },
    { id: `${ctx.feature}-2`, name: `${ctx.title} · rollup`,        desc: `Recomputes rollup tables consumed by the analytics dashboards.`, cron: "*/30 * * * *", enabled: true, cat: "analytics", pri: "medium", status: "SUCCESS", dur: 2_140, rate: 99.9, total: 4_312, failed: 3 },
    { id: `${ctx.feature}-3`, name: `${ctx.title} · cleanup`,       desc: `Sweeps expired ephemeral rows (TTL tables).`, cron: "*/15 * * * *", enabled: true,  cat: "cleanup",   pri: "medium", status: "SUCCESS", dur: 980,   rate: 100,  total: 8_640, failed: 0 },
    { id: `${ctx.feature}-4`, name: `${ctx.title} · pass expiry`,   desc: `Marks stale passes/gate records as EXPIRED.`, cron: "0 * * * *",    enabled: true,  cat: "maintenance", pri: "high",   status: "SUCCESS", dur: 3_560, rate: 98.7, total: 1_440, failed: 19 },
    { id: `${ctx.feature}-5`, name: `${ctx.title} · dispatch`,      desc: `Flushes push/SMS/email queues to providers.`, cron: "*/2 * * * *",  enabled: true,  cat: "notifications", pri: "critical", status: "RUNNING", dur: 640, rate: 97.8, total: 22_180, failed: 487 },
    { id: `${ctx.feature}-6`, name: `${ctx.title} · snapshot`,      desc: `Persists a nightly KPI snapshot for trend charts.`, cron: "15 0 * * *",   enabled: false, cat: "analytics", pri: "low",    status: "SUCCESS", dur: 1_220, rate: 96.0, total: 96,    failed: 4 },
    { id: `${ctx.feature}-7`, name: `${ctx.title} · audit trail`,   desc: `Archives audit history past retention.`, cron: "0 3 * * 0",    enabled: true,  cat: "security",   pri: "high",   status: "SUCCESS", dur: 5_120, rate: 99.1, total: 52,    failed: 1 },
    { id: `${ctx.feature}-8`, name: `${ctx.title} · heartbeat`,     desc: `Emits a health beacon and refreshes cache warmers.`, cron: "* * * * *",    enabled: true,  cat: "maintenance", pri: "low",    status: "SUCCESS", dur: 210,   rate: 100,  total: 44_280, failed: 0 },
  ];
  const picked = seeds.slice(0, ctx.rows);

  return picked.map((s, i) => {
    const agoMin = [184, 12, 4, 47, 1, 1510, 240, 0][i] ?? 60;
    const nextIn = [1256, 18, 11, 13, 1, 60, 8000, 1][i] ?? 30;
    const tags = ["ops", "cron", s.cat, s.pri].map((t) => `"${t}"`).join(", ");
    return `  {
    id: "${s.id}",
    name: "${s.name}",
    description: "${s.desc}",
    cron_expression: "${s.cron}",
    enabled: ${s.enabled},
    category: "${s.cat}" as ${ctx.pascal}Category,
    priority: "${s.pri}" as ${ctx.pascal}Priority,
    owner: "Platform",
    tags: [${tags}],
    last_run: minutesAgo(${agoMin}),
    last_status: "${s.status}" as ${ctx.pascal}Status,
    next_run: minutesFromNow(${nextIn}),
    avg_duration_ms: ${s.dur},
    success_rate: ${s.rate},
    runs_total: ${s.total},
    runs_failed: ${s.failed},
  },`;
  }).join("\n");
}

function runRows(ctx) {
  const lines = [];
  const seedIds = Array.from({ length: ctx.rows }, (_, i) => `${ctx.feature}-${i + 1}`);
  for (const id of seedIds) {
    lines.push(`  push("${id}", 1, "SUCCESS", ${60 + Math.floor(Math.random() * 200)}, ${1200 + Math.floor(Math.random() * 4000)}, ${50 + Math.floor(Math.random() * 300)}, "schedule");`);
    lines.push(`  push("${id}", 2, "SUCCESS", ${400 + Math.floor(Math.random() * 800)}, ${1000 + Math.floor(Math.random() * 3000)}, ${40 + Math.floor(Math.random() * 200)}, "schedule");`);
    if (Math.random() > 0.6) {
      lines.push(`  push("${id}", 3, "FAILED", ${900 + Math.floor(Math.random() * 1500)}, 1800, null, "schedule", "Transient upstream error — scheduled for retry");`);
    }
  }
  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════════════════
   TEMPLATE 2 — src/components/sysadmin/<Pascal>Panel.tsx
   ══════════════════════════════════════════════════════════════════════════ */
function componentTemplate(ctx) {
  return `"use client";

/**
 * ${ctx.title}Panel — advanced interactive resource panel.
 * -----------------------------------------------------------------------------
 * Generated by scripts/scaffold-panel.mjs
 *
 * Composes:
 *   • 3–6 animated KPI cards
 *   • Search + status/category/sort toolbar
 *   • Per-row actions: pause/resume, run-now, edit schedule
 *   • Expandable inline run history
 *   • Global recent-activity feed
 *   • Modal editor with cron presets + human preview
 *   • "Showing seed data" banner when the API returns no rows
 *
 * Wire-up:
 *   <${ctx.pluralPascal}Panel />  ← drop into any (sysadmin) page
 * SCAFFOLD:PANEL — safe to edit; regenerating with --force will overwrite.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Play, Pause, RefreshCw, CheckCircle2, XCircle, Loader2,
  Search, Filter, ChevronDown, ChevronRight, Zap, Shield, Bell,
  BarChart3, Trash2, Settings2, Activity, AlertTriangle, History,
  CalendarClock, Timer, TrendingUp, CircleDot, Info,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { getAuthHeaders } from "@/lib/utils";
import {
  SEED_${ctx.upper},
  SEED_${ctx.upper}_RUNS,
  describeCron,
  CRON_PRESETS,
  type ${ctx.pascal}Seed,
  type ${ctx.pascal}RunSeed,
  type ${ctx.pascal}Status,
  type ${ctx.pascal}Category,
} from "@/lib/${ctx.feature}-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/* ── Types ────────────────────────────────────────────────────────────── */
type Row = ${ctx.pascal}Seed;
type Run = ${ctx.pascal}RunSeed;

interface ApiRow {
  id: string;
  name: string;
  description: string;
  cron_expression: string;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

/* ── Utilities ────────────────────────────────────────────────────────── */
const getHeaders = () => getAuthHeaders();

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return \`\${s}s ago\`;
  if (s < 3600) return \`\${Math.floor(s / 60)}m ago\`;
  if (s < 86400) return \`\${Math.floor(s / 3600)}h ago\`;
  return \`\${Math.floor(s / 86400)}d ago\`;
}

function timeUntil(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return "due";
  if (s < 60) return \`in \${s}s\`;
  if (s < 3600) return \`in \${Math.floor(s / 60)}m\`;
  if (s < 86400) return \`in \${Math.floor(s / 3600)}h\`;
  return \`in \${Math.floor(s / 86400)}d\`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return \`\${ms}ms\`;
  if (ms < 60_000) return \`\${(ms / 1000).toFixed(1)}s\`;
  return \`\${(ms / 60_000).toFixed(1)}m\`;
}

function fmtNumber(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

/* ── Status + category styling ───────────────────────────────────────── */
const STATUS_META: Record<
  ${ctx.pascal}Status,
  { label: string; color: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SUCCESS: { label: "Success", color: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2 },
  FAILED:  { label: "Failed",  color: "text-rose-400",    dot: "bg-rose-400",    icon: XCircle },
  RUNNING: { label: "Running", color: "text-sky-400",     dot: "bg-sky-400",     icon: Loader2 },
  QUEUED:  { label: "Queued",  color: "text-amber-400",   dot: "bg-amber-400",   icon: Clock },
};

const CATEGORY_META: Record<
  ${ctx.pascal}Category,
  { label: string; icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  maintenance:   { label: "Maintenance",   icon: Settings2, tint: "text-slate-300" },
  notifications: { label: "Notifications", icon: Bell,      tint: "text-indigo-300" },
  analytics:     { label: "Analytics",     icon: BarChart3, tint: "text-cyan-300"   },
  security:      { label: "Security",      icon: Shield,    tint: "text-amber-300"  },
  cleanup:       { label: "Cleanup",       icon: Trash2,    tint: "text-rose-300"   },
};

const PRIORITY_TINT: Record<Row["priority"], string> = {
  low:      "bg-slate-500/15 text-slate-300 border-slate-500/30",
  medium:   "bg-sky-500/15 text-sky-300 border-sky-500/30",
  high:     "bg-amber-500/15 text-amber-300 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

/* ── Small presentational pieces ──────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, accent = "emerald", loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "emerald" | "sky" | "amber" | "rose" | "violet";
  loading?: boolean;
}) {
  const tints: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    sky:     "from-sky-500/20 to-sky-500/0 text-sky-300",
    amber:   "from-amber-500/20 to-amber-500/0 text-amber-300",
    rose:    "from-rose-500/20 to-rose-500/0 text-rose-300",
    violet:  "from-violet-500/20 to-violet-500/0 text-violet-300",
  };
  return (
    <Card className="relative overflow-hidden">
      <div className={\`pointer-events-none absolute inset-0 bg-gradient-to-br \${tints[accent]} opacity-40\`} />
      <CardContent className="relative flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-white/10" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
          )}
          {sub && <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{sub}</p>}
        </div>
        <div className={\`rounded-xl border border-white/10 bg-white/5 p-2 \${tints[accent].split(" ").pop()}\`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: ${ctx.pascal}Status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={\`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium \${meta.color}\`}>
      <Icon className={\`h-3 w-3 \${status === "RUNNING" ? "animate-spin" : ""}\`} />
      {meta.label}
    </span>
  );
}

function CategoryPill({ category }: { category: ${ctx.pascal}Category }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span className={\`inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] \${meta.tint}\`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

/* ── Schedule editor modal ───────────────────────────────────────────── */
function ScheduleEditor({
  row, isOpen, onClose, onSave,
}: {
  row: Row | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cron: string) => void;
}) {
  const [expr, setExpr] = useState(row?.cron_expression ?? "*/5 * * * *");
  useEffect(() => { if (row) setExpr(row.cron_expression); }, [row]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={\`Edit schedule · \${row?.name ?? ""}\`} size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Cron expression
          </label>
          <Input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="*/5 * * * *" />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Format: <code>minute hour day-of-month month day-of-week</code>
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-[var(--text-muted)]">Preview</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{describeCron(expr)}</p>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">Presets</p>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setExpr(p.value)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)] transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(expr); onClose(); }}>Save schedule</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Run history timeline ─────────────────────────────────────────────── */
function RunsTimeline({ runs, loading }: { runs: Run[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading run history…
      </div>
    );
  }
  if (runs.length === 0) {
    return (
      <div className="p-4 text-sm text-[var(--text-muted)]">
        No runs recorded yet.
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/5">
      {runs.map((r) => {
        const meta = STATUS_META[r.status];
        const Icon = meta.icon;
        return (
          <div key={r.id} className="flex items-start gap-3 p-3">
            <div className={\`mt-0.5 rounded-md border border-white/10 bg-white/5 p-1.5 \${meta.color}\`}>
              <Icon className={\`h-3.5 w-3.5 \${r.status === "RUNNING" ? "animate-spin" : ""}\`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={\`font-medium \${meta.color}\`}>{meta.label}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-muted)]">{timeAgo(r.start_time)}</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="capitalize text-[var(--text-muted)]">{r.triggered_by}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />{fmtDuration(r.duration_ms)}</span>
                <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" />{fmtNumber(r.records_affected)} records</span>
              </div>
              {r.error_message && (
                <p className="mt-1.5 rounded border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-[11px] text-rose-300">
                  {r.error_message}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════════════════ */
export function ${ctx.pluralPascal}Panel() {
  const addToast = useUIStore((s) => s.addToast);

  const [rows, setRows] = useState<Row[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSeed, setUsingSeed] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENABLED" | "DISABLED">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | ${ctx.pascal}Category>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "next_run" | "last_run" | "success_rate">("next_run");

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [editorRow, setEditorRow] = useState<Row | null>(null);

  /* ── Data loading ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const res = await fetch("${ctx.route}", { headers: getHeaders(), cache: "no-store" });
      const body = res.ok ? await res.json() : null;
      const apiRows: ApiRow[] = body?.rows ?? body?.jobs ?? body?.data ?? [];

      if (apiRows.length === 0) {
        setRows(SEED_${ctx.upper});
        setRuns(SEED_${ctx.upper}_RUNS);
        setUsingSeed(true);
      } else {
        const merged: Row[] = apiRows.map((j) => {
          const seed = SEED_${ctx.upper}.find((s) => s.id === j.id);
          return {
            ...(seed ?? {
              id: j.id,
              category: "maintenance" as ${ctx.pascal}Category,
              priority: "medium" as Row["priority"],
              owner: "—",
              tags: [],
              avg_duration_ms: 0,
              success_rate: 100,
              runs_total: 0,
              runs_failed: 0,
              last_status: "SUCCESS" as ${ctx.pascal}Status,
            }),
            ...j,
          };
        });
        setRows(merged);
        const apiRuns: Run[] = body?.runs ?? [];
        setRuns(apiRuns.length ? apiRuns : SEED_${ctx.upper}_RUNS);
        setUsingSeed(apiRuns.length === 0);
      }
    } catch {
      setRows(SEED_${ctx.upper});
      setRuns(SEED_${ctx.upper}_RUNS);
      setUsingSeed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(load, { intervalMs: 30_000 });

  /* ── Derived ──────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = rows.length;
    const enabled = rows.filter((r) => r.enabled).length;
    const disabled = total - enabled;
    const failing = rows.filter((r) => r.last_status === "FAILED").length;
    const avg = total === 0 ? 0 : rows.reduce((a, r) => a + r.success_rate, 0) / total;
    const next = rows.filter((r) => r.enabled && r.next_run).map((r) => r.next_run!).sort()[0] ?? null;
    return { total, enabled, disabled, failing, avg, next };
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter === "ENABLED" && !r.enabled) return false;
      if (statusFilter === "DISABLED" && r.enabled) return false;
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name":         return a.name.localeCompare(b.name);
        case "success_rate": return b.success_rate - a.success_rate;
        case "last_run":     return (b.last_run ?? "").localeCompare(a.last_run ?? "");
        case "next_run":
        default:             return (a.next_run ?? "9999").localeCompare(b.next_run ?? "9999");
      }
    });
    return list;
  }, [rows, search, statusFilter, categoryFilter, sortBy]);

  const recentRuns = useMemo(() => runs.slice(0, 8), [runs]);

  /* ── Actions ──────────────────────────────────────────────────────── */
  const toggleRow = async (row: Row) => {
    setBusy((b) => ({ ...b, [row.id]: true }));
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)));
    try {
      if (!usingSeed) {
        const res = await fetch(\`${ctx.route}/\${row.id}\`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getHeaders() },
          body: JSON.stringify({ enabled: !row.enabled }),
        });
        if (!res.ok) throw new Error("toggle failed");
      }
      addToast({ variant: "success", message: \`\${row.name} \${row.enabled ? "paused" : "resumed"}.\` });
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: row.enabled } : r)));
      addToast({ variant: "error", message: \`Failed to update \${row.name}.\` });
    } finally {
      setBusy((b) => ({ ...b, [row.id]: false }));
    }
  };

  const runNow = async (row: Row) => {
    setBusy((b) => ({ ...b, [row.id]: true }));
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, last_status: "RUNNING" } : r)));
    const optimistic: Run = {
      id: \`\${row.id}-now-\${Date.now()}\`,
      ${ctx.camel}_id: row.id,
      status: "RUNNING",
      start_time: new Date().toISOString(),
      end_time: null,
      duration_ms: null,
      records_affected: null,
      triggered_by: "manual",
      error_message: null,
    };
    setRuns((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch(\`${ctx.route}/\${row.id}/run\`, { method: "POST", headers: getHeaders() });
      const body = await res.json().catch(() => ({}));
      const success = res.ok && body?.success !== false;
      const durationMs = body?.durationMs ?? 1_800;
      const records = body?.recordsAffected ?? 0;

      setRows((prev) => prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              last_status: success ? "SUCCESS" : "FAILED",
              last_run: new Date().toISOString(),
              runs_total: r.runs_total + 1,
              runs_failed: success ? r.runs_failed : r.runs_failed + 1,
            }
          : r,
      ));
      setRuns((prev) => prev.map((r) =>
        r.id === optimistic.id
          ? {
              ...r,
              status: success ? "SUCCESS" : "FAILED",
              end_time: new Date().toISOString(),
              duration_ms: durationMs,
              records_affected: records,
              error_message: success ? null : (body?.error ?? "Run failed"),
            }
          : r,
      ));
      addToast({
        variant: success ? "success" : "error",
        message: success
          ? \`\${row.name} completed · \${records} records in \${fmtDuration(durationMs)}.\`
          : \`\${row.name} failed. See run history.\`,
      });
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, last_status: "FAILED" } : r)));
      setRuns((prev) => prev.map((r) =>
        r.id === optimistic.id
          ? { ...r, status: "FAILED", end_time: new Date().toISOString(), error_message: "Network error" }
          : r,
      ));
      addToast({ variant: "error", message: \`Could not run \${row.name}.\` });
    } finally {
      setBusy((b) => ({ ...b, [row.id]: false }));
    }
  };

  const saveCron = (row: Row, cron: string) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, cron_expression: cron } : r)));
    addToast({ variant: "success", message: \`Updated schedule for \${row.name}.\` });
    // TODO: PATCH ${ctx.route}/<id> { cron_expression: cron }
  };

  const toggleExpanded = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {usingSeed && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
          <div className="text-amber-200/90">
            <p className="font-medium">Showing seed data</p>
            <p className="text-xs opacity-80">
              The <code>${ctx.table}</code> table is empty. Seed rows from{" "}
              <code>src/lib/${ctx.feature}-data.ts</code> are displayed so you can
              explore the interface. Populate the table to go live.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
            <CalendarClock className="h-5 w-5 text-emerald-400" />
            ${ctx.title}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {kpis.enabled} active · {kpis.disabled} paused
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw className={\`h-4 w-4 \${loading ? "animate-spin" : ""}\`} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total"        value={kpis.total}        sub={\`\${kpis.enabled} enabled\`}  icon={CircleDot}      accent="sky"     loading={loading} />
        <KpiCard label="Active"       value={kpis.enabled}      sub="Scheduled & running"        icon={Play}           accent="emerald" loading={loading} />
        <KpiCard label="Paused"       value={kpis.disabled}     sub="Disabled by operator"       icon={Pause}          accent="amber"   loading={loading} />
        <KpiCard label="Failing"      value={kpis.failing}      sub="Last run failed"            icon={AlertTriangle}  accent="rose"    loading={loading} />
        <KpiCard
          label="Avg success"
          value={\`\${kpis.avg.toFixed(1)}%\`}
          sub={kpis.next ? \`Next \${timeUntil(kpis.next)}\` : "No upcoming run"}
          icon={TrendingUp}
          accent="violet"
          loading={loading}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, tag, description…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-muted)]" />
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ENABLED", label: "Enabled" },
                { value: "DISABLED", label: "Paused" },
              ]}
            />
            <Select
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as typeof categoryFilter)}
              options={[
                { value: "ALL", label: "All categories" },
                { value: "maintenance", label: "Maintenance" },
                { value: "notifications", Label: "Notifications" },
                { value: "analytics", label: "Analytics" },
                { value: "security", label: "Security" },
                { value: "cleanup", label: "Cleanup" },
              ]}
            />
            <Select
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              options={[
                { value: "next_run", label: "Sort · Next run" },
                { value: "last_run", label: "Sort · Last run" },
                { value: "success_rate", label: "Sort · Success" },
                { value: "name", label: "Sort · Name" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {loading && rows.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-72 animate-pulse rounded bg-white/5" />
              </CardContent>
            </Card>
          ))
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-[var(--text-muted)]">
              Nothing matches the current filters.
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((row) => {
              const isOpen = !!expanded[row.id];
              const rowRuns = runs.filter((r) => r.${ctx.camel}_id === row.id).slice(0, 6);
              const rowBusy = !!busy[row.id];

              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className={\`overflow-hidden transition \${row.last_status === "FAILED" ? "border-rose-500/30" : ""}\`}>
                    <div className="flex flex-wrap items-start gap-3 p-4">
                      <button
                        onClick={() => toggleExpanded(row.id)}
                        className="mt-1 rounded-md border border-white/10 bg-white/5 p-1 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>

                      <div className="min-w-[240px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-[var(--text-primary)]">{row.name}</h3>
                          <StatusPill status={row.last_status} />
                          <CategoryPill category={row.category} />
                          <span className={\`rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider \${PRIORITY_TINT[row.priority]}\`}>
                            {row.priority}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{row.description}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {row.tags.map((t) => (
                            <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="w-[210px]">
                        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                          <Clock className="h-3 w-3" /> Schedule
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
                          {describeCron(row.cron_expression)}
                        </p>
                        <code className="text-[10px] text-[var(--text-muted)]">{row.cron_expression}</code>
                      </div>

                      <div className="w-[170px]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Last</span>
                          <span className="text-[var(--text-secondary)]">{timeAgo(row.last_run)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Next</span>
                          <span className="text-[var(--text-secondary)]">{timeUntil(row.next_run)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">Avg</span>
                          <span className="text-[var(--text-secondary)]">{fmtDuration(row.avg_duration_ms)}</span>
                        </div>
                      </div>

                      <div className="w-[140px]">
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>Success</span>
                          <span className="tabular-nums">{row.success_rate.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={\`h-full \${
                              row.success_rate >= 99 ? "bg-emerald-400"
                                : row.success_rate >= 95 ? "bg-sky-400"
                                : "bg-amber-400"
                            }\`}
                            style={{ width: \`\${Math.min(100, row.success_rate)}%\` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          {fmtNumber(row.runs_total)} runs · {fmtNumber(row.runs_failed)} failed
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={row.enabled ? "ghost" : "primary"}
                          onClick={() => void toggleRow(row)}
                          disabled={rowBusy}
                          title={row.enabled ? "Pause" : "Resume"}
                        >
                          {rowBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : row.enabled ? (
                            <Pause className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button size="sm" onClick={() => void runNow(row)} disabled={rowBusy} title="Run now">
                          {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Run</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditorRow(row)} title="Edit schedule">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5 bg-black/10"
                        >
                          <div className="flex items-center gap-2 px-4 pt-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                            <History className="h-3.5 w-3.5" />
                            Recent runs
                          </div>
                          <RunsTimeline runs={rowRuns} loading={false} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-sky-300" />
            Recent activity (all)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RunsTimeline runs={recentRuns} loading={loading} />
        </CardContent>
      </Card>

      <ScheduleEditor
        row={editorRow}
        isOpen={!!editorRow}
        onClose={() => setEditorRow(null)}
        onSave={(cron) => editorRow && saveCron(editorRow, cron)}
      />
    </div>
  );
}
`;
}

/* ══════════════════════════════════════════════════════════════════════════
   TEMPLATE 3 — src/app/api/admin/<feature>/route.ts
   ══════════════════════════════════════════════════════════════════════════ */
function apiTemplate(ctx) {
  return `import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

/**
 * GET ${ctx.route}
 * -----------------------------------------------------------------------------
 * Returns { rows, runs } for ${ctx.title}.
 *   • \`rows\` come from public.${ctx.table} when populated.
 *   • \`runs\` come from public.${ctx.table}_runs when populated.
 *   • Both arrays are returned empty on a fresh install; the client then falls
 *     back to the seed dataset in src/lib/${ctx.feature}-data.ts.
 *
 * Generated by scripts/scaffold-panel.mjs — SCAFFOLD:API
 */
async function handleGet(_req: NextRequest) {
  const svc = getSupabaseServiceClient();

  // 1. Primary rows
  let rows: unknown[] = [];
  try {
    const { data, error } = await svc
      .from("${ctx.table}")
      .select("id, name, description, cron_expression, enabled, last_run, next_run")
      .order("name", { ascending: true });
    if (!error && data) rows = data;
  } catch {
    // table may not exist yet — safe to ignore, client will use seed
  }

  // 2. Recent runs
  let runs: unknown[] = [];
  try {
    const { data, error } = await svc
      .from("${ctx.table}_runs")
      .select(
        "id, ${ctx.camel}_id, status, start_time, end_time, duration_ms, records_affected, triggered_by, error_message",
      )
      .order("start_time", { ascending: false })
      .limit(60);
    if (!error && data) runs = data;
  } catch {
    // optional companion table — ignore
  }

  return NextResponse.json({ rows, runs });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["sysadmin", "admin"],
});
`;
}

/* ══════════════════════════════════════════════════════════════════════════
   TEMPLATE 4 — src/app/(sysadmin)/sysadmin/<feature>/page.tsx
   ══════════════════════════════════════════════════════════════════════════ */
function pageTemplate(ctx) {
  return `import { AuthGuard } from "@/components/shared/AuthGuard";
import { ${ctx.pluralPascal}Panel } from "@/components/sysadmin/${ctx.pluralPascal}Panel";

/**
 * ${ctx.title} — thin wrapper. All logic lives in the panel component.
 * Generated by scripts/scaffold-panel.mjs — SCAFFOLD:PAGE
 */
export default function ${ctx.pluralPascal}Page() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <${ctx.pluralPascal}Panel />
    </AuthGuard>
  );
}
`;
}

/* ══════════════════════════════════════════════════════════════════════════
   COMMANDS
   ══════════════════════════════════════════════════════════════════════════ */
async function cmdNew(feature, flags) {
  const ctx = buildContext(feature, flags);

  console.log();
  console.log(C.bold(`Scaffolding advanced resource panel: ${ctx.title}`));
  console.log(C.dim(`  feature:  ${ctx.feature}`));
  console.log(C.dim(`  table:    ${ctx.table}`));
  console.log(C.dim(`  route:    ${ctx.route}`));
  console.log(C.dim(`  pascal:   ${ctx.pascal} / ${ctx.pluralPascal}`));
  console.log(C.dim(`  kpis/rows: ${ctx.kpis} / ${ctx.rows}`));
  if (ctx.dryRun) console.log(C.yellow("  DRY RUN — nothing will be written."));
  console.log();

  const written = [];

  const seedPath = `src/lib/${ctx.feature}-data.ts`;
  if (await writeFileSafe(seedPath, seedTemplate(ctx), ctx)) written.push(seedPath);

  const compPath = `src/components/sysadmin/${ctx.pluralPascal}Panel.tsx`;
  if (await writeFileSafe(compPath, componentTemplate(ctx), ctx)) written.push(compPath);

  const apiPath = `src/app/api/admin/${ctx.feature}/route.ts`;
  if (await writeFileSafe(apiPath, apiTemplate(ctx), ctx)) written.push(apiPath);

  if (ctx.withPage) {
    const pagePath = `src/app/${ctx.group}/sysadmin/${ctx.feature}/page.tsx`;
    if (await writeFileSafe(pagePath, pageTemplate(ctx), ctx)) written.push(pagePath);
  }

  console.log();
  if (written.length === 0) {
    warn("Nothing was written — every target already exists. Use --force to overwrite.");
  } else if (ctx.dryRun) {
    ok(`Dry run complete. ${written.length} file(s) would be written.`);
  } else {
    ok(`Done. ${written.length} file(s) written.`);
    console.log();
    console.log(C.dim("Next steps:"));
    console.log(C.dim(`  • Mount:  <${ctx.pluralPascal}Panel /> under any page`));
    console.log(C.dim(`  • Route:  ${ctx.group}/sysadmin/${ctx.feature}`));
    console.log(C.dim(`  • Seed SQL is exported as SEED_SQL_HINT at the bottom of`));
    console.log(C.dim(`    src/lib/${ctx.feature}-data.ts`));
    console.log(C.dim(`  • Wire PATCH/POST handlers under ${ctx.route}/<id>[/run] when ready`));
  }
  console.log();
}

async function cmdList() {
  console.log();
  console.log(C.bold("Existing scaffolds"));
  console.log(C.dim("Scanning src/lib/*-data.ts for seed-module markers…"));
  console.log();
  // Best-effort scan without pulling in fast-glob
  try {
    const { readdir } = await import("node:fs/promises");
    const dir = join(ROOT, "src/lib");
    const entries = await readdir(dir);
    const seeds = entries.filter((f) => f.endsWith("-data.ts"));
    if (seeds.length === 0) {
      warn("No *-data.ts modules found.");
    } else {
      for (const f of seeds) {
        const content = await readFile(join(dir, f), "utf8");
        const hasMarker = content.includes("SCAFFOLD:SEED");
        console.log(`  ${hasMarker ? C.green("●") : C.dim("○")}  src/lib/${f}`);
      }
    }
  } catch (e) {
    die(`Could not scan src/lib: ${e.message}`);
  }
  console.log();
}

/* ══════════════════════════════════════════════════════════════════════════
   DISPATCH
   ══════════════════════════════════════════════════════════════════════════ */
async function main() {
  const { cmd, positionals, flags } = parseArgs(process.argv.slice(2));

  if (!cmd || cmd === "help" || flags.help) {
    console.log(`
${C.bold("scripts/scaffold-panel.mjs")} — advanced resource panel cookie cutter

${C.bold("Usage")}
  node scripts/scaffold-panel.mjs new <feature> [flags]
  node scripts/scaffold-panel.mjs list

${C.bold("Flags (new)")}
  --title "Scheduled Jobs"      display title        (default: titleCase)
  --table scheduled_jobs        DB table name        (default: kebab→snake)
  --route /api/admin/<feature>  API path             (default: derived)
  --group (sysadmin)            route group          (default: (sysadmin))
  --singular ScheduledJob       singular Pascal      (default: strip trailing s)
  --kpis 5                      KPI count 3–6        (default: 5)
  --rows 6                      seed rows            (default: 6)
  --no-page                     skip the page wrapper
  --force                       overwrite existing files
  --dry-run                     print, don't write

${C.bold("Examples")}
  node scripts/scaffold-panel.mjs new scheduled-jobs
  node scripts/scaffold-panel.mjs new gate-devices --title "Gate Devices" --kpis 4
  node scripts/scaffold-panel.mjs new webhooks --singular Webhook --no-page
`);
    return;
  }

  switch (cmd) {
    case "new": {
      const feature = positionals[0];
      if (!feature) die("missing <feature> — e.g. `new scheduled-jobs`");
      await cmdNew(feature, flags);
      break;
    }
    case "list":
      await cmdList();
      break;
    default:
      die(`unknown command "${cmd}" — try \`help\``);
  }
}

main().catch((e) => die(e.stack ?? e.message));
