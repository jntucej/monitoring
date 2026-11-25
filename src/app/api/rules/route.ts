// /api/rules — read + write the operational-rules engine.
//
//   GET  /api/rules?domain=&scope=  → active rules for a domain (any role).
//   POST /api/rules                 → create a new version (closes the prior
//                                      effective row). Editors are gated per
//                                      domain via ref_categories(domain='rules_editor')
//                                      with a hard default (admin, principal).
//
// Every automation reads ops_rules, never a hard-coded literal, so changing
// the curfew window = one POST, effective on the next write, no deploy.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { listRules, setRule } from "@/lib/rules/service";
import type { AuthContext } from "@/lib/authContext";

// Default editors when a domain has no ref_categories(rules_editor) entry.
const DEFAULT_EDITORS = new Set(["admin", "principal", "sysadmin"]);

async function canEditRule(domain: string, role: string): Promise<boolean> {
  const { rows } = await query<{ value: Record<string, unknown> }>(
    `SELECT value FROM public.ref_categories
      WHERE domain = 'rules_editor' AND code = $1 LIMIT 1`,
    [domain]
  );
  if (rows.length > 0) {
    const roles = (rows[0].value as { roles?: string[] }).roles ?? [];
    return roles.includes(role);
  }
  return DEFAULT_EDITORS.has(role);
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const url = new URL(req.url);
  const domain = url.searchParams.get("domain");
  const scope = url.searchParams.get("scope");
  if (!domain) return fail("VALIDATION_ERROR", "domain required", 400);
  const rules = await listRules(domain, scope ?? null);
  return ok({ domain, scope: scope ?? null, rules });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const body = (await req.json().catch(() => ({}))) as {
    domain?: string; rule_key?: string; value?: Record<string, unknown>; scope?: string | null;
  };
  if (!body.domain || !body.rule_key || !body.value) {
    return fail("VALIDATION_ERROR", "domain, rule_key and value required", 400);
  }
  if (!(await canEditRule(body.domain, auth.role))) {
    return fail("FORBIDDEN", "cannot edit rules in this domain", 403);
  }
  const rule = await setRule(body.domain, body.rule_key, body.value, body.scope ?? null, auth.userId);
  await addAudit({
    action: "OPS_RULE_UPDATED",
    userId: auth.userId,
    role: auth.role,
    details: { domain: body.domain, ruleKey: body.rule_key, version: rule.version },
  });
  return ok({ rule });
}

export const GET = withAuthorization(handleGet);
export const POST = withAuthorization(handlePost);
