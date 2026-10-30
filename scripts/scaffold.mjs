#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
const ROOT = process.cwd();
function parseArgs(argv) {
  const [kind, name, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i]?.replace(/^--/, "");
    const v = rest[i + 1];
    if (k) flags[k] = v;
  }
  return { kind, name, flags };
}
function die(msg) { console.error(`\x1b[31m✖ ${msg}\x1b[0m`); process.exit(1); }
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function pascal(s) { return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, ""); }
function camel(s) { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); }
async function injectBefore(path, marker, snippet) {
  const full = resolve(ROOT, path);
  const src = await readFile(full, "utf8");
  const wrapped = `${snippet}\n  ${marker}`;
  await writeFile(full, src.replace(marker, wrapped), "utf8"); return true;
}

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

function camelId(snippet) {
  return snippet.match(/id:\s*"([^"]+)"/)?.[1] ?? snippet.slice(0, 40);
}

// ─── ALERT cutter ────────────────────────────────────────────────────────
async function makeAlert(name, flags) {
  if (!name) die("Usage: scaffold.mjs alert <id> [--severity] [--tier] [--roles] [--href]");
  const severity = flags.severity ?? "medium";
  const tier = Number(flags.tier ?? 90);
  const href = flags.href ?? "";
  const roles = flags.roles
    ? `\n    visibleToRoles: [${flags.roles.split(",").map((r) => `"${r.trim()}"`).join(", ")}],`
    : "";
  const id = name.includes(".") ? name : `${name.split("-")[0]}.${name}`;

  const snippet = `  /* ${id} */
  {
    id: "${id}",
    severity: "${severity}",
    title: "${titleCase(name)}",
    message: "Describe the trigger condition in one sentence.",
    minTier: ${tier},${roles}
    condition: (c) => (c.metrics?.${camel(name.split(".").pop() ?? name)} ?? 0) > 0,${href ? `\n    href: "${href}",` : ""}
    ctaLabel: "Open",
  },`;

  const changed = await injectBefore(
    "src/lib/alert-hierarchy.ts",
    "// SCAFFOLD:ALERTS — new alerts are injected above this line",
    snippet
  );
  if (changed) ok(`Alert "${id}" injected into ALERT_CATALOGUE (tier ≥ ${tier})`);
}

// ─── DASHBOARD cutter ────────────────────────────────────────────────────
async function makeDashboard(role, flags) {
  if (!role) die("Usage: scaffold.mjs dashboard <role> [--min-tier] [--route] [--title]");
  const minTier = Number(flags["min-tier"] ?? 90);
  const route = flags.route ?? `/${role}`;
  const title = flags.title ?? `${titleCase(role)} Dashboard`;
  const dir = `src/app/(${role})/${role}`;
  const target = `${dir}/page.tsx`;

  if (await exists(resolve(ROOT, target))) {
    die(`${target} already exists. Delete it first or pick another role.`);
  }

  const body = `"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { ShieldAlert, RefreshCw } from "lucide-react";

const MIN_TIER = ${minTier};

export default function ${pascal(role)}DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "${role}") as Role;

  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Hard tier gate — matches the role-hierarchy contract.
  const tier = getRoleTier(role);
  const canView = tier >= MIN_TIER;

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/security/stats", {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMetrics(data ?? {});
      } catch {
        // keep previous metrics on transient failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [canView]);

  if (!canView) {
    return (
      <AuthGuard>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Access requires tier ≥ ${minTier}. Your role: ${role}.
          </p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">${title}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Signed in as <span className="font-mono">${role}</span> · tier ${'{tier}'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)]"
          >
            <RefreshCw className={\`h-4 w-4 \${loading ? "animate-spin" : ""}\`} />
            Refresh
          </button>
        </header>

        {/* Role-scoped alerts — the only line you must keep. */}
        <section aria-label="Active alerts">
          <ConditionalAlert
            ctx={{
              role,
              userId: user?.id ?? "unknown",
              gateId: user?.gateId ?? null,
              departmentId: user?.departmentId ?? null,
              assignedHostel: user?.assignedHostel ?? null,
              metrics,
            }}
            limit={5}
          />
        </section>

        {/* TODO: add role-specific widgets below. */}
      </div>
    </AuthGuard>
  );
}
`;

  await mkdir(resolve(ROOT, dir), { recursive: true });
  await writeFile(resolve(ROOT, target), body, "utf8");
  ok(`Dashboard created: ${target} (route ${route}, tier ≥ ${minTier})`);
}
// ─── HELP ARTICLE cutter ─────────────────────────────────────────────────
async function makeHelp(slug, flags) {
  if (!slug) die("Usage: scaffold.mjs help <slug> [--tier] [--roles] [--category] [--icon]");
  const tier = Number(flags.tier ?? 0);
  const category = flags.category ?? "Getting started";
  const icon = flags.icon ?? "FileText";
  const roles = flags.roles
    ? `\n    visibleToRoles: [${flags.roles.split(",").map((r) => `"${r.trim()}"`).join(", ")}],`
    : "";

  const snippet = `  /* ${slug} */
  {
    id: "${slug}",
    title: "${titleCase(slug)}",
    summary: "One-line description of what this article covers.",
    icon: ${icon},
    category: "${category}",
    minTier: ${tier},${roles}
    body: [
      "First step…",
      "Second step…",
      "Third step…",
    ],
  },`;

  const changed = await injectBefore(
    "src/app/help/page.tsx",
    "// SCAFFOLD:HELP — new articles are injected above this line",
    snippet
  );
  if (changed) ok(`Help article "${slug}" injected (tier ≥ ${tier})`);
}

// ─── dispatch ────────────────────────────────────────────────────────────
const { kind, name, flags } = parseArgs(process.argv.slice(2));

const handlers = {
  alert: makeAlert,
  dashboard: makeDashboard,
  help: makeHelp,
};

if (!kind || !handlers[kind]) {
  console.log(`
Gate Monitor scaffold — cookie cutter for role-aware artifacts.

  node scripts/scaffold.mjs alert <id>          --severity --tier --roles --href
  node scripts/scaffold.mjs dashboard <role>    --min-tier --route --title
  node scripts/scaffold.mjs help <slug>         --tier --roles --category --icon

Examples:
  node scripts/scaffold.mjs alert warden.overdue --severity high --tier 60 --roles warden,deputy_warden --href /warden
  node scripts/scaffold.mjs dashboard hod --min-tier 55 --route /hod
  node scripts/scaffold.mjs help "night-curfew" --tier 60 --roles warden --category "Gate operations" --icon DoorOpen
`);
  process.exit(kind ? 1 : 0);
}

await handlers[kind](name, flags);



