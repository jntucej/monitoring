import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { ReasonCode, ExitReason } from "@/lib/types";

export const CANONICAL_EXIT_FLOWS: Record<
  ReasonCode,
  {
    code: ReasonCode;
    name: string;
    description: string;
    requiresPass: boolean;
    maxDurationHours: number | null;
  }
> = {
  daily_outing: {
    code: "daily_outing",
    name: "Daily Outing",
    description: "Standard local daily outing (no pass required)",
    requiresPass: false,
    maxDurationHours: 4,
  },
  home_in: {
    code: "home_in",
    name: "Home In",
    description: "Return to campus from home visit (no pass required)",
    requiresPass: false,
    maxDurationHours: null,
  },
  home_out: {
    code: "home_out",
    name: "Home Out",
    description: "Weekend/overnight leave (requires warden approved pass)",
    requiresPass: true,
    maxDurationHours: 48,
  },
  day_pass: {
    code: "day_pass",
    name: "Day Pass",
    description: "Full day leave (requires warden approved pass)",
    requiresPass: true,
    maxDurationHours: 12,
  },
};

export function normalizeExitReason(reason?: string | null): ReasonCode | "regular" {
  if (!reason) return "daily_outing";
  const r = reason.trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "daily_outing" || r === "outing") return "daily_outing";
  if (r === "home_in") return "home_in";
  if (r === "home_out" || r === "leave") return "home_out";
  if (r === "day_pass" || r === "day_out") return "day_pass";
  if (r === "emergency") return "daily_outing";
  if (r === "regular") return "regular";
  return "daily_outing";
}

export function requiresGatePass(reason?: string | null): boolean {
  const norm = normalizeExitReason(reason);
  if (norm === "home_out" || norm === "day_pass") {
    return true;
  }
  return false;
}

export interface StudentExitFlowResult {
  allowed: boolean;
  canonicalReason: ReasonCode | "regular";
  requiresPass: boolean;
  passId?: string;
  error?: string;
}

export async function validateStudentExitFlow(
  rollNumber: string,
  direction: "IN" | "OUT",
  rawReason?: ExitReason | string | null,
): Promise<StudentExitFlowResult> {
  const canonicalReason = normalizeExitReason(rawReason);
  const passNeeded = direction === "OUT" && requiresGatePass(canonicalReason);

  if (!passNeeded) {
    return {
      allowed: true,
      canonicalReason,
      requiresPass: false,
    };
  }

  // Reason requires an approved gate pass (home_out / day_pass)
  const client = getSupabaseServiceClient();
  const normalizedRoll = rollNumber.trim().toUpperCase();
  const now = new Date().toISOString();

  // Look for an APPROVED pass matching this student roll
  const { data: passes, error } = await client
    .from("gate_passes")
    .select("*")
    .eq("roll", normalizedRoll)
    .in("final_status", ["APPROVED", "APPROVED_PARENT", "APPROVED_ADMIN"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("validateStudentExitFlow error querying gate_passes:", error);
    const FAIL_OPEN = process.env.EXIT_FLOW_FAIL_OPEN === "true";
    if (FAIL_OPEN) {
      return { allowed: true, canonicalReason, requiresPass: true };
    }
    return {
      allowed: false,
      canonicalReason,
      requiresPass: true,
      error: "Unable to verify gate pass approval due to database error.",
    };
  }

  const validPass = (passes || []).find((p: any) => {
    // If reason code is specified on pass, check match
    const passReason = normalizeExitReason(p.reason);
    if (passReason !== canonicalReason && p.reason !== rawReason) {
      return false;
    }
    // Check time bounds if specified
    if (p.from_datetime && p.to_datetime) {
      const fromTime = new Date(p.from_datetime).getTime();
      const toTime = new Date(p.to_datetime).getTime();
      const currentTime = new Date(now).getTime();
      // Allow a 2-hour buffer before departure window
      const earlyBuffer = 2 * 60 * 60 * 1000;
      if (currentTime < fromTime - earlyBuffer || currentTime > toTime) {
        return false;
      }
    }
    return true;
  });

  if (!validPass) {
    return {
      allowed: false,
      canonicalReason,
      requiresPass: true,
      error: `No approved gate pass found for reason "${canonicalReason}" for roll ${normalizedRoll}.`,
    };
  }

  return {
    allowed: true,
    canonicalReason,
    requiresPass: true,
    passId: validPass.id,
  };
}
