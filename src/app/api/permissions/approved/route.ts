import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";
import { normalizeExitReason } from "@/lib/student-exit-flow";

const ADMIN_ROLES = ["admin", "sysadmin", "operator", "principal", "supervisor"];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const authRole = auth.role;
    const params = req.nextUrl.searchParams;
    let roll = params.get("roll") || undefined;
    const reason = params.get("reason") || undefined;

    // Authorization: non-admin roles may only query their own data.
    const isAdmin = ADMIN_ROLES.includes(authRole);
    if (!isAdmin) {
      if (authRole === "student") {
        const service = getSupabaseServiceClient();
        const { data: profile } = await service
          .from("users")
          .select("unique_id")
          .eq("id", auth.userId)
          .maybeSingle();
        const userRoll = profile?.unique_id;
        if (!userRoll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "No roll number associated with this account." } },
            { status: 403 },
          );
        }
        roll = userRoll;
      } else if (authRole === "parent" || authRole === "guardian") {
        // Guardians can only look up their own children — not supported for this endpoint.
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } },
          { status: 403 },
        );
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } },
          { status: 403 },
        );
      }
    }

    if (!roll) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "roll query parameter is required." } },
        { status: 400 },
      );
    }

    const normalizedRoll = roll.trim().toUpperCase();
    const client = getSupabaseServiceClient();

    // 1. Modern path: approveable entries in the permissions table.
    //    These were created via the /api/permissions endpoint (the current system).
    const actorRes = await client
      .from("users")
      .select("id")
      .eq("unique_id", normalizedRoll)
      .maybeSingle();
    const actorId = (actorRes as any)?.id ?? null;

    let modernPasses: any[] = [];
    if (actorId) {
      const { data: perms } = await client
        .from("permissions")
        .select("*")
        .eq("requester_user_id", actorId)
        .in("status", ["APPROVED"])
        .eq("workflow_type", "hostel")
        .not("reason", "is", null)
        .order("created_at", { ascending: false });
      modernPasses = (perms || []) as any[];
    }

    // 2. Legacy path: gate_passes table.
    const { data: legacyPasses } = await client
      .from("gate_passes")
      .select("*")
      .eq("roll", normalizedRoll)
      .in("final_status", ["APPROVED", "APPROVED_PARENT", "APPROVED_ADMIN"])
      .order("requested_at", { ascending: false });
    const legacyList = (legacyPasses || []) as any[];

    // 3. Apply optional reason filter using normalized aliases.
    const filtered = [...modernPasses, ...legacyList].filter((p: any) => {
      if (!reason) return true;
      const passReason = normalizeExitReason(p.reason);
      const requestedReason = normalizeExitReason(reason);
      return passReason === requestedReason;
    });

    return NextResponse.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    console.error("Error fetching approved passes:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load approved passes" } },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handleGet, {
  keyPrefix: "permissions_approved_get",
  maxRequests: 100,
});
