import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus, setUserFlag, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import type { Role, AccountStatus } from "@/lib/types";
import type { FlagStatus } from "@/lib/db";

const VALID_ROLES: Role[] = ["operator", "admin", "sysadmin", "parent", "student", "warden", "faculty", "staff"];
const VALID_STATUSES: AccountStatus[] = ["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"];
const VALID_FLAGS: Array<FlagStatus> = ["suspicious", "restricted", null];

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

/**
 * PATCH /api/users/[id] — update user profile or administrative settings.
 */
export async function PATCH(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const isSelf = actorId === id;
    const isAdmin = actorRole === "admin" || actorRole === "sysadmin";

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const target = await findUserById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);

    // Admins can never modify sysadmin accounts unless self
    if (!isSelf && actorRole === "admin" && (target.role === "sysadmin" || body?.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admins cannot manage sysadmin accounts" } },
        { status: 403 }
      );
    }

    // Restrict non-admins from changing administrative fields
    if (isSelf && !isAdmin) {
      if (body?.role !== undefined || body?.status !== undefined || "flagStatus" in (body ?? {})) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Users cannot alter administrative settings" } },
          { status: 403 }
        );
      }
    }

    const profileUpdates: Record<string, unknown> = {};

    if (isAdmin && body?.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return NextResponse.json({ success: false, error: { code: "INVALID_ROLE", message: "Invalid role" } }, { status: 400 });
      }
      await updateUserRole(id, body.role, actorId);
    }

    if (isAdmin && body?.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: { code: "INVALID_STATUS", message: "Invalid status" } }, { status: 400 });
      }
      await updateAccountStatus(id, body.status);
    }

    if (isAdmin && "flagStatus" in (body ?? {})) {
      if (!VALID_FLAGS.includes(body.flagStatus)) {
        return NextResponse.json({ success: false, error: { code: "INVALID_FLAG", message: "flagStatus must be suspicious, restricted, or null" } }, { status: 400 });
      }
      const ok = await setUserFlag(id, body.flagStatus as FlagStatus, actorId);
      if (!ok) {
        return NextResponse.json({ success: false, error: { code: "UPDATE_FAILED", message: "Failed to update flag" } }, { status: 500 });
      }
    }

    const allowedFields = ["name", "phone", "photoUrl", "photo_url", "avatarUrl", "avatar_url", "notificationPreferences", "notification_preferences"];
    if (isAdmin) {
      allowedFields.push("gateId", "supervisedGates", "assignedHostel", "departmentId");
    }

    for (const field of allowedFields) {
      if (body?.[field] !== undefined) {
        const col = field === "gateId" ? "gate_id"
          : field === "supervisedGates" ? "supervised_gates"
          : field === "assignedHostel" ? "assigned_hostel"
          : field === "departmentId" ? "department_id"
          : field === "photoUrl" || field === "avatarUrl" ? "photo_url"
          : field === "notificationPreferences" ? "notification_preferences"
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

    try {
      const actor = await findUserById(actorId);
      await addAudit({
        action: "USER_UPDATED",
        userId: actorId,
        userName: actor?.name || "System",
        role: (actorRole || target.role) as Role,
        details: `Updated profile for ${id}`,
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
