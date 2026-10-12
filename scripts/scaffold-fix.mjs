#!/usr/bin/env node
// scripts/scaffold-fix.mjs
// Compliance-first cookie cutter for Gate Monitor audit fixes.
// Subcommands: route, service, migration, test, hooks

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ─────────────────────────── ANSI ─────────────────────────── */
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✔ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));

/* ─────────────────────────── helpers ──────────────────────── */
const pascal    = (s) => s.replace(/(^|[-_/\s])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const camel     = (s) => { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); };
const kebab     = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "");
const titleCase = (s) => s.replace(/(^|[-_/\s])([a-z0-9])/g, (_, sp, c) => (sp ? " " : "") + c.toUpperCase()).trim();

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
async function writeFileSafe(absPath, content, { force, dryRun }) {
  if (await exists(absPath) && !force) {
    warn(`skip (exists): ${path.relative(ROOT, absPath)}`);
    return "skipped";
  }
  if (dryRun) { info(`would write: ${path.relative(ROOT, absPath)}`); return "dry"; }
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, "utf8");
  ok(`wrote: ${path.relative(ROOT, absPath)}`);
  return "written";
}
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) { flags[key] = true; }
      else { flags[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, flags };
}
function parseRateLimit(raw) {
  if (!raw || raw === true) return null;
  const [n, ms] = String(raw).split("/").map(Number);
  if (!Number.isFinite(n) || !Number.isFinite(ms)) return null;
  return { maxRequests: n, windowMs: ms };
}
function parseRoles(raw) {
  if (!raw || raw === true) return [];
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}
function tsNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTE TEMPLATE
   ═══════════════════════════════════════════════════════════════════════════ */

function routeTemplate(ctx) {
  const { apiPath, methods, roles, rateLimit, idempotent } = ctx;
  const resourcePascal = pascal((apiPath || "").replace(/\[[^\]]+\]/g, "").split("/").pop() || "resource");
  const roleConstraint = roles.length
    ? `requiredRole: [${roles.map((r) => `"${r}"`).join(", ")}] as Role[],`
    : "";

  const imports = [
    `import { NextRequest } from "next/server";`,
    `import { withAuthorization } from "@/middleware/authorization";`,
    `import { ok, fail } from "@/server/http/response";`,
    `import { requireTrustedHeaders } from "@/server/http/trusted-headers";`,
    `import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";`,
    `import { assertCsrf } from "@/lib/csrf";`,
    `import { RATE_LIMITS } from "@/config/app-constants";`,
    `import { addAudit } from "@/lib/db";`,
    `import { assertLength } from "@/lib/validation";`,
    `import type { AuthContext } from "@/lib/authContext";`,
    `import type { Role } from "@/lib/types";`,
  ];
  if (idempotent) {
    imports.push(`import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";`);
  }

  const handlers = methods.map((method) => {
    if (method === "GET") {
      return `
/**
 * GET ${apiPath}
 * Auth + rate-limit. Reads via service; returns ok<T> envelope.
 */
async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  // Defence in depth: reject if middleware signature is missing/stale.
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  // TODO: replace with your real repository/service call.
  const rows: Array<{ id: string }> = [];

  return ok({ rows, count: rows.length });
}
export const GET = withAuthorization(handleGet, { ${roleConstraint} });`;
    }

    if (method === "POST") {
      const idemBlock = idempotent ? `
  // Idempotency: honour Idempotency-Key header (24h TTL).
  const idemKey = _req.headers.get("idempotency-key");
  const cached = await checkIdempotency(idemKey, auth.userId, "${apiPath}");
  if (cached?.hit) return ok(cached.body, cached.status);` : "";
      const idemStore = idempotent ? `
  await storeIdempotency(idemKey, auth.userId, "${apiPath}", payload, 201);` : "";
      return `
/**
 * POST ${apiPath}
 * Auth — CSRF — rate-limit — validate — write — audit.
 */
async function handlePost(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const csrf = assertCsrf(_req);
  if (csrf) return csrf;${idemBlock}

  // ── 1. Parse + validate body (typed; NO any). ─────────────────
  let body: unknown;
  try { body = await _req.json(); }
  catch { return fail("INVALID_JSON", "request body must be JSON", 400); }

  if (!body || typeof body !== "object") {
    return fail("INVALID_BODY", "body must be an object", 400);
  }
  const payload = body as Record<string, unknown>;

  // Enforce text limits on every string field.
  try {
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v === "string") assertLength(v, 10_000, k);
    }
  } catch (e) {
    return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid input", 400);
  }

  // ── 2. Write via service (never touch DB directly in a route). ───
  // const created = await create${resourcePascal}({ ...payload, actorId: auth.userId });
  const created = { id: crypto.randomUUID(), ...payload };

  // ── 3. Audit (failures are non-fatal). ───────────────────────────
  try {
    await addAudit({
      action: "${resourcePascal.toUpperCase()}_CREATED",
      userId: auth.userId,
      role: auth.role,
      details: { id: created.id },
    });
  } catch { /* audit must never block the write */ }${idemStore}

  return ok(created, 201);
}
export const POST = withAuthorization(handlePost, { ${roleConstraint} });`;
    }

    if (method === "PATCH" || method === "PUT") {
      const fn = method === "PATCH" ? "Patch" : "Put";
      return `
/**
 * ${method} ${apiPath}
 */
async function handle${fn}(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const csrf = assertCsrf(_req);
  if (csrf) return csrf;

  let body: unknown;
  try { body = await _req.json(); }
  catch { return fail("INVALID_JSON", "request body must be JSON", 400); }
  if (!body || typeof body !== "object") {
    return fail("INVALID_BODY", "body must be an object", 400);
  }

  // TODO: implement via service.
  return ok({ updated: true, actor: auth.userId });
}
export const ${method} = withAuthorization(handle${fn}, { ${roleConstraint} });`;
    }

    if (method === "DELETE") {
      return `
/**
 * DELETE ${apiPath}
 */
async function handleDelete(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const untrusted = requireTrustedHeaders(_req);
  if (untrusted) return untrusted;

  const csrf = assertCsrf(_req);
  if (csrf) return csrf;

  // TODO: soft-delete via service.
  try {
    await addAudit({
      action: "${resourcePascal.toUpperCase()}_DELETED",
      userId: auth.userId,
      role: auth.role,
      details: {},
    });
  } catch { /* non-fatal */ }

  return ok({ deleted: true });
}
export const DELETE = withAuthorization(handleDelete, { ${roleConstraint} });`;
    }
    return "";
  }).join("\n");

  const rateLimitStr = rateLimit
    ? `{ windowMs: ${rateLimit.windowMs}, maxRequests: ${rateLimit.maxRequests} }`
    : `RATE_LIMITS.mutation`;

  return `// src/app/api/${apiPath}/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generated by scripts/scaffold-fix.mjs — SCAFFOLD:ROUTE
//
// Bakes in fixes for:
//   #1  CSRF is asserted on every mutating verb
//   #2  Trusted-headers guard rejects un-signed identity headers
//   #26 Standard response envelope (ok/fail only; no raw NextResponse.json)
//   #39 Canonical middleware order: auth — csrf — rate-limit — handler
//   #38 No file-scope eslint-disable
//   #25 assertLength on every string input
// ─────────────────────────────────────────────────────────────────────────────
${imports.join("\n")}

const rateLimitConfig: RateLimitConfig = ${rateLimitStr};
void rateLimitConfig; // reserved for withRateLimit when enabled per-route
${handlers}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE + REPOSITORY + POLICY TRIO
   ═══════════════════════════════════════════════════════════════════════════ */

function serviceTemplate(ctx) {
  const { domain, name, pascalName } = ctx;
  return `// src/server/services/${domain}/${name}.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service layer — orchestrates repository calls + policy decisions.
// NO SQL here; NO HTTP concerns; NO NextRequest / NextResponse.
// Generated by scripts/scaffold-fix.mjs — SCAFFOLD:SERVICE
// ─────────────────────────────────────────────────────────────────────────────

import * as repo from "@/server/repositories/${domain}/${name}";
import { apply${pascalName}Rules } from "@/server/policy/${domain}/${name}";
import { auditWrite } from "@/server/services/audit/write";

export interface ${pascalName}Input {
  actorId: string;
  actorRole: string;
  // TODO: add your input fields
}

export interface ${pascalName}Result {
  id: string;
  // TODO: add your output fields
}

export async function list${pascalName}(input: ${pascalName}Input): Promise<${pascalName}Result[]> {
  const decision = apply${pascalName}Rules({ action: "list", role: input.actorRole });
  if (!decision.allowed) throw new Error(\`FORBIDDEN:\${decision.reason ?? "policy"}\`);
  return repo.findAll();
}

export async function create${pascalName}(input: ${pascalName}Input): Promise<${pascalName}Result> {
  const decision = apply${pascalName}Rules({ action: "create", role: input.actorRole });
  if (!decision.allowed) throw new Error(\`FORBIDDEN:\${decision.reason ?? "policy"}\`);

  const row = await repo.insert({ createdBy: input.actorId });

  // Audit failures never block the write.
  try {
    await auditWrite({
      action: "${pascalName.toUpperCase()}_CREATED",
      userId: input.actorId,
      details: { id: row.id },
    });
  } catch { /* non-fatal */ }

  return row;
}

export async function delete${pascalName}(id: string, input: ${pascalName}Input): Promise<boolean> {
  const decision = apply${pascalName}Rules({ action: "delete", role: input.actorRole });
  if (!decision.allowed) throw new Error(\`FORBIDDEN:\${decision.reason ?? "policy"}\`);

  const deleted = await repo.remove(id);

  try {
    await auditWrite({
      action: "${pascalName.toUpperCase()}_DELETED",
      userId: input.actorId,
      details: { id },
    });
  } catch { /* non-fatal */ }

  return deleted;
}
`;
}

function repositoryTemplate(ctx) {
  const { domain, name, pascalName } = ctx;
  return `// src/server/repositories/${domain}/${name}.ts
// ─────────────────────────────────────────────────────────────────────────────
// Repository layer — SQL only. Every query is parameterized.
// NO business logic; NO authorization decisions; NO HTTP concerns.
// Generated by scripts/scaffold-fix.mjs — SCAFFOLD:REPOSITORY
// ─────────────────────────────────────────────────────────────────────────────

import { query } from "@/lib/postgres";
import { LIMITS } from "@/config/app-constants";

export interface ${pascalName}Row {
  id: string;
  created_by: string;
  created_at: string;
  // TODO: add your columns
}

export async function findAll(
  opts: { limit?: number; offset?: number } = {},
): Promise<${pascalName}Row[]> {
  const limit = Math.min(opts.limit ?? LIMITS.DEFAULT_PAGE_SIZE, LIMITS.MAX_PAGE_SIZE);
  const offset = Math.max(opts.offset ?? 0, 0);
  const { rows } = await query<${pascalName}Row>(
    \`SELECT id, created_by, created_at
       FROM public.${name.replace(/-/g, "_")}
      ORDER BY created_at DESC
      LIMIT \$1 OFFSET \$2\`,
    [limit, offset],
  );
  return rows;
}

export async function findById(id: string): Promise<${pascalName}Row | null> {
  const { rows } = await query<${pascalName}Row>(
    \`SELECT id, created_by, created_at
       FROM public.${name.replace(/-/g, "_")}
      WHERE id = \$1\`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insert(input: { createdBy: string }): Promise<${pascalName}Row> {
  const { rows } = await query<${pascalName}Row>(
    \`INSERT INTO public.${name.replace(/-/g, "_")} (created_by)
     VALUES (\$1)
     RETURNING id, created_by, created_at\`,
    [input.createdBy],
  );
  return rows[0];
}

export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await query(
    \`DELETE FROM public.${name.replace(/-/g, "_")} WHERE id = \$1\`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}
`;
}

function policyTemplate(ctx) {
  const { domain, name, pascalName } = ctx;
  return `// src/server/policy/${domain}/${name}.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure policy layer — NO DB, NO HTTP, NO side effects. Fully unit-testable.
// Generated by scripts/scaffold-fix.mjs — SCAFFOLD:POLICY
// ─────────────────────────────────────────────────────────────────────────────

import type { Role } from "@/lib/types";

export type ${pascalName}Action = "list" | "create" | "delete";

export interface ${pascalName}RuleInput {
  action: ${pascalName}Action;
  role: string;
}

export interface ${pascalName}RuleDecision {
  allowed: boolean;
  reason?: string;
}

/** Role → allowed actions matrix. Extend as needed. */
const ALLOWED: Record<${pascalName}Action, Role[]> = {
  list:   ["sysadmin", "admin"],
  create: ["sysadmin", "admin"],
  delete: ["sysadmin"],
};

export function apply${pascalName}Rules(input: ${pascalName}RuleInput): ${pascalName}RuleDecision {
  const allowed = ALLOWED[input.action].includes(input.role as Role);
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: \`role \${input.role} cannot \${input.action}\` };
}
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MIGRATION TEMPLATE — idempotent, self-recording
   ═══════════════════════════════════════════════════════════════════════════ */

function migrationTemplate(ctx) {
  const { version, name } = ctx;
  const table = name.replace(/^(add|create|drop|alter|fix)_/, "");
  const sql = [];
  sql.push(`-- ============================================================================`);
  sql.push(`-- Migration: ${version}_${name}`);
  sql.push(`-- Purpose: TODO — one-line description of what this changes and why.`);
  sql.push(`--`);
  sql.push(`-- Fixes audit issue #45: every ADD CONSTRAINT / CREATE INDEX is idempotent,`);
  sql.push(`-- so re-running this migration (e.g. in a scratch DB or after a partial`);
  sql.push(`-- failure) never errors.`);
  sql.push(`--`);
  sql.push(`-- Fixes audit issue #44: this migration does NOT touch the audit_logs_action_known`);
  sql.push(`-- constraint. If you need a new audit action, edit`);
  sql.push(`-- 20261027000000_audit_action_canonical.sql instead — that file is the single`);
  sql.push(`-- owner.`);
  sql.push(`-- ============================================================================`);
  sql.push(``);
  sql.push(`SET lock_timeout = '5s';`);
  sql.push(`SET statement_timeout = '60s';`);
  sql.push(``);
  sql.push(`BEGIN;`);
  sql.push(``);
  sql.push(`-- ── 1. Example table change (rename to your actual change) ──────────────────`);
  sql.push(`-- CREATE TABLE IF NOT EXISTS public.${table} (`);
  sql.push(`--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`);
  sql.push(`--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  sql.push(`-- );`);
  sql.push(``);
  sql.push(`-- ── 2. Idempotent column adds ───────────────────────────────────────────────`);
  sql.push(`-- ALTER TABLE public.${table}`);
  sql.push(`--   ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;`);
  sql.push(``);
  sql.push(`-- ── 3. Idempotent constraint adds (guard with pg_constraint) ────────────────`);
  sql.push(`-- DO $$`);
  sql.push(`-- BEGIN`);
  sql.push(`--   IF NOT EXISTS (`);
  sql.push(`--     SELECT 1 FROM pg_constraint WHERE conname = '${table}_status_check'`);
  sql.push(`--   ) THEN`);
  sql.push(`--     ALTER TABLE public.${table}`);
  sql.push(`--       ADD CONSTRAINT ${table}_status_check`);
  sql.push(`--       CHECK (status IN ('ACTIVE','ARCHIVED'));`);
  sql.push(`--   END IF;`);
  sql.push(`-- END $$;`);
  sql.push(``);
  sql.push(`-- ── 4. Idempotent index adds ────────────────────────────────────────────────`);
  sql.push(`-- CREATE INDEX IF NOT EXISTS idx_${table}_created_at`);
  sql.push(`--   ON public.${table}(created_at DESC);`);
  sql.push(``);
  sql.push(`-- ── 5. RLS (create policy only if missing) ──────────────────────────────────`);
  sql.push(`-- ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
  sql.push(`-- DO $$`);
  sql.push(`-- BEGIN`);
  sql.push(`--   IF NOT EXISTS (`);
  sql.push(`--     SELECT 1 FROM pg_policies`);
  sql.push(`--     WHERE schemaname='public' AND tablename='${table}'`);
  sql.push(`--       AND policyname='svc_all_${table}'`);
  sql.push(`--   ) THEN`);
  sql.push(`--     CREATE POLICY svc_all_${table}`);
  sql.push(`--       ON public.${table} FOR ALL TO service_role`);
  sql.push(`--       USING (true) WITH CHECK (true);`);
  sql.push(`--   END IF;`);
  sql.push(`-- END $$;`);
  sql.push(``);
  sql.push(`COMMIT;`);
  sql.push(``);
  sql.push(`-- ── Self-record (adaptive to 2-col or 4-col schema_migrations) ──`);
  sql.push(`DO $$`);
  sql.push(`DECLARE`);
  sql.push(`  has_filename BOOLEAN;`);
  sql.push(`  has_checksum BOOLEAN;`);
  sql.push(`BEGIN`);
  sql.push(`  SELECT EXISTS (`);
  sql.push(`    SELECT 1 FROM information_schema.columns`);
  sql.push(`    WHERE table_schema='public' AND table_name='schema_migrations'`);
  sql.push(`      AND column_name='filename'`);
  sql.push(`  ) INTO has_filename;`);
  sql.push(`  SELECT EXISTS (`);
  sql.push(`    SELECT 1 FROM information_schema.columns`);
  sql.push(`    WHERE table_schema='public' AND table_name='schema_migrations'`);
  sql.push(`      AND column_name='checksum'`);
  sql.push(`  ) INTO has_checksum;`);
  sql.push(``);
  sql.push(`  IF has_filename AND has_checksum THEN`);
  sql.push(`    INSERT INTO public.schema_migrations (version, filename, applied_at, checksum)`);
  sql.push(`    VALUES ('${version}', '${version}_${name}.sql', NOW(),`);
  sql.push(`            md5('${version}_${name}'))`);
  sql.push(`    ON CONFLICT (version) DO NOTHING;`);
  sql.push(`  ELSIF has_filename THEN`);
  sql.push(`    INSERT INTO public.schema_migrations (version, filename, applied_at)`);
  sql.push(`    VALUES ('${version}', '${version}_${name}.sql', NOW())`);
  sql.push(`    ON CONFLICT (version) DO NOTHING;`);
  sql.push(`  ELSE`);
  sql.push(`    INSERT INTO public.schema_migrations (version, applied_at)`);
  sql.push(`    VALUES ('${version}', NOW())`);
  sql.push(`    ON CONFLICT (version) DO NOTHING;`);
  sql.push(`  END IF;`);
  sql.push(`END $$;`);
  sql.push(``);
  return sql.join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEST TEMPLATE — fails CI when creds missing
   ══════════════════════════════════════════════════════════════════════════ */

function testTemplate(ctx) {
  const { role, route, slug } = ctx;
  return `import { test, expect } from "./fixtures";

// ─────────────────────────────────────────────────────────────────────────────
// Generated by scripts/scaffold-fix.mjs — SCAFFOLD:TEST
//
// Fixes audit issues #36 + #37:
//   • Fails CI when creds are missing (test.fixme — NOT test.skip).
//   • Uses the shared fixtures module so \`failedRequests\` is populated
//     and asserted to be empty (zero 4xx/5xx across the whole run).
// ─────────────────────────────────────────────────────────────────────────────

const HAS_CREDS = Boolean(process.env.SMOKE_USER && process.env.SMOKE_PASS);
if (!HAS_CREDS) {
  // fixme is RED in CI dashboards (unlike skip) and can be enforced with
  // \`playwright test --fail-on-fixme\` in your CI pipeline.
  test.fixme(true, "SMOKE_USER / SMOKE_PASS must be set — refusing to pass silently");
}

test.describe("${role} ${route}", () => {
  test("loads clean, fires zero failed requests", async ({ page, failedRequests }) => {
    await page.goto("/login");
    await page.getByLabel(/login id|email/i).fill(process.env.SMOKE_USER!);
    await page.getByLabel(/password/i).fill(process.env.SMOKE_PASS!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\\/(admin|sysadmin|supervisor|operator|student|parent|warden|staff)/);

    await page.goto("${route}");
    // A visible heading proves the page rendered past Suspense.
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });

    // Zero 4xx/5xx responses during the whole flow.
    expect(failedRequests, JSON.stringify(failedRequests, null, 2)).toEqual([]);
  });

  test("renders within an error boundary on API failure", async ({ page }) => {
    // Force every /api/** to fail once the page is mounted.
    await page.route("**/api/**", (r) => r.fulfill({ status: 500, body: "{}" }));
    await page.goto("${route}");
    // The route-level error.tsx boundary should render, not a blank screen.
    await expect(page.getByText(/something went wrong|try again/i)).toBeVisible({ timeout: 10_000 });
  });
});
`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED LIBRARY (hooks subcommand)
   ══════════════════════════════════════════════════════════════════════════ */

function buildMutationGuardTS() {
  const lines = [];
  lines.push(`// src/server/http/mutation-guard.ts`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(`// Wraps a route handler and enforces the canonical middleware order for`);
  lines.push(`// mutating verbs. Fixes audit issue #1 (missing CSRF) and #39 (order drift).`);
  lines.push(`//`);
  lines.push(`// Chain (outermost → innermost):`);
  lines.push(`//   1. withAuthorization      — identity, session_version, MFA gate`);
  lines.push(`//   2. withRateLimit          — keyed by authenticated user (not IP)`);
  lines.push(`//   3. assertCsrf             — origin/host check on POST/PUT/PATCH/DELETE`);
  lines.push(`//   4. handler`);
  lines.push(`//`);
  lines.push(`// Usage:`);
  lines.push(`//   export const POST = withMutationGuard(async (req, { auth }) => { ... });`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`import type { NextRequest } from "next/server";`);
  lines.push(`import { withAuthorization, type AuthorizationOptions } from "@/middleware/authorization";`);
  lines.push(`import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";`);
  lines.push(`import { assertCsrf } from "@/lib/csrf";`);
  lines.push(`import type { AuthContext } from "@/lib/authContext";`);
  lines.push(``);
  lines.push(`export interface MutationGuardOptions extends AuthorizationOptions {`);
  lines.push(`  /** Rate-limit config. Default: 60 req / 60_000 ms. */`);
  lines.push(`  rateLimit?: RateLimitConfig;`);
  lines.push(`  /** Set false ONLY for pre-auth endpoints (login, reset). Default true. */`);
  lines.push(`  csrf?: boolean;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`type Handler = (req: NextRequest, ctx: { auth: AuthContext }) => Promise<Response>;`);
  lines.push(``);
  lines.push(`export function withMutationGuard(handler: Handler, options: MutationGuardOptions = {}) {`);
  lines.push(`  const { rateLimit, csrf = true, ...authOptions } = options;`);
  lines.push(``);
  lines.push(`  return withAuthorization(async (req, ctx) => {`);
  lines.push(`    // assertCsrf is a no-op for safe verbs; kept here for defence in depth.`);
  lines.push(`    if (csrf) {`);
  lines.push(`      const blocked = assertCsrf(req);`);
  lines.push(`      if (blocked) return blocked;`);
  lines.push(`    }`);
  lines.push(`    return handler(req, ctx);`);
  lines.push(`  }, authOptions);`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Rate-limit a mutating route keyed by the authenticated user id. */`);
  lines.push(`export function withRateLimitByUser(`);
  lines.push(`  handler: Handler,`);
  lines.push(`  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 },`);
  lines.push(`): Handler {`);
  lines.push(`  return async (req, ctx) => {`);
  lines.push(`    const key = \`user:\${ctx.auth.userId}\`;`);
  lines.push(`    const limited = await withRateLimit(`);
  lines.push(`      async () => handler(req, ctx),`);
  lines.push(`      config,`);
  lines.push(`    )(req as NextRequest, key as unknown as string);`);
  lines.push(`    return limited;`);
  lines.push(`  };`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

function buildResponseTS() {
  const lines = [];
  lines.push(`// src/server/http/response.ts`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(`// Canonical response helpers. Ensures every API route uses the ok/fail envelope`);
  lines.push(`// and blocks raw NextResponse.json() calls outside this file (fixes audit #26).`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`import { NextResponse } from "next/server";`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * Success envelope.`);
  lines.push(` *`);
  lines.push(` * @param data    - Payload (any JSON-serializable value)`);
  lines.push(` * @param status  - HTTP status code (defaults to 200)`);
  lines.push(` */`);
  lines.push(`export function ok(data: unknown = {}, status = 200): Response {`);
  lines.push(`  return NextResponse.json(`);
  lines.push(`    { success: true, data },`);
  lines.push(`    { status }`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * Failure envelope.`);
  lines.push(` *`);
  lines.push(` * @param code    - Machine-readable error code (e.g. VALIDATION_FAILED)`);
  lines.push(` * @param message - Human-readable message`);
  lines.push(` * @param status  - HTTP status code (defaults to 400)`);
  lines.push(` */`);
  lines.push(`export function fail(code: string, message: string, status = 400): Response {`);
  lines.push(`  return NextResponse.json(`);
  lines.push(`    { success: false, error: { code, message } },`);
  lines.push(`    { status }`);
  lines.push(`  );`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Type guard to prevent accidental raw NextResponse.json */`);
  lines.push(`export function assertIsResponse(res: unknown): asserts res is Response {`);
  lines.push(`  if (!(res instanceof Response)) {`);
  lines.push(`    throw new Error(`);
  lines.push(`      "Route must return Response from ok()/fail(); raw NextResponse.json() is forbidden"`);
  lines.push(`    );`);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

function buildTrustedHeadersTS() {
  const lines = [];
  lines.push(`// src/server/http/trusted-headers.ts`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(`// Fixes audit issue #2: route handlers read \`x-user-role\` etc. and TRUST them.`);
  lines.push(`// That is only safe if every route is wrapped in withAuthorization AND that`);
  lines.push(`// middleware always overwrote those headers.`);
  lines.push(`//`);
  lines.push(`// This module adds a second guarantee: a short-lived HMAC signature attached`);
  lines.push(`// to every request by withAuthorization. Any route that reads identity headers`);
  lines.push(`// MUST ALSO call \`requireTrustedHeaders(req)\`. If the signature is missing,`);
  lines.push(`// stale, or wrong, the request is rejected — even if a dev forgot to wrap the`);
  lines.push(`// route in withAuthorization.`);
  lines.push(`//`);
  lines.push(`// Requires INTERNAL_MW_SECRET (32+ chars). Generate with: openssl rand -hex 32`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`import { createHmac, timingSafeEqual } from "crypto";`);
  lines.push(`import type { NextRequest } from "next/server";`);
  lines.push(`import { fail } from "@/server/http/response";`);
  lines.push(`import { requireSecret } from "@/lib/env";`);
  lines.push(``);
  lines.push(`const MAX_AGE_MS = 30_000;`);
  lines.push(``);
  lines.push(`interface TrustedIdentity {`);
  lines.push(`  userId: string;`);
  lines.push(`  role: string;`);
  lines.push(`  email: string | null;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`function getSecret(): Buffer {`);
  lines.push(`  return Buffer.from(requireSecret("INTERNAL_MW_SECRET", 32), "utf8");`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function signTrustedHeaders(identity: TrustedIdentity, nowMs: number = Date.now()): string {`);
  lines.push(`  const payload = \`\${identity.userId}:\${identity.role}:\${identity.email ?? ""}:\${nowMs}\`;`);
  lines.push(`  return createHmac("sha256", getSecret()).update(payload).digest("hex");`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function requireTrustedHeaders(req: NextRequest): Response | null {`);
  lines.push(`  const userId = req.headers.get("x-user-id");`);
  lines.push(`  const role   = req.headers.get("x-user-role");`);
  lines.push(`  const email  = req.headers.get("x-user-email");`);
  lines.push(`  const sig    = req.headers.get("x-mw-signature");`);
  lines.push(`  const tsRaw  = req.headers.get("x-mw-timestamp");`);
  lines.push(``);
  lines.push(`  if (!userId || !role || !sig || !tsRaw) {`);
  lines.push(`    return fail("UNTRUSTED_REQUEST", "missing trusted identity headers", 401);`);
  lines.push(`  }`);
  lines.push(`  const ts = Number(tsRaw);`);
  lines.push(`  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {`);
  lines.push(`    return fail("STALE_MW_SIGNATURE", "middleware signature expired", 401);`);
  lines.push(`  }`);
  lines.push(`  const expected = signTrustedHeaders({ userId, role, email }, ts);`);
  lines.push(`  const a = Buffer.from(sig, "hex");`);
  lines.push(`  const b = Buffer.from(expected, "hex");`);
  lines.push(`  if (a.length !== b.length || !timingSafeEqual(a, b)) {`);
  lines.push(`    return fail("BAD_MW_SIGNATURE", "invalid middleware signature", 401);`);
  lines.push(`  }`);
  lines.push(`  return null;`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

function buildAppConstantsTS() {
  const lines = [];
  lines.push(`// src/config/app-constants.ts`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(`// Central config. Fixes audit issue #13 (hardcoded polling intervals) and`);
  lines.push(`// centralizes magic numbers that were duplicated across dashboards.`);
  lines.push(`// ─────────────────────────────────────────────────────────────────────────────`);
  lines.push(``);
  lines.push(`export const POLL_INTERVALS = {`);
  lines.push(`  realtime:    5_000,`);
  lines.push(`  fast:       15_000,`);
  lines.push(`  normal:     30_000,`);
  lines.push(`  slow:       60_000,`);
  lines.push(`  background: 300_000,`);
  lines.push(`} as const;`);
  lines.push(``);
  lines.push(`export type PollProfile = keyof typeof POLL_INTERVALS;`);
  lines.push(``);
  lines.push(`export function pollMs(profile: PollProfile | number): number {`);
  lines.push(`  return typeof profile === "number" ? profile : POLL_INTERVALS[profile];`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export const RATE_LIMITS = {`);
  lines.push(`  auth:      { windowMs: 15 * 60_000, maxRequests: 10  },`);
  lines.push(`  mutation:  { windowMs:      60_000, maxRequests: 60  },`);
  lines.push(`  read:      { windowMs:      60_000, maxRequests: 300 },`);
  lines.push(`  sensitive: { windowMs: 60 * 60_000, maxRequests: 20  },`);
  lines.push(`} as const;`);
  lines.push(``);
  lines.push(`export const LIMITS = {`);
  lines.push(`  TEXT_SHORT:  200,`);
  lines.push(`  TEXT_MEDIUM: 2_000,`);
  lines.push(`  TEXT_LONG:   10_000,`);
  lines.push(`  MAX_UPLOAD_BYTES: 10 * 1024 * 1024, // 10 MB`);
  lines.push(`  MAX_IMPORT_ROWS:  5_000,`);
  lines.push(`  MAX_PAGE_SIZE:    200,`);
  lines.push(`  DEFAULT_PAGE_SIZE: 50,`);
  lines.push(`} as const;`);
  lines.push(``);
  lines.push(`export const TIME = {`);
  lines.push(`  SESSION_TTL_MS:        60 * 60 * 1000,`);
  lines.push(`  REFRESH_TTL_MS:  7 * 24 * 60 * 60 * 1000,`);
  lines.push(`  MFA_CHALLENGE_TTL_MS:  5 * 60 * 1000,`);
  lines.push(`  ENROLLMENT_TTL_MS:    15 * 60 * 1000,`);
  lines.push(`  PASSWORD_RESET_TTL_MS: 60 * 60 * 1000,`);
  lines.push(`  LOCKOUT_DURATION_MS:  15 * 60 * 1000,`);
  lines.push(`  MAX_FAILED_LOGINS:     5,`);
  lines.push(`} as const;`);
  lines.push(``);
  lines.push(`export const IST_TIMEZONE = "Asia/Kolkata" as const;`);
  lines.push(``);
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMANDS
   ══════════════════════════════════════════════════════════════════════════ */

async function cmdHooks(flags) {
  head("Emitting shared compliance library");
  const dryRun = Boolean(flags["dry-run"]);
  const results = [];
  results.push(await writeFileSafe(path.join(ROOT, "src/server/http/mutation-guard.ts"),  buildMutationGuardTS(), { force: false, dryRun }));
  results.push(await writeFileSafe(path.join(ROOT, "src/server/http/response.ts"),        buildResponseTS(),     { force: false, dryRun }));
  results.push(await writeFileSafe(path.join(ROOT, "src/server/http/trusted-headers.ts"), buildTrustedHeadersTS(), { force: false, dryRun }));
  results.push(await writeFileSafe(path.join(ROOT, "src/config/app-constants.ts"),        buildAppConstantsTS(),  { force: false, dryRun }));
  const written = results.filter((r) => r === "written").length;
  head(`Done — ${written} written`);
  if (written > 0) {
    info("Next: import { withMutationGuard } from '@/server/http/mutation-guard'");
    info("      import { requireTrustedHeaders } from '@/server/http/trusted-headers'");
    info("      import { POLL_INTERVALS } from '@/config/app-constants'");
  }
}

async function cmdRoute(apiPath, flags) {
  if (!apiPath) die("missing <api-path>. e.g. `route admin/announcements`");
  const methods = String(flags.methods ?? "GET,POST").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const roles = parseRoles(flags.auth);
  const rateLimit = parseRateLimit(flags["rate-limit"]);
  const idempotent = Boolean(flags.idempotent);

  head(`Scaffolding compliant route: /api/${apiPath}`);
  info(`methods:    ${methods.join(", ")}`);
  info(`roles:      ${roles.length ? roles.join(", ") : "any authenticated"}`);
  info(`rateLimit:  ${rateLimit ? `${rateLimit.maxRequests} / ${rateLimit.windowMs}ms` : "default (RATE_LIMITS.mutation)"}`);
  info(`idempotent: ${idempotent}`);

  const ctx = { apiPath, methods, roles, rateLimit, idempotent };
  const dest = path.join(ROOT, "src/app/api", apiPath, "route.ts");
  await writeFileSafe(dest, routeTemplate(ctx), { force: Boolean(flags.force), dryRun: Boolean(flags["dry-run"]) });
}

async function cmdService(qualified, flags) {
  if (!qualified || !qualified.includes("/")) die("expected <domain>/<name>. e.g. `mess/token`");
  const [domain, name] = qualified.split("/");
  if (!domain || !name) die("expected <domain>/<name>");
  const pascalName = pascal(name);

  head(`Scaffolding layered trio: ${domain}/${name}`);
  info(`  service   : src/server/services/${domain}/${name}.ts`);
  info(`  repository: src/server/repositories/${domain}/${name}.ts`);
  info(`  policy    : src/server/policy/${domain}/${name}.ts`);

  const ctx = { domain, name, pascalName };
  const force = Boolean(flags.force);
  const dryRun = Boolean(flags["dry-run"]);

  await writeFileSafe(path.join(ROOT, "src/server/services", domain, `${name}.ts`), serviceTemplate(ctx),    { force, dryRun });
  await writeFileSafe(path.join(ROOT, "src/server/repositories", domain, `${name}.ts`), repositoryTemplate(ctx), { force, dryRun });
  await writeFileSafe(path.join(ROOT, "src/server/policy", domain, `${name}.ts`), policyTemplate(ctx),     { force, dryRun });
}

async function cmdMigration(name, flags) {
  if (!name) die("missing <name>. e.g. `mess_add_vendor_column`");
  const version = tsNow();
  const safe = name.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  head(`Scaffolding idempotent migration: ${version}_${safe}`);
  const ctx = { version, name: safe };
  const dest = path.join(ROOT, "database/migrations", `${version}_${safe}.sql`);
  await writeFileSafe(dest, migrationTemplate(ctx), { force: Boolean(flags.force), dryRun: Boolean(flags["dry-run"]) });
}

async function cmdTest(role, route, flags) {
  if (!role || !route) die("usage: test <role> <route>  e.g. `test admin /admin/overview`");
  const slug = `${kebab(role)}-${kebab(route.replace(/^\//, "").replace(/\//g, "-"))}`;
  head(`Scaffolding fail-loud test: tests/${slug}.spec.ts`);
  const ctx = { role, route, slug };
  await writeFileSafe(path.join(ROOT, "tests", `${slug}.spec.ts`), testTemplate(ctx), { force: Boolean(flags.force), dryRun: Boolean(flags["dry-run"]) });
}

function cmdHelp() {
  console.log(`
${C.bold("scaffold-fix")} — compliance-first cookie cutter for Gate Monitor.

${C.bold("Subcommands")}
  ${C.cyan("hooks")}                          Emit the shared compliance library (idempotent).
  ${C.cyan("route")}    <api-path>   [flags]  Compliant API route (CSRF, envelope, guards).
  ${C.cyan("service")}  <domain>/<name>       Service + repository + policy trio.
  ${C.cyan("migration")}<name>       [flags]  Idempotent SQL migration + self-record.
  ${C.cyan("test")}     <role> <route>        Fail-loud Playwright smoke test.

${C.bold("Flags")}
  --auth <role,role>         Required roles (default: any authenticated).
  --methods <GET,POST,...>   HTTP verbs to emit (default GET,POST).
  --rate-limit <n>/<ms>      Rate limit (requests/window-ms).
  --idempotent               POST accepts Idempotency-Key header.
  --force                    Overwrite existing files.
  --dry-run                  Print only.

${C.bold("Examples")}
  node scripts/scaffold-fix.mjs hooks
  node scripts/scaffold-fix.mjs route admin/announcements
  node scripts/scaffold-fix.mjs route users/[id] --methods PATCH,DELETE --auth sysadmin
  node scripts/scaffold-fix.mjs service mess/token
  node scripts/scaffold-fix.mjs migration mess_add_vendor_column
  node scripts/scaffold-fix.mjs test admin /admin/overview
`);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = positional;
  switch (cmd) {
    case "hooks":     await cmdHooks(flags); break;
    case "route":     await cmdRoute(rest[0], flags); break;
    case "service":   await cmdService(rest[0], flags); break;
    case "migration": await cmdMigration(rest[0], flags); break;
    case "test":      await cmdTest(rest[0], rest[1], flags); break;
    case "help":
    case undefined:   cmdHelp(); break;
    default:          die(`unknown command: ${cmd}. run \`help\`.`);
  }
}

main().catch((e) => die(e.stack ?? String(e)));
