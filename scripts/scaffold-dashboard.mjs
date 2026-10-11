#!/usr/bin/env node
// scripts/scaffold-dashboard.mjs
//
// Cookie cutter for role-aware Gate Monitor dashboards.
// Every generated page ships with:
//   • GuardedPage       (role + tier gate, no visual leaks)
//   • useApiResource    (single fetch primitive, cached + deduped)
//   • usePolling        (visibility-aware, no interval leaks)
//   • ConditionalAlert  (role-scoped alerts, no hard-coded banners)
//   • WidgetBoundary    (per-section error isolation)
//   • Suspense wrapper  (Next 15/16 useSearchParams requirement)
//
// Usage:
//   node scripts/scaffold-dashboard.mjs new <role>       [flags]
//   node scripts/scaffold-dashboard.mjs audit
//   node scripts/scaffold-dashboard.mjs fix <file>
//
// Flags (new):
//   --min-tier <n>     tier gate (default 90)
//   --route <path>     url route (default /<role>)
//   --title "..."      page title (default "<Role> Dashboard")
//   --group <name>     route group (default (role)) — e.g. (admin)
//   --alerts <url>     metrics endpoint for ConditionalAlert (default /api/admin/security/stats)
//   --layout           also emit a route-group layout.tsx with GuardedPage

import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const die = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));

// ── helpers ──────────────────────────────────────────────────────────────
const pascal = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, "");
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

function parseArgs(argv) {
  const [kind, name, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) { flags[key] = true; }
    else { flags[key] = next; i++; }
  }
  return { kind, name, flags };
}

// ── NEW dashboard template ───────────────────────────────────────────────
function pageTemplate({ role, pascalRole, title, minTier, alertsUrl }) {
  return `"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";

const MIN_TIER = ${minTier};
const ALERTS_URL = "${alertsUrl}";

function ${pascalRole}DashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "${role}") as Role;
  const tier = getRoleTier(role);

  const { data, loading, error, refresh } = useApiResource<Record<string, number>>(
    ALERTS_URL,
    { ttlMs: 10_000 }
  );

  // Visibility-aware polling — no leaked intervals, no background churn.
  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">${title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Data fetch failed: {error}
        </div>
      )}

      {/* Role-scoped, conditional alerts — the ONLY alert surface on this page. */}
      <WidgetBoundary title="Alerts">
        <ConditionalAlert
          ctx={{
            role,
            userId: user?.id ?? "unknown",
            gateId: user?.gateId ?? null,
            departmentId: user?.departmentId ?? null,
            assignedHostel: user?.assignedHostel ?? null,
            metrics: data ?? {},
          }}
          limit={5}
        />
      </WidgetBoundary>

      {/* TODO: role-specific widgets. Wrap each in its own WidgetBoundary. */}
    </div>
  );
}

export default function ${pascalRole}DashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <${pascalRole}DashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
`;
}

function layoutTemplate({ pascalRole, minTier }) {
  return `"use client";

import { GuardedPage } from "@/components/shared/GuardedPage";

export default function ${pascalRole}Layout({ children }: { children: React.ReactNode }) {
  return <GuardedPage minTier={${minTier}}>{children}</GuardedPage>;
}
`;
}

// ── NEW ──────────────────────────────────────────────────────────────────
async function cmdNew(name, flags) {
  if (!name) die("Usage: scaffold-dashboard.mjs new <role> [--min-tier] [--route] [--title] [--group]");

  const role = name;
  const pascalRole = pascal(role);
  const minTier = Number(flags["min-tier"] ?? 90);
  const route = flags.route ?? `/${role}`;
  const title = flags["title"] ?? `${titleCase(role)} Dashboard`;
  const group = flags["group"] ?? `(${role})`;
  const alertsUrl = flags["alerts"] ?? "/api/admin/security/stats";

  const dir = `src/app/${group}/${role}`;
  const pagePath = resolve(ROOT, dir, "page.tsx");

  if (await exists(pagePath)) {
    die(`${relative(ROOT, pagePath)} already exists. Delete it or pick another role.`);
  }

  await mkdir(resolve(ROOT, dir), { recursive: true });
  await writeFile(pagePath, pageTemplate({ role, pascalRole, title, minTier, alertsUrl }), "utf8");
  ok(`Dashboard page → ${relative(ROOT, pagePath)}`);

  if (flags.layout) {
    const layoutPath = resolve(ROOT, `src/app/${group}/layout.tsx`);
    if (await exists(layoutPath)) {
      warn(`Layout exists at ${relative(ROOT, layoutPath)} — skipped. Wrap it manually.`);
    } else {
      await writeFile(layoutPath, layoutTemplate({ pascalRole, minTier }), "utf8");
      ok(`Layout → ${relative(ROOT, layoutPath)}`);
    }
  }

  console.log("");
  console.log(C.bold("Next steps:"));
  console.log(`  1. Open ${C.dim(relative(ROOT, pagePath))}`);
  console.log(`  2. Replace the TODO block with role-specific widgets`);
  console.log(`  3. Wrap each widget in <WidgetBoundary title="…">`);
  console.log(`  4. Add data sources via useApiResource("/api/…")`);
  console.log("");
  console.log(`Route: ${route}  ·  Tier gate: ≥ ${minTier}`);
}

// ── AUDIT ────────────────────────────────────────────────────────────────
const CHECKS = [
  { id: "guard",       test: (s) => /GuardedPage|AuthGuard/.test(s),                    msg: "No GuardedPage/AuthGuard — role may leak visually" },
  { id: "roles",       test: (s) => /allowedRoles|minTier=/.test(s),                    msg: "Guard present but no allowedRoles / minTier" },
  { id: "suspense",    test: (s) => !/useSearchParams/.test(s) || /Suspense/.test(s),   msg: "useSearchParams without <Suspense> wrapper" },
  { id: "interval",    test: (s) => !/setInterval/.test(s) || /usePolling|useLiveRefresh/.test(s), msg: "Raw setInterval — migrate to usePolling" },
  { id: "fetch",       test: (s) => !/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?fetch\(/.test(s),  msg: "Manual fetch-in-useEffect — use useApiResource" },
  { id: "alerts",      test: (s) => !/alerts\.slice|alerts\.map|AlertBanner/.test(s) || /ConditionalAlert/.test(s), msg: "Hand-rolled alert rendering — use ConditionalAlert" },
  { id: "boundary",    test: (s) => !/recharts|Chart|DualTwin|Heatmap/.test(s) || /WidgetBoundary|ErrorBoundary/.test(s), msg: "Chart-like widget without error boundary" },
  { id: "guardeddata", test: (s) => !/window\.location\.search/.test(s),                msg: "Reads window.location.search — use useSearchParams" },
  { id: "authguard",   test: (s) => /GuardedPage/.test(s) || /<AuthGuard/.test(s),      msg: "Root of page has no guard" },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && entry.name === "page.tsx") yield p;
  }
}

function rel(p) { return relative(ROOT, p); }

async function cmdAudit() {
  const pages = [];
  for await (const p of walk(resolve(SRC, "app"))) pages.push(p);

  console.log(C.bold(`\nAuditing ${pages.length} page.tsx files…\n`));

  let totalIssues = 0;
  const byIssue = new Map();
  const failing = [];

  for (const p of pages) {
    const src = await readFile(p, "utf8");
    const issues = CHECKS.filter((c) => !c.test(src));
    if (issues.length === 0) continue;
    totalIssues += issues.length;
    failing.push({ path: rel(p), issues });
    for (const it of issues) byIssue.set(it.id, (byIssue.get(it.id) ?? 0) + 1);
  }

  // Per-file report
  for (const f of failing) {
    console.log(C.bold(f.path));
    for (const it of f.issues) console.log(`  ${C.red("✖")} ${it.msg}`);
    console.log("");
  }

  // Summary
  if (totalIssues === 0) {
    ok(`All ${pages.length} pages pass.`);
    return;
  }

  console.log(C.bold("Summary by issue:"));
  const sorted = [...byIssue.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of sorted) {
    const check = CHECKS.find((c) => c.id === id);
    console.log(`  ${String(n).padStart(4)}  ${check.msg}`);
  }
  console.log("");
  console.log(C.yellow(`Total: ${totalIssues} issues across ${failing.length} pages.`));
  console.log(C.dim(`Run ${C.bold("node scripts/scaffold-dashboard.mjs fix <file>")} to auto-patch.`));
  console.log("");
}

// ── FIX ──────────────────────────────────────────────────────────────────
async function cmdFix(target) {
  if (!target) die("Usage: scaffold-dashboard.mjs fix <file>");
  const full = resolve(ROOT, target);
  if (!await exists(full)) die(`Not found: ${target}`);

  const original = await readFile(full, "utf8");
  let src = original;
  const applied = [];

  // 1. Wrap in Suspense if useSearchParams exists at top level
  if (/useSearchParams/.test(src) && !/Suspense/.test(src)) {
    src = src.replace(
      /^("use client";?\s*\n)/,
      `$1import { Suspense } from "react";\nimport { PageLoading } from "@/components/shared/LoadingStates";\n`
    );
    // Rename the default export function to Inner and add a wrapper
    const m = src.match(/export default function (\w+)\s*\(/);
    if (m) {
      const name = m[1];
      src = src.replace(
        new RegExp(`export default function ${name}\\s*\\(`),
        `function ${name}Inner(`
      );
      src += `\nexport default function ${name}() {\n  return (\n    <Suspense fallback={<PageLoading />}>\n      <${name}Inner />\n    </Suspense>\n  );\n}\n`;
      applied.push("suspense");
    }
  }

  // 2. Replace raw setInterval with usePolling
  if (/setInterval\(/.test(src) && !/usePolling/.test(src)) {
    src = src.replace(
      /^("use client";?\s*\n)/,
      `$1import { usePolling } from "@/hooks/usePolling";\n`
    );
    warn(`${target}: setInterval detected — add usePolling manually (context-specific).`);
    applied.push("interval-import");
  }

  // 3. Add GuardedPage import if AuthGuard exists but not GuardedPage
  if (/<AuthGuard/.test(src) && !/GuardedPage/.test(src)) {
    src = src.replace(
      /^("use client";?\s*\n)/,
      `$1import { GuardedPage } from "@/components/shared/GuardedPage";\n`
    );
    warn(`${target}: AuthGuard found — swap to <GuardedPage minTier={…}> manually to add tier gate.`);
    applied.push("guard-import");
  }

  // 4. Add WidgetBoundary import when charts are present
  if (/recharts|Chart|Heatmap|DualTwin/.test(src) && !/WidgetBoundary/.test(src)) {
    src = src.replace(
      /^("use client";?\s*\n)/,
      `$1import { WidgetBoundary } from "@/components/shared/WidgetBoundary";\n`
    );
    warn(`${target}: chart widgets present — wrap each in <WidgetBoundary title="…"> manually.`);
    applied.push("boundary-import");
  }

  // 5. Add ConditionalAlert import if alerts are hand-rendered
  if (/alerts\.(slice|map)\(/.test(src) && !/ConditionalAlert/.test(src)) {
    src = src.replace(
      /^("use client";?\s*\n)/,
      `$1import { ConditionalAlert } from "@/components/shared/ConditionalAlert";\n`
    );
    warn(`${target}: hand-rolled alert list — replace with <ConditionalAlert ctx={…} /> manually.`);
    applied.push("alerts-import");
  }

  if (applied.length === 0) {
    ok(`${target} — nothing to auto-patch.`);
    return;
  }

  if (src === original) {
    warn(`${target} — no safe auto-patches applied. Manual edit required.`);
    return;
  }

  await writeFile(full, src, "utf8");
  ok(`${target} — applied: ${applied.join(", ")}`);
}

// ── dispatch ────────────────────────────────────────────────────────────
const { kind, name, flags } = parseArgs(process.argv.slice(2));

const HANDLERS = {
  new: cmdNew,
  audit: cmdAudit,
  fix: cmdFix,
};

if (!kind || !HANDLERS[kind]) {
  console.log(`
${C.bold("Gate Monitor — Dashboard Cookie Cutter")}

  ${C.bold("node scripts/scaffold-dashboard.mjs new <role>")}          create a fully-wired role dashboard
  ${C.bold("node scripts/scaffold-dashboard.mjs audit")}               scan all page.tsx for the 9 known issues
  ${C.bold("node scripts/scaffold-dashboard.mjs fix <file>")}          auto-patch a single page

Flags for ${C.bold("new")}:
  --min-tier <n>      tier gate                (default 90)
  --route <path>      url route                (default /<role>)
  --title "…"         page title               (default "<Role> Dashboard")
  --group <name>      route group folder       (default (<role>))
  --alerts <url>      metrics endpoint         (default /api/admin/security/stats)
  --layout            also emit route-group layout.tsx

Examples:
  ${C.dim("# new HOD dashboard, gated at tier 55")}
  node scripts/scaffold-dashboard.mjs new hod --min-tier 55 --route /hod --group "(approver)"

  ${C.dim("# new warden dashboard with its own layout")}
  node scripts/scaffold-dashboard.mjs new warden --min-tier 60 --layout

  ${C.dim("# scan the whole repo for the 9 known dashboard issues")}
  node scripts/scaffold-dashboard.mjs audit

  ${C.dim("# auto-patch a single page")}
  node scripts/scaffold-dashboard.mjs fix "src/app/(admin)/admin/page.tsx"
`);
  process.exit(kind ? 1 : 0);
}

await HANDLERS[kind](name, flags);