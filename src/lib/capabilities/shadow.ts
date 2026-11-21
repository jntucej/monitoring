// src/lib/capabilities/shadow.ts
//
// Phase 3 — shadow/dual-run (guardrail #3). We compute the new capability set
// ALONGSIDE the existing role-based expectations, log the diff to the audit
// pipeline, and DO NOT switch the UI. Diffs are fixed in the registry, not in
// the UI. This file is safe to call from any request: it never mutates.
//
// Guardrail #9 — audit every security-impacting decision:
//   personId, capabilityId, decision, contextHash, reason.

import { query } from "@/lib/postgres";
import type { CapabilityDef, WorkspaceContext } from "./types";
import { resolveCapabilities, capabilityDecision } from "./types";

/** SHA-1-free, cheap context fingerprint (stable ordering, no secrets). */
export function contextHash(ctx: WorkspaceContext): string {
  const seed = [
    ctx.personId,
    ctx.personType,
    ctx.residentialStatus,
    ctx.campusStatus,
    [...ctx.roles].sort().join(","),
    ctx.activeAuthorizations.length,
    ctx.registryVersion,
  ].join("|");
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export interface ShadowResult {
  capabilities: string[];
  contextHash: string;
  /** capability ids that the legacy role model would have expected but the
   *  new resolver does not grant (or vice versa). Non-empty = diff to fix in
   *  the registry, not the UI. */
  diffs: string[];
}

/**
 * Run the resolver in shadow mode and persist an audit row explaining the
 * result. `legacyExpected` is the role-based expectation the caller computes
 * today (e.g. "role=hosteller ⇒ hostel.leave.apply expected"). Diff against
 * the resolver output and log.
 */
export async function runShadow(
  defs: CapabilityDef[],
  ctx: WorkspaceContext,
  legacyExpected: string[],
  actorRole: string,
): Promise<ShadowResult> {
  const capabilities = resolveCapabilities(defs, ctx);
  const hash = contextHash(ctx);

  const setNew = new Set(capabilities);
  const setOld = new Set(legacyExpected);
  const missingFromNew = [...setOld].filter((c) => !setNew.has(c)); // legacy expected, resolver didn't grant
  const extraFromNew = [...setNew].filter((c) => !setOld.has(c)); // resolver granted, legacy didn't expect
  const diffs = [...missingFromNew, ...extraFromNew];

  // Guardrail #9: audit the decision. One row per security-cap decision.
  try {
    const securityCaps = defs.filter((d) => d.kind === "security");
    for (const def of securityCaps) {
      const decision = capabilityDecision(def, ctx);
      await query(
        `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
         VALUES ('CAPABILITY_SHADOW_DECISION', $1, $2, $3, $4)`,
        [
          ctx.personId,
          ctx.personId,
          actorRole,
          JSON.stringify({
            capability: def.id,
            decision: decision.allowed ? "ALLOW" : "DENY",
            failMode: decision.failMode,
            contextHash: hash,
            reason: decision.matched
              ? "condition matched"
              : decision.failMode === "closed"
                ? "fail-closed (error/unknown)"
                : "condition not matched",
          }),
        ],
      );
    }
  } catch {
    // audit insert failing must not break the request — shadow is observability.
  }

  // A single summary row for the diff (the thing to fix in the registry).
  if (diffs.length > 0) {
    try {
      await query(
        `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
         VALUES ('CAPABILITY_SHADOW_DIFF', $1, $2, $3, $4)`,
        [
          ctx.personId,
          ctx.personId,
          actorRole,
          JSON.stringify({
            contextHash: hash,
            legacyExpected: missingFromNew,
            resolverGranted: extraFromNew,
            note: "diff to fix in capability registry, not in UI",
          }),
        ],
      );
    } catch {
      // observability only
    }
  }

  return { capabilities, contextHash: hash, diffs };
}
