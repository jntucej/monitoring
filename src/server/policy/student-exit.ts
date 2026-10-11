import { getSupabaseServiceClient } from "@/lib/dbClient";
import { normalizeExitReason, requiresGatePass } from "@/lib/student-exit-flow";
import { ForbiddenError } from "@/server/http/errors";
import type { ReasonCode } from "@/lib/types";

export interface ExitFlowResult {
  canonicalReason: ReasonCode | "regular";
  passId?: string;
}

/**
 * Validates that a student exiting with the given reason is either:
 *   (a) using a reason that does not require a pass, or
 *   (b) presenting a reason that requires a pass and has an APPROVED pass
 *       whose window covers the current time.
 *
 * Throws ForbiddenError with a stable code when the pass is missing/expired.
 */
export async function validateStudentExit(
  roll: string,
  direction: "IN" | "OUT",
  rawReason: string | null | undefined,
): Promise<ExitFlowResult> {
  const canonical = normalizeExitReason(rawReason);

  // Entry never requires a pass
  if (direction === "IN") return { canonicalReason: canonical };

  // Reason does not require a pass — allow
  if (!requiresGatePass(canonical)) return { canonicalReason: canonical };

  // Requires a pass — look it up
  const supabase = getSupabaseServiceClient();
  const { data: pass, error } = await supabase
    .from("gate_passes")
    .select("id, from_datetime, to_datetime, final_status, reason")
    .eq("roll", roll)
    .eq("final_status", "APPROVED")
    .order("requested_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new ForbiddenError("Could not verify gate pass");
  }
  if (!pass || pass.length === 0) {
    throw new ForbiddenError("No approved gate pass on file");
  }

  const now = Date.now();
  const BUFFER_MS = 2 * 60 * 60 * 1000; // 2h before window

  const matching = pass.find((p) => {
    const from = new Date(p.from_datetime).getTime() - BUFFER_MS;
    const to = new Date(p.to_datetime).getTime();
    return now >= from && now <= to;
  });

  if (!matching) {
    throw new ForbiddenError("Gate pass is outside its valid window");
  }

  return { canonicalReason: canonical, passId: matching.id };
}
