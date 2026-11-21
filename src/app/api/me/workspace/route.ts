// /api/me/workspace — the single source of truth for "what does this person
// see right now." Returns { context, capabilities, provenance }.
//
// Guardrail #1: the client projects this; it never re-computes.
// Guardrail #3: shadow-run the resolver against the legacy role expectation
// and log diffs (observability, not a UI change).
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { loadWorkspaceContext } from "@/lib/capabilities/context.server";
import { CAPABILITY_REGISTRY, projectWorkspace } from "@/lib/capabilities";
import { runShadow } from "@/lib/capabilities/shadow";

// Legacy role-based expectation (what today's role-only nav would show).
// Used ONLY for the shadow diff. The capability resolver is the source of
// truth; this list is the "old" baseline.
function legacyNavForRole(role: string): string[] {
  // Mirror the current role-only student nav: all students get the same
  // capability set (hostel caps included regardless of residential status),
  // which is the bug we're fixing. The shadow diff will flag that a
  // day_scholar resolver hides hostel caps the legacy model would have
  // expected, and a hosteller-OUT resolver adds expected-return caps legacy
  // didn't model.
  if (role === "student") {
    return [
      "campus.status.view",
      "classes.view",
      "attendance.view",
      "movement.view",
      "credential.view",
      "hostel.leave.apply",
      "curfew.view",
      "day.out.request",
    ];
  }
  // Non-student roles: legacy model gave them a role-specific dashboard
  // (not expressed in capabilities yet). Shadow will report the full diff.
  return [];
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req, { auth }: { auth: AuthContext }) => {
      try {
        const { context, provenance } = await loadWorkspaceContext(auth);
        const projection = projectWorkspace(context, CAPABILITY_REGISTRY);

        // Phase 3 shadow: log the diff between legacy role expectation and
        // the new resolver. Does NOT change the UI.
        const legacy = legacyNavForRole(auth.role);
        const shadow = await runShadow(CAPABILITY_REGISTRY, context, legacy, auth.role);

        return ok({
          context,
          capabilities: projection.capabilities,
          visibleNav: projection.visibleNav,
          hiddenNav: projection.hiddenNav,
          widgets: projection.widgets,
          registryVersion: projection.registryVersion,
          provenance,
          shadow: {
            diffs: shadow.diffs,
            contextHash: shadow.contextHash,
          },
        });
      } catch (e) {
        return fail("WORKSPACE_ERROR", (e as Error).message, 500);
      }
    },
  ),
  { windowMs: 60_000, maxRequests: 60 },
);
