import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { findUserById, updateUserRole, updateAccountStatus, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import type { Role, AccountStatus } from "@/lib/types";

const VALID_ROLES: Role[] = ["operator", "supervisor", "admin", "sysadmin", "parent", "student", "warden"];
const VALID_STATUSES: AccountStatus[] = ["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"];

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

/**
 * PATCH /api/users/[id] — update a user's role, status, gate assignment or
 * basic profile fields. Admin/sysadmin only; admins cannot touch sysadmins.
 */
async function handlePatch(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    const target = await findUserById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);

    // Admins can never modify (or promote into) sysadmin accounts.

    if (actorRole === "admin" && (target.role === "sysadmin" || body?.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admins cannot manage sysadmin accounts" } },
        { status: 403 }
      );
    }

    const profileUpdates: Record<string, unknown> = {};

    if (body?.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ success: false, error: { code: "INVALID_ROLE", message: "Invalid role" } }, { status: 400 });
      }
      await updateUserRole(id, body.role, actorId);
    }
    if (body?.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid status" } }, { status: 400 });
      }
      await updateAccountStatus(id, body.status);
    }
    for (const field of ["name", "phone", "gateId", "supervisedGates", "assignedHostel", "departmentId"]) {
      if (body?.[field] !== undefined) {
        const col = field === "gateId" ? "gate_id"
          : field === "supervisedGates" ? "supervised_gates"
          : field === "assignedHostel" ? "assigned_hostel"
          : field === "departmentId" ? "department_id"
          : field;
        profileUpdates[col] = body[field];
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const service = getSupabaseServiceClient();
      const { error } = await service.from("users").update(profileUpdates).eq("id", id);
      if (error) {
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: error.message } },
          { status: 500 }
        );
      }
    }

    if (
      body?.role === undefined &&
      body?.status === undefined &&
      Object.keys(profileUpdates).length === 0
    ) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FIELDS", message: "No updatable fields provided" } },
        { status: 400 }
      );
    }

    try {
      const actor = await findUserById(actorId);
      await addAudit({
        action: "USER_UPDATED",
        userId: actorId,
        userName: actor?.name || "System",
        role: (actorRole || "sysadmin") as Role,
        details: `Updated user ${id}: ${JSON.stringify(body)}`,
      });
    } catch { /* audit best-effort */ }

    const updated = await findUserById(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
