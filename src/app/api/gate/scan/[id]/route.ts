import { NextRequest, NextResponse } from "next/server";
import { correctScan } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabaseClient";
import type { AuthContext } from "@/lib/authContext";
import type { ScanDirection, ExitReason } from "@/lib/types";

/**
 * Extract the scan [id] dynamic segment from the request URL.
 * URL pattern: /api/gate/scan/:id
 */
function getScanId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/gate/scan/:id
  return segments[segments.length - 1];
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const adminId = auth.userId;
    const adminRole = auth.role;

    const scanId = getScanId(req);
    const body = await req.json();
    const { newDirection, newReason, correctionReason } = body;

    if (!newDirection) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_DIRECTION", message: "newDirection is required." } },
        { status: 400 }
      );
    }

    // Validate direction is a valid ScanDirection
    if (newDirection !== "IN" && newDirection !== "OUT") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DIRECTION", message: "Direction must be IN or OUT." } },
        { status: 400 }
      );
    }

    if (!correctionReason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_REASON", message: "correctionReason is required." } },
        { status: 400 }
      );
    }

    // Get the admin's name for audit logging
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("name")
      .eq("id", adminId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Admin profile not found." } },
        { status: 404 }
      );
    }

    const corrected = await correctScan(
      scanId,
      newDirection as ScanDirection,
      newReason as ExitReason | undefined,
      correctionReason,
      adminId,
      profile.name,
      adminRole || "admin" 
    );

    if (!corrected) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CORRECTION_FAILED",
            message: "Could not correct scan. It may be outside the 1-hour correction window or was not found.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: corrected });
  } catch (error) {
    console.error("Error correcting scan:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to correct scan." } },
      { status: 500 }
    );
  }
}

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "scan_correction", maxRequests: 30 }
);
