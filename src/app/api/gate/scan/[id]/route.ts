import { NextRequest, NextResponse } from "next/server";
import { correctScan } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { AuthContext } from "@/lib/authContext";
import type { ScanDirection, ExitReason } from "@/lib/types";

function getScanId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("scan");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePatch(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const scanId = getScanId(req);
  if (!scanId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_SCAN_ID", message: "scan id required" } },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const newDirection = body.direction as ScanDirection | undefined;
  const newReason = body.reason as ExitReason | undefined;
  const reason = String(body.reason_text ?? body.correctionReason ?? "").trim();

  if (!newDirection || !["IN", "OUT"].includes(newDirection)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_DIRECTION", message: "direction must be IN or OUT" } },
      { status: 400 }
    );
  }
  if (!reason) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_REASON", message: "correctionReason is required" } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: original, error: findErr } = await supabase
    .from("movement_logs")
    .select("id, gate_id, operator_id, is_correction")
    .eq("id", scanId)
    .limit(1)
    .maybeSingle();

  if (findErr || !original) {
    return NextResponse.json(
      { success: false, error: { code: "SCAN_NOT_FOUND", message: "Scan not found" } },
      { status: 404 }
    );
  }

  if (original.is_correction) {
    return NextResponse.json(
      { success: false, error: { code: "ALREADY_CORRECTED", message: "This scan is itself a correction — cannot correct again" } },
      { status: 409 }
    );
  }

  const corrected = await correctScan(
    scanId,
    newDirection,
    newReason,
    reason,
    auth.userId,
    auth.email ?? auth.userId,
    auth.role,
    original.gate_id ?? undefined
  );

  if (!corrected) {
    return NextResponse.json(
      { success: false, error: { code: "CORRECTION_FAILED", message: "Correction could not be recorded" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: corrected });
}

export const PATCH = withRateLimit(withAuthorization(handlePatch), {
  windowMs: 60_000,
  maxRequests: 20,
});
