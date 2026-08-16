import { NextRequest, NextResponse } from "next/server";
import { correctionCandidates, correctScan, getAllGatesLive } from "@/lib/db";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabaseClient";
import type { Role } from "@/lib/types";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const action = params.get("action");

    if (action === "live") {
      const gates = await getAllGatesLive();
      return NextResponse.json({ success: true, data: gates });
    }

    const candidates = await correctionCandidates();
    return NextResponse.json({ success: true, data: candidates });
  } catch (error) {
    console.error("Error fetching supervisor data:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load data" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    // Identity comes from the validated auth headers (set by withAuthAndStatus).
    // The role is already checked by the withAuthorization wrapper.
    const supervisorId = req.headers.get("x-user-id");
    if (!supervisorId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Could not identify the user." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { logId, newDirection, newReason, reason } = body;

    if (!logId || !newDirection || !reason) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "logId, newDirection, and reason are required" } },
        { status: 400 }
      );
    }

    // Get the supervisor's name and role for audit logging.
    // Their role is server-derived from the validated session.
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("name, role")
      .eq("id", supervisorId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Supervisor profile not found" } },
        { status: 404 }
      );
    }

    // Pass the authenticated supervisor's ID, name, and server-derived role to the backend.
    // Client-supplied role/approver fields are ignored.
    const corrected = await correctScan(
      logId,
      newDirection,
      newReason,
      reason,
      supervisorId,
      profile.name,
      profile.role as Role
    );

    if (!corrected) {
      return NextResponse.json(
        { success: false, error: { code: "CORRECTION_FAILED", message: "Could not correct scan (may be outside window)" } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: corrected });
  } catch (error) {
    console.error("Error processing correction:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Correction failed" } },
      { status: 500 }
    );
  }
}

const requiredRoles: Role[] = ["supervisor", "admin", "sysadmin"];

export const GET = withRateLimit(
  withAuthAndStatus(withAuthorization(handleGet, { requiredRole: requiredRoles })),
  { keyPrefix: "supervisor_get", maxRequests: 60 }
);

export const POST = withRateLimit(
  withAuthAndStatus(withAuthorization(handlePost, { requiredRole: requiredRoles })),
  { keyPrefix: "supervisor_post", maxRequests: 30 }
);
