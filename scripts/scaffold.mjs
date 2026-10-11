#!/usr/bin/env node
// scripts/scaffold.mjs
//
// Cookie cutter for the Gate Monitor role-aware stack.
//
//   node scripts/scaffold.mjs alert <id> [--severity critical] [--tier 90]
//   node scripts/scaffold.mjs dashboard <role> [--min-tier 90] [--route /admin]
//   node scripts/scaffold.mjs help <slug> [--tier 0] [--roles warden,hod]
//
// Every generated artifact is role-tier aware -- it plugs straight into
// visibleAlerts() / ConditionalAlert / the help filter with zero wiring.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = process.cwd();

// ─── tiny arg parser ────────────────────────────────────────────────────
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

function die(msg) {
  console.error("\x1b[31m\u2716 " + msg + "\x1b[0m");
  process.exit(1);
}

function ok(msg) {
  console.log("\x1b[32m\u2713\x1b[0m " + msg);
}

function titleCase(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pascal(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, "");
}

function camel(s) {
  const p = pascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

async function injectBefore(path, marker, snippet) {
  const full = resolve(ROOT, path);
  const src = await readFile(full, "utf8");
  if (!src.includes(marker)) {
    die("Marker not found in " + path + ". Add:\n  " + marker);
  }
  if (src.includes("/* " + camelId(snippet) + " */")) {
    ok(path + " already contains this entry -- skipped");
    return false;
  }
  const wrapped = snippet + "\n  " + marker;
  await writeFile(full, src.replace(marker, wrapped), "utf8");
  return true;
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
    ? "\n    visibleToRoles: [" + flags.roles.split(",").map((r) => '"' + r.trim() + '"').join(", ") + "],"
    : "";
  const id = name.includes(".") ? name : name.split("-")[0] + "." + name;

  const snippet = "  /* " + id + " */\n" +
    "  {\n" +
    '    id: "' + id + '",\n' +
    '    severity: "' + severity + '",\n' +
    '    title: "' + titleCase(name) + '",\n' +
    '    message: "Describe the trigger condition in one sentence.",\n' +
    "    minTier: " + tier + "," + roles +
    "\n    condition: (c) => (c.metrics?." + camel(name.split(".").pop() ?? name) + " ?? 0) > 0," +
    (href ? '\n    href: "' + href + '",' : "") +
    '\n    ctaLabel: "Open",\n' +
    "  },";

  const changed = await injectBefore(
    "src/lib/alert-hierarchy.ts",
    "// SCAFFOLD:ALERTS -- new alerts are injected above this line",
    snippet
  );
  if (changed) ok('Alert "' + id + '" injected into ALERT_CATALOGUE (tier >= ' + tier + ")");
}

// ─── DASHBOARD cutter ────────────────────────────────────────────────────
async function makeDashboard(role, flags) {
  if (!role) die("Usage: scaffold.mjs dashboard <role> [--min-tier] [--route] [--title]");
  const minTier = Number(flags["min-tier"] ?? 90);
  const route = flags.route ?? "/" + role;
  const title = flags.title ?? titleCase(role) + " Dashboard";
  const dir = "src/app/(" + role + ")/" + role;
  const target = dir + "/page.tsx";

  if (await exists(resolve(ROOT, target))) {
    die(target + " already exists. Delete it first or pick another role.");
  }

  const body = '"use client";\n\n' +
    'import { useEffect, useState } from "react";\n' +
    'import { AuthGuard } from "@/components/shared/AuthGuard";\n' +
    'import { ConditionalAlert } from "@/components/shared/ConditionalAlert";\n' +
    'import { useAuthStore } from "@/stores/authStore";\n' +
    'import { getRoleTier } from "@/lib/alert-hierarchy";\n' +
    'import type { Role } from "@/lib/types";\n' +
    'import { getAuthHeaders } from "@/lib/utils";\n' +
    'import { ShieldAlert, RefreshCw } from "lucide-react";\n\n' +
    "const MIN_TIER = " + minTier + ";\n\n" +
    "export default function " + pascal(role) + "DashboardPage() {\n" +
    "  const user = useAuthStore((s) => s.user);\n" +
    '  const role = (user?.role ?? "' + role + '") as Role;\n\n' +
    "  const [metrics, setMetrics] = useState<Record<string, number>>({});\n" +
    "  const [loading, setLoading] = useState(true);\n\n" +
    "  // Hard tier gate -- matches the role-hierarchy contract.\n" +
    "  const tier = getRoleTier(role);\n" +
    "  const canView = tier >= MIN_TIER;\n\n" +
    "  useEffect(() => {\n" +
    "    if (!canView) return;\n" +
    "    let cancelled = false;\n" +
    "    (async () => {\n" +
    "      setLoading(true);\n" +
    "      try {\n" +
    "        const res = await fetch(\"/api/admin/security/stats\", {\n" +
    "          headers: getAuthHeaders(),\n" +
    "        });\n" +
    "        if (!res.ok) return;\n" +
    "        const data = await res.json();\n" +
    "        if (!cancelled) setMetrics(data ?? {});\n" +
    "      } catch {\n" +
    "        // keep previous metrics on transient failure\n" +
    "      } finally {\n" +
    "        if (!cancelled) setLoading(false);\n" +
    "      }\n" +
    "    })();\n" +
    "    return () => { cancelled = true; };\n" +
    "  }, [canView]);\n\n" +
    "  if (!canView) {\n" +
    "    return (\n" +
    "      <AuthGuard>\n" +
    '        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">\n' +
    '          <p className="flex items-center gap-2 text-sm font-semibold">\n' +
    '            <ShieldAlert className="h-4 w-4" />\n' +
    '            Access requires tier {'>='} {MIN_TIER}. Your role: {role}.\n' +
    "          </p>\n" +
    "        </div>\n" +
    "      </AuthGuard>\n" +
    "    );\n" +
    "  }\n\n" +
    "  return (\n" +
    "    <AuthGuard>\n" +
    '      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">\n' +
    "        <header className=\"flex items-center justify-between\">\n" +
    "          <div>\n" +
    '            <h1 className="text-2xl font-semibold tracking-tight">' + title + '</h1>\n' +
    '            <p className="mt-1 text-sm text-[var(--text-muted)]">\n' +
    '              Signed in as <span className="font-mono">{role}</span> \u00b7 tier {tier}\n' +
    "            </p>\n" +
    "          </div>\n" +
    '          <button\n' +
    "            onClick={() => window.location.reload()}\n" +
    '            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)]"\n' +
    "          >\n" +
    '            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />\n' +
    "            Refresh\n" +
    "          </button>\n" +
    "        </header>\n\n" +
    "        {/* Role-scoped alerts -- the only line you must keep. */}\n" +
    '        <section aria-label="Active alerts">\n' +
    "          <ConditionalAlert\n" +
    "            ctx={\n" +
    "              role,\n" +
    "              userId: user?.id ?? \"unknown\",\n" +
    "              gateId: user?.gateId ?? null,\n" +
    "              departmentId: user?.departmentId ?? null,\n" +
    "              assignedHostel: user?.assignedHostel ?? null,\n" +
    "              metrics,\n" +
    "            }\n" +
    "            limit={5}\n" +
    "          />\n" +
    "        </section>\n\n" +
    "        {/* TODO: add role-specific widgets below. */}\n" +
    "      </div>\n" +
    "    </AuthGuard>\n" +
    "  );\n" +
    "}\n";

  await mkdir(resolve(ROOT, dir), { recursive: true });
  await writeFile(resolve(ROOT, target), body, "utf8");
  ok("Dashboard created: " + target + " (route " + route + ", tier >= " + minTier + ")");
}

// ─── HELP ARTICLE cutter ─────────────────────────────────────────────────
async function makeHelp(slug, flags) {
  if (!slug) die("Usage: scaffold.mjs help <slug> [--tier] [--roles] [--category] [--icon]");
  const tier = Number(flags.tier ?? 0);
  const category = flags.category ?? "Getting started";
  const icon = flags.icon ?? "FileText";
  const roles = flags.roles
    ? "\n    visibleToRoles: [" + flags.roles.split(",").map((r) => '"' + r.trim() + '"').join(", ") + "],"
    : "";

  const snippet = "  /* " + slug + " */\n" +
    "  {\n" +
    '    id: "' + slug + '",\n' +
    '    title: "' + titleCase(slug) + '",\n' +
    '    summary: "One-line description of what this article covers.",\n' +
    "    icon: " + icon + ",\n" +
    '    category: "' + category + '",\n' +
    "    minTier: " + tier + "," + roles +
    '\n    body: [\n' +
    '      "First step...",\n' +
    '      "Second step...",\n' +
    '      "Third step...",\n' +
    "    ],\n" +
    "  },";

  const changed = await injectBefore(
    "src/app/help/page.tsx",
    "// SCAFFOLD:HELP -- new articles are injected above this line",
    snippet
  );
  if (changed) ok('Help article "' + slug + '" injected (tier >= ' + tier + ")");
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
Gate Monitor scaffold -- cookie cutter for role-aware artifacts.

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
