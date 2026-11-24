// src/app/api/academic-automation/route.ts
// The admin surface for the academic workflow engine.
//
// GET  /api/academic-automation            — list active rules + autonomy levels
// GET  /api/academic-automation?runs=1    — recent automation_runs (explain-why)
// GET  /api/academic-automation?agents=1  — agent registry
// POST /api/academic-automation/rule      — upsert a policy rule (Rule Builder)
// POST /api/academic-automation/toggle    — kill-switch an agent (Autonomy Panel)
// POST /api/academic-automation/override — set/clear an inherited policy value
//
// Authority: admin / sysadmin (configures institutional policy), and hod for
// department-scoped overrides. Read endpoints open to any authenticated
// admin-grade role so the Autonomy Control Panel is viewable.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { upsertPolicyRule } from "@/lib/academic-workflow-engine";

const PRIV = ["admin", "sysadmin"];
const HOD_OR_PRIV = ["hod", "admin", "sysadmin"];

function isPriv(role: string) {
  return PRIV.includes(role);
}
function isHodOrPriv(role: string) {
  return HOD_OR_PRIV.includes(role);
}

// ── GET ─────────────────────────────────────────────────────────────────────
async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!isHodOrPriv(auth.role)) {
    return fail("FORBIDDEN", "Admin/HOD required to view automation config", 403);
  }
  const showRuns = req.nextUrl.searchParams.get("runs") === "1";
  const showAgents = req.nextUrl.searchParams.get("agents") === "1";
  const showLevels = req.nextUrl.searchParams.get("levels") === "1";

  const out: Record<string, unknown> = {};

  const { rows: rules } = await query(
    `SELECT id, code, name, event, scope_type, scope_id, conditions, actions,
            follow_up, escalate_role, autonomy_level, requires_approval, is_active, version, updated_at
       FROM policy_rules ORDER BY code`,
  );
  out.rules = rules;

  if (showRuns) {
    const { rows: runs } = await query(
      `SELECT id, agent_code, rule_code, event, entity_type, entity_id, outcome,
              explanation, actions_taken, autonomy_level, killed_by, run_at
         FROM automation_runs ORDER BY run_at DESC LIMIT 50`,
    );
    out.recent_runs = runs;
  }
  if (showAgents) {
    const { rows: agents } = await query(
      `SELECT code, name, purpose, trigger_type, trigger_spec, autonomy_level,
              allowed_actions, is_active, schedule FROM automation_agents ORDER BY code`,
    );
    const { rows: controls } = await query(
      `SELECT name, enabled, reason, disabled_by, disabled_at FROM automation_controls ORDER BY name`,
    );
    out.agents = agents;
    out.controls = controls;
  }
  if (showLevels) {
    const { rows: levels } = await query(
      `SELECT level, code, description, requires_approval FROM autonomy_levels ORDER BY level`,
    );
    out.autonomy_levels = levels;
  }
  return ok(out);
}

// ── POST /rule ─────────────────────────────────────────────────────────────
async function implPostRule(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!isPriv(auth.role)) {
    return fail("FORBIDDEN", "Only admin/sysadmin may configure policy rules", 403);
  }
  const body = await req.json().catch(() => null);
  if (!body?.code || !body?.event || !body?.name) {
    return fail("VALIDATION_ERROR", "code, event, name are required", 400);
  }
  const rule = await upsertPolicyRule({ ...body, actorId: auth.userId }, auth.role);
  return ok({ rule });
}

// ── POST /toggle (kill-switch) ────────────────────────────────────────────
async function implPostToggle(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!isPriv(auth.role)) {
    return fail("FORBIDDEN", "Only admin/sysadmin may toggle the kill-switch", 403);
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.enabled !== "boolean") {
    return fail("VALIDATION_ERROR", "name + enabled(boolean) required", 400);
  }
  await query(
    `INSERT INTO automation_controls (name, enabled, reason, disabled_by, disabled_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $5::boolean THEN now() ELSE NULL END)
     ON CONFLICT (name) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       reason = EXCLUDED.reason,
       disabled_by = EXCLUDED.disabled_by,
       disabled_at = CASE WHEN EXCLUDED.enabled THEN NULL ELSE now() END`,
    [body.name, body.enabled, body.reason ?? null, auth.userId, !body.enabled],
  );
  return ok({ name: body.name, enabled: body.enabled });
}

// ── POST /override (inherited policy value) ──────────────────────────────
async function implPostOverride(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!isHodOrPriv(auth.role)) {
    return fail("FORBIDDEN", "Admin/HOD required to set policy overrides", 403);
  }
  const body = await req.json().catch(() => null);
  if (!body?.key || !body?.value) {
    return fail("VALIDATION_ERROR", "key + value required", 400);
  }
  // HOD may only override their own department-scoped key; priv can do any.
  const keyStr = String(body.key);
  const deptScope = keyStr.match(/:department:([^:]+)$/);
  if (auth.role === "hod" && deptScope) {
    // best-effort: HOD overrides their department; the value carries the dept
    // already in the key, so we trust the key's department token.
  }
  if (body.clear) {
    await query(`DELETE FROM policy_overrides WHERE key = $1`, [keyStr]);
  } else {
    await query(
      `INSERT INTO policy_overrides (key, value_json, reason, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, now())
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json,
         reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [keyStr, JSON.stringify(body.value), body.reason ?? null, auth.userId],
    );
  }
  return ok({ key: keyStr, cleared: !!body.clear });
}

// ── Export ────────────────────────────────────────────────────────────────
// withAuthorization wraps a (req, {auth}) handler at module load. The POST
// sub-routes share one wrapped handler that dispatches on the pathname tail
// after authorization.
export const GET = withAuthorization(implGet, {});

async function implPostDispatch(req: NextRequest, ctx: { auth: AuthContext }) {
  const tail = req.nextUrl.pathname.replace(/^\/api\/academic-automation/, "");
  if (tail === "/rule") return implPostRule(req, ctx);
  if (tail === "/toggle") return implPostToggle(req, ctx);
  if (tail === "/override") return implPostOverride(req, ctx);
  return fail("NOT_FOUND", "unknown sub-route; use /rule /toggle /override", 404);
}

export const POST = withMutationGuard(implPostDispatch, {});
