/* ───────────────────────────────────────────────────────────────────────
 * scripts/scaffold-classes.mjs
 * Deterministic scaffold for the classes + faculty API routes.
 *
 * Writes boilerplate-free route stubs so the CFPO API groups (G1/G2/G3)
 * only fill the `// TODO` bodies. Reuses the live helper APIs:
 *   - withAuthorization(handler, { requiredRole })  from @/middleware/authorization
 *   - withRateLimit(handler, config)                from @/lib/rate-limit
 *   - withMutationGuard(handler, options)           from @/server/http/mutation-guard
 *   - ok(data) / fail(code, msg, status)            from @/server/http/response
 *   - query<T>(sql, params)                         from @/lib/postgres
 *   - logAuditEvent(eventType, userId, details)    from @/middleware/authorization
 *
 * Run: node scripts/scaffold-classes.mjs
 * Idempotent: skips files that already exist (unless --force).
 * ─────────────────────────────────────────────────────────────────────── */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const FORCE = process.argv.includes("--force");

// ── Read-route stub (GET) ────────────────────────────────────────────────
function readRouteStub({ path, roles, rateKey }) {
  return `"use client";
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

// SCARFOLD:READ — ${path}
// Contract: src/contracts/classes.ts  (${roles.join("|")} scope)
// TODO: implement the GET body per contract.
export const GET = withRateLimit(
  withAuthorization(async (_req: NextRequest, { auth }) => {
    // auth: { userId, role, departmentId, ... }
    try {
      const { rows } = await query("SELECT 1"); // replace
      // return ok(rows.map(rowToClassRow));
      return ok(rows);
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: [${roles.map((r) => JSON.stringify(r)).join(", ")}] }),
  { keyPrefix: "${rateKey}", maxRequests: 30, windowMs: 60_000 }
);
`;
}

// ── Write-route stub (POST / PATCH / DELETE) ────────────────────────────
function writeRouteStub({ path, roles, verb, input }) {
  return `import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/middleware/authorization";

// SCARFOLD:WRITE — ${verb} ${path}
// Contract: src/contracts/classes.ts  (${roles.join("|")} scope, input: ${input})
// TODO: implement the ${verb} body per contract. Scope = caller.department_id
// must match target.department_id (HOD); admin/sysadmin bypass.
export const ${verb} = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    // auth: { userId, role, departmentId, ... }
    try {
      const body = req.body ? await req.json() : {};
      // validate body against ${input}
      const { rows } = await query("SELECT 1"); // replace
      await logAuditEvent("${input.replace(/Input$/, "_UPDATED")}", auth.userId, body);
      return ok(rows[0]);
    } catch (err) {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: [${roles.map((r) => JSON.stringify(r)).join(", ")}] }
);
`;
}

// ── Combined stub (GET + one write verb, single import block) ──────────
function combinedRouteStub({ path, getRoles, getRateKey, writeRoles, verb, input }) {
  return `import { NextRequest } from "next/server";
import { withAuthorization, logAuditEvent } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

// SCARFOLD:COMBINED — GET + ${verb} ${path}
// Contract: src/contracts/classes.ts  (GET: ${getRoles.join("|")}, ${verb}: ${writeRoles.join("|")}, input: ${input})

// GET — TODO: implement per contract. Scope = HOD sees own dept, admin sees all.
export const GET = withRateLimit(
  withAuthorization(async (_req: NextRequest, { auth }) => {
    // auth: { userId, role, departmentId, ... }
    try {
      const { rows } = await query("SELECT 1"); // replace
      return ok(rows);
    } catch {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  }, { requiredRole: [${getRoles.map((r) => JSON.stringify(r)).join(", ")}] }),
  { keyPrefix: "${getRateKey}", maxRequests: 30, windowMs: 60_000 }
);

// ${verb} — TODO: implement per contract. Scope = caller.department_id must match
// target.department_id (HOD); admin/sysadmin bypass. Log the audit event.
export const ${verb} = withMutationGuard(
  async (req: NextRequest, { auth }) => {
    // auth: { userId, role, departmentId, ... }
    try {
      const body = req.body ? await req.json() : {};
      // validate body against ${input}
      const { rows } = await query("SELECT 1"); // replace
      await logAuditEvent("${input.replace(/Input$/, "_UPDATED")}", auth.userId, body);
      return ok(rows[0]);
    } catch (err) {
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  { requiredRole: [${writeRoles.map((r) => JSON.stringify(r)).join(", ")}] }
);
`;
}

// ── File plan: [path, kind, roles, extra] ───────────────────────────────
const files = [
  // G1 — API write routes
  { p: "src/app/api/classes/route.ts", kind: "mixed", verb: "POST", roles: ["hod", "admin"], input: "CreateClassInput", rateKey: "classes" },
  { p: "src/app/api/classes/[id]/route.ts", kind: "mixed", verb: "PATCH", roles: ["hod", "admin"], input: "UpdateClassInput", rateKey: "class_id" },
  { p: "src/app/api/faculty-assignments/route.ts", kind: "mixed", verb: "POST", roles: ["hod", "admin"], input: "AssignInput", rateKey: "faculty_assignments" },
  { p: "src/app/api/faculty-assignments/[id]/route.ts", kind: "mixed", verb: "DELETE", roles: ["hod", "admin"], input: "void", rateKey: "fa_id" },

  // G2 — API read routes
  { p: "src/app/api/classes/route.ts", kind: "get", roles: ["hod", "admin"], rateKey: "classes" },
  { p: "src/app/api/classes/[id]/route.ts", kind: "get", roles: ["hod", "faculty", "admin"], rateKey: "class_id" },
  { p: "src/app/api/classes/[id]/students/route.ts", kind: "get", roles: ["hod", "faculty", "admin"], rateKey: "class_students" },
  { p: "src/app/api/config/subjects/route.ts", kind: "get", roles: ["faculty", "hod", "admin", "student"], rateKey: "subjects" },
  { p: "src/app/api/departments/[dept]/classes/route.ts", kind: "get", roles: ["hod", "admin"], rateKey: "dept_classes" },

  // G3 — Faculty self-service routes
  { p: "src/app/api/faculty/my-classes/route.ts", kind: "get", roles: ["faculty"], rateKey: "my_classes" },
  { p: "src/app/api/faculty/my-class/[id]/route.ts", kind: "get", roles: ["faculty"], rateKey: "my_class" },
];

// Dedup: if a path appears for both read + write, emit a combined stub with
// both GET and POST/PATCH/DELETE exported so one group doesn't clobber the
// other.
const byPath = new Map();
for (const f of files) {
  if (!byPath.has(f.p)) byPath.set(f.p, { get: null, write: null, roles: [], input: "void", rateKey: "" });
  const rec = byPath.get(f.p);
  if (f.kind === "get") {
    rec.get = f;
  } else {
    rec.write = f;
    rec.roles = f.roles;
    rec.input = f.input;
    rec.rateKey = f.rateKey;
  }
}

let written = 0, skipped = 0;
for (const [path, rec] of byPath) {
  if (existsSync(path) && !FORCE) {
    skipped++;
    console.log("skip (exists)", path);
    continue;
  }
  let out = "";
  if (rec.get && rec.write) {
    // Combined stub: one import block, both GET and the write verb exported.
    out = combinedRouteStub({ path, getRoles: rec.get.roles, getRateKey: rec.rateKey || rec.get.rateKey || "mixed", writeRoles: rec.write.roles, verb: rec.write.verb, input: rec.write.input });
  } else if (rec.get && !rec.write) {
    out = readRouteStub({ path, roles: rec.get.roles, rateKey: rec.get.rateKey });
  } else if (rec.write && !rec.get) {
    out = writeRouteStub({ path, roles: rec.write.roles, verb: rec.write.verb, input: rec.write.input });
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
  written++;
  console.log("wrote", path);
}

console.log(`\nScaffold complete: ${written} written, ${skipped} skipped.`);
console.log("Next: fill the // TODO bodies in each route, then run typecheck.");
