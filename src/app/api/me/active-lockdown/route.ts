import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import type { AuthContext } from "@/lib/authContext";
import { findActiveLockdownRules } from "@/server/repositories/lockdown/findActive";
import { resolveLockdownSubjectAttrs } from "@/server/repositories/lockdown/resolveSubjectAttrs";

/**
 * GET /api/me/active-lockdown — the lockdown rules that apply to *this*
 * logged-in user, only.
 *
 * Scope safety: a user sees (a) any campus-wide rule, and (b) any scoped
 * rule that actually matches their identity (role / persona / department /
 * hostel_block / class / user). Rules that target other cohorts or other
 * single users are NEVER returned — the response is filtered to the caller,
 * so no one else's private lockdown is leaked.
 *
 * Each returned item is human-safe: it carries scope_type + a resolved human
 * label, never the raw target_values UUIDs (a `user`-scoped rule returns
 * "You" not the UUID; a `hostel_block` rule returns the block name).
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  // Base attrs from the user's own role + student/employee details.
  const baseAttrs = await resolveLockdownSubjectAttrs(auth.userId, null);

  // Build a synthetic subject for "does a scoped rule apply to me?" — using
  // a neutral gateId ("" ) and a BOTH direction so campus/gate rules still
  // surface, but scoped rules are matched on the user's identity only.
  const rules = await findActiveLockdownRules();

  // Persona is resolved from the stored student details (no scan in progress),
  // so re-derive it here (resolveLockdownSubjectAttrs already did).
  const userRole = auth.role;

  const matches: {
    id: string;
    scope_type: string;
    direction: string;
    public_message: string | null;
    expires_at: string | null;
    evacuation: boolean;
    human_label: string;
  }[] = [];

  for (const r of rules) {
    if (r.status !== "ACTIVE") continue;
    if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) continue;

    let label: string;
    let applies: boolean;
    switch (r.scope_type) {
      case "campus":
        applies = true;
        label = "Entire campus";
        break;
      case "gate":
        // A gate-scoped rule affects a user only conceptually; we surface it
        // with a neutral label so the bar can show "Restricted at <gate>".
        applies = true;
        label = "Selected gates";
        break;
      case "role":
        applies = r.target_values.includes(userRole);
        label = `Role: ${r.target_values.join(", ")}`;
        break;
      case "persona":
        applies = !!baseAttrs.persona && r.target_values.includes(baseAttrs.persona);
        label = `Persona: ${r.target_values.join(", ")}`;
        break;
      case "department":
        applies =
          !!baseAttrs.departmentCode && r.target_values.includes(baseAttrs.departmentCode);
        label = `Department: ${r.target_values.join(", ")}`;
        break;
      case "hostel_block":
        applies = !!baseAttrs.hostelBlock && r.target_values.includes(baseAttrs.hostelBlock);
        label = `Hostel: ${r.target_values.join(", ")}`;
        break;
      case "class_section":
        applies = !!baseAttrs.classId && r.target_values.includes(baseAttrs.classId);
        label = `Class: ${r.target_values.join(", ")}`;
        break;
      case "user":
        // Never leak the target user's UUID to anyone — a `user`-scoped rule
        // only applies to its target, and the target sees "You".
        applies = r.target_values.includes(auth.userId);
        label = "You";
        break;
      default:
        applies = false;
        label = "—";
    }

    if (applies) {
      matches.push({
        id: r.id,
        scope_type: r.scope_type,
        direction: r.direction,
        public_message: r.public_message,
        expires_at: r.expires_at,
        evacuation: r.evacuation,
        human_label: label,
      });
    }
  }

  return Response.json({ success: true, data: matches });
}

export const GET = withApiChain(handleGet, {
  route: "/api/me/active-lockdown",
  auth: "user",
  // Any authenticated user may query their OWN lockdown state — the response
  // is server-side filtered to the caller, so no role restriction is needed.
  rateLimit: { keyPrefix: "me_lockdown", maxRequests: 120 },
});
