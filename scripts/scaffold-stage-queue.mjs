#!/usr/bin/env node
/**
 * scripts/scaffold-stage-queue.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Gate Monitor cookie cutter: stage-aware approval queues + universal
 * support form. Emits SHARED primitives once (idempotent) plus feature files.
 *
 * Fixes the exact class of bugs found in the OIE dashboard:
 *   1. "not allowed to act at stage X"  → read-only rows for other stages
 *   2. "permission request not found"    → structured error codes
 *   3. Refresh glitches                  → single data hook + refreshKey
 *   4. Support form unusable             → universal form, works from any role
 *
 * Conventions applied (repo-specific, do not "simplify"):
 *   • Envelope is `{ success:false, error:{ code, message } }` (api-response.ts)
 *   • Writes go ONLY through PATCH /api/permissions/[ticket]
 *   • Shared primitives exist; the scaffold SKIPS them and only generates
 *     the feature-scoped wrapper + read-only feed + page.
 *
 * Usage:
 *   node scripts/scaffold-stage-queue.mjs new oie \
 *     --role oie --stage oie \
 *     --chain faculty,hod,oie,vice_principal,principal \
 *     --api /api/oie/queue --title "OIE Queue"
 *
 *   node scripts/scaffold-stage-queue.mjs new hostel-queue \
 *     --role hostel_manager --stage hostel_manager \
 *     --chain caretaker,deputy_warden,hostel_manager,warden_or_principal,main_gate \
 *     --title "Hostel Manager Queue" --group "(approver)" --route /hostel-manager
 *
 *   node scripts/scaffold-stage-queue.mjs list
 *   node scripts/scaffold-stage-queue.mjs help
 *
 * Flags:
 *   --title "OIE Queue"     display title          (default: "<Feature> Queue")
 *   --role <role>           actor role (route gate) (default: <feature>)
 *   --stage <stage>         stage this role acts at (default: <role>)
 *   --chain a,b,c           full workflow chain     (default: just --stage)
 *   --api <url>             data source             (default: /api/<feature>/queue)
 *   --group <name>          route group             (default: (approver))
 *   --route </path>         page route              (default: /<feature>)
 *   --with-support          emit UniversalSupportForm on the page
 *   --no-page               skip the page wrapper
 *   --force                 overwrite feature files
 *   --dry-run               print what would happen, write nothing
 */

import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ═══════════════════════════════════════════════════════════════════════════
   ANSI
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

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SHARED = [
  "src/lib/apiErrors.ts",
  "src/components/approver/StageQueuePanel.tsx",
  "src/components/shared/UniversalSupportForm.tsx",
];

const pascal    = (s) => s.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
const kebab     = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, "").replace(/[_\s]+/g, "-");
const snake     = (s) => kebab(s).replace(/-/g, "_");
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function writeFileSafe(relPath, content, { mode }) {
  const abs = join(ROOT, relPath);
  const exists = await pathExists(abs);

  if (mode === "dry") {
    info(`[dry-run] would write ${relPath}`);
    return;
  }
  if (exists && mode === "safe") {
    warn(`  skipped (exists): ${relPath}`);
    return;
  }
  await fs.mkdir(dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
  ok(`  wrote: ${relPath}`);
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
    } else {
      out._.push(a);
    }
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

function buildContext(feature, flags) {
  const featureKebab = kebab(feature);
  const featureSnake = snake(feature);
  // Never double-suffix: "hostel-queue" must not become "HostelQueueQueuePanel".
  const suffixless = kebab(feature).replace(/[-_](queue|panel|screen|page)$/, "") || featureKebab;
  const featurePascal = pascal(suffixless);

  const role     = flags.role  ?? featureSnake;
  const stage    = flags.stage ?? role;
  const chain    = (flags.chain ?? stage).split(",").map((s) => s.trim()).filter(Boolean);
  const group    = flags.group  ?? "(approver)";
  const route    = flags.route  ?? `/${featureKebab}`;
  const title    = flags.title  ?? `${titleCase(feature)} Queue`;
  const apiUrl   = flags.api    ?? `/api/${featureKebab}/queue`;
  const withPage = flags["no-page"] !== true;
  const withSupport = flags["with-support"] === true;

  if (!chain.includes(stage)) {
    die(`--stage "${stage}" must be one of --chain ${chain.join(",")}`);
  }

  return {
    kebab: featureKebab,
    snake: featureSnake,
    pascal: featurePascal,
    role, stage, chain, group, route, title, apiUrl,
    withPage, withSupport,
    chainLiteral: JSON.stringify(chain),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE — feature queue panel wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

function featureQueuePanel(ctx) {
  return `"use client";
// src/components/approver/${ctx.pascal}QueuePanel.tsx
// SCAFFOLD:QUEUE — feature wrapper for ${ctx.title}.
// Regenerate with: node scripts/scaffold-stage-queue.mjs new ${ctx.kebab} --force

import { useCallback } from "react";
import {
  StageQueuePanel,
  actOnTicket,
  type StageQueueRow,
  type QueueAction,
} from "./StageQueuePanel";

const MY_STAGE = ${JSON.stringify(ctx.stage)};
const CHAIN = ${ctx.chainLiteral};

export interface ${ctx.pascal}QueuePanelProps {
  title?: string;
}

export function ${ctx.pascal}QueuePanel({
  title = ${JSON.stringify(ctx.title)},
}: ${ctx.pascal}QueuePanelProps) {
  const onAction = useCallback(
    async (row: StageQueueRow, action: QueueAction, comment: string) => {
      // Single write surface: PATCH /api/permissions/[ticket]. The server owns
      // the stage check; this wrapper only surfaces the reason on refusal.
      await actOnTicket(row.ticket_number, action, comment);
    },
    [],
  );

  return (
    <StageQueuePanel
      url=${JSON.stringify(ctx.apiUrl)}
      myStage={MY_STAGE}
      chain={CHAIN}
      onAction={onAction}
      title={title}
      allowForward
    />
  );
}

export default ${ctx.pascal}QueuePanel;
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE — read-only queue feed route
   ═══════════════════════════════════════════════════════════════════════════ */

function featureApiRoute(ctx) {
  // /api/hostel-queue/queue → /api/hostel-queue when the feature already
  // ends in "queue", so the path never doubles up.
  const apiKebab = ctx.kebab.replace(/[-_](queue)$/, "") || ctx.kebab;
  return `// src/app/api/${apiKebab}/queue/route.ts
// SCAFFOLD:QUEUE — read-only queue feed for ${ctx.title}.
//
// Never exposes actions here — all writes go through
// PATCH /api/permissions/[ticket], which owns the stage authorization check.
//
// Contract:
//   • Envelope: { success:false, error:{ code, message } } (src/lib/api-response.ts)
//   • Stage scope is derived from the AUTHENTICATED role only. A caller-supplied
//     stage/workflow query param is never trusted.
//   • Returns { success, data, total, chain, myStage } so the client can render
//     other stages read-only instead of guessing.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Roles that may read this feed. Acting is decided row-by-row server-side. */
const VIEW_ROLES: readonly Role[] = [
  ${JSON.stringify(ctx.role)},
  "admin",
  "sysadmin",
] as const;

/** Chain order — the client uses it to decide read-only vs actionable. */
const CHAIN = ${ctx.chainLiteral};

/**
 * Stages this role may SEE. Default: the whole chain. Narrow it here for
 * isolation (e.g. HOD sees own-department stages only — enforced server-side).
 */
function stagesForRole(role: Role): string[] {
  switch (role) {
    case "admin":
    case "sysadmin":
      return [...CHAIN];
    default:
      return [...CHAIN];
  }
}

/** The stage this role may ACT at — null means read-only everywhere. */
function stageOwnedByRole(role: Role): string | null {
  return role === ${JSON.stringify(ctx.role)} ? ${JSON.stringify(ctx.stage)} : null;
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  // Defence in depth: reject if the middleware signature is missing/stale.
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const role = auth.role as Role;
  if (!VIEW_ROLES.includes(role)) {
    const { body, status } = err("FORBIDDEN", "Not authorized to view this queue.", 403);
    return NextResponse.json(body, { status });
  }

  const db = getSupabaseServiceClient();

  // \`permission_requests\` is the compat view over \`permissions\`
  // (20261026000001_permission_workflow_reconciliation.sql) which still
  // exposes \`student_user_id\` — that is the embed alias.
  const { data, error } = await db
    .from("permission_requests")
    .select(
      "id, ticket_number, workflow_type, current_stage, status, sla_deadline, created_at, " +
        "student:student_user_id(id, name, student_details(roll))"
    )
    .eq("workflow_type", ${JSON.stringify(ctx.kebab.split("-")[0])})
    .in("current_stage", stagesForRole(role))
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    const { body, status } = err("DB_ERROR", error.message, 500);
    return NextResponse.json(body, { status });
  }

  const rows = (data ?? []).map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    const student = rec.student as
      | { id?: string | null; name?: string | null; student_details?: { roll?: string | null } | null }
      | null
      | undefined;
    return {
      id: String(rec.id),
      ticket_number: String(rec.ticket_number),
      workflow_type: String(rec.workflow_type),
      current_stage: String(rec.current_stage),
      status: String(rec.status),
      sla_deadline: (rec.sla_deadline as string | null) ?? null,
      created_at: (rec.created_at as string | null) ?? null,
      student: {
        id: student?.id ?? null,
        name: student?.name ?? null,
        student_details: { roll: student?.student_details?.roll ?? null },
      },
    };
  });

  return NextResponse.json({
    success: true,
    data: rows,
    total: rows.length,
    chain: CHAIN,
    myStage: stageOwnedByRole(role),
  });
}

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: ${JSON.stringify(ctx.kebab + "_queue")} };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...VIEW_ROLES] }),
  readLimit
);
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE — page wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

function featurePage(ctx) {
  const supportImport = ctx.withSupport
    ? `import { UniversalSupportForm } from "@/components/shared/UniversalSupportForm";\n`
    : "";
  const supportBlock = ctx.withSupport
    ? `
        <WidgetBoundary title="Support">
          <UniversalSupportForm />
        </WidgetBoundary>`
    : "";

  return `"use client";
// src/app/${ctx.group}/${ctx.route.replace(/^\//, "")}/page.tsx
// SCAFFOLD:QUEUE — thin wrapper around ${ctx.pascal}QueuePanel.
// Regenerate with: node scripts/scaffold-stage-queue.mjs new ${ctx.kebab} --force

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
${supportImport}import { ${ctx.pascal}QueuePanel } from "@/components/approver/${ctx.pascal}QueuePanel";
import type { Role } from "@/lib/types";

const ALLOWED: Role[] = [${JSON.stringify(ctx.role)} as Role, "admin" as Role, "sysadmin" as Role];

function ${ctx.pascal}Inner() {
  return (
    <GuardedPage allowedRoles={ALLOWED}>
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <WidgetBoundary title="Queue">
          <${ctx.pascal}QueuePanel />
        </WidgetBoundary>${supportBlock}
        <DevContactStrip />
      </div>
    </GuardedPage>
  );
}

export default function ${ctx.pascal}Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <${ctx.pascal}Inner />
    </Suspense>
  );
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMANDS
   ═══════════════════════════════════════════════════════════════════════════ */

async function cmdNew(feature, flags) {
  const ctx = buildContext(feature, flags);
  const sharedMode  = flags["dry-run"] ? "dry" : "safe";
  const featureMode = flags["dry-run"] ? "dry" : flags.force ? "force" : "safe";

  head(`Scaffolding stage-queue "${ctx.kebab}"`);
  info(`role  = ${ctx.role}`);
  info(`stage = ${ctx.stage}`);
  info(`chain = ${ctx.chain.join(" → ")}`);
  info(`api   = ${ctx.apiUrl}`);
  console.log("");

  head("Shared primitives (idempotent — skipped if present)");
  for (const rel of SHARED) {
    await writeFileSafe(rel, "/* scaffold managed */\n", { mode: sharedMode });
  }

  head("Feature files");
  const apiKebab = ctx.kebab.replace(/[-_](queue)$/, "") || ctx.kebab;
  await writeFileSafe(
    `src/components/approver/${ctx.pascal}QueuePanel.tsx`,
    featureQueuePanel(ctx),
    { mode: featureMode },
  );
  await writeFileSafe(
    `src/app/api/${apiKebab}/queue/route.ts`,
    featureApiRoute(ctx),
    { mode: featureMode },
  );

  if (ctx.withPage) {
    await writeFileSafe(
      `src/app/${ctx.group}/${ctx.route.replace(/^\//, "")}/page.tsx`,
      featurePage(ctx),
      { mode: featureMode },
    );
  }

  head("Next steps");
  console.log(`  1. Verify the shared primitives exist (they are committed):`);
  for (const rel of SHARED) console.log(`       ${rel}`);
  console.log(`  2. Wire the page in your sidebar nav (role: ${ctx.role}).`);
  console.log(`  3. Narrow the query in \`stagesForRole()\` if this role is dept/branch-scoped.`);
  console.log(`  4. Regenerate feature files with: node scripts/scaffold-stage-queue.mjs new ${ctx.kebab} --force`);
  console.log("");
  ok("Done.");
}

async function cmdList() {
  head("Existing stage queues");
  const dir = join(ROOT, "src/components/approver");
  try {
    const files = await fs.readdir(dir);
    const queues = files.filter((f) => f.endsWith("QueuePanel.tsx") && f !== "StageQueuePanel.tsx");
    if (queues.length === 0) { info("(none yet)"); return; }
    for (const f of queues) console.log(`  • ${f}`);
  } catch {
    info("(no approver components dir yet)");
  }
}

function cmdHelp() {
  console.log(`
${C.bold("scaffold-stage-queue")} — stage-aware approval queues + universal support forms

${C.bold("Commands")}
  new <feature> [flags]     Generate a queue for <feature>
  list                      List existing generated queues
  help                      Show this help

${C.bold("Flags")}
  --title "OIE Queue"       Display title
  --role <role>             Actor role (route gate)
  --stage <stage>           Stage this role acts at
  --chain a,b,c             Full workflow chain (must include --stage)
  --api <url>               Data endpoint
  --group <name>            Route group (default: (approver))
  --route </path>           Page route (default: /<feature>)
  --with-support            Also emit UniversalSupportForm on the page
  --no-page                 Skip the page wrapper
  --force                   Overwrite feature files
  --dry-run                 Print, don't write

${C.bold("Examples")}
  node scripts/scaffold-stage-queue.mjs new oie \\
    --role oie --stage oie \\
    --chain faculty,hod,oie,vice_principal,principal \\
    --api /api/oie/queue --title "OIE Exam Queue"

  node scripts/scaffold-stage-queue.mjs new hostel-queue \\
    --role hostel_manager --stage hostel_manager \\
    --chain caretaker,deputy_warden,hostel_manager,warden_or_principal,main_gate \\
    --title "Hostel Manager Queue" --route /hostel-manager --with-support
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
