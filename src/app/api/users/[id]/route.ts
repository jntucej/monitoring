import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus, setUserFlag, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import type { Role, AccountStatus } from "@/lib/types";
import type { FlagStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

const VALID_ROLES: Role[] = ["operator", "admin", "sysadmin", "parent", "student", "warden", "faculty", "staff"];
const VALID_STATUSES: AccountStatus[] = ["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"];
const VALID_FLAGS: Array<FlagStatus> = ["suspicious", "restricted", null];

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

/** PATCH /api/users/[id] update user profile administrative settings. */
async function handlePatch(req: NextRequest) {
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

    // Admins cannot modify sysadmin accounts unless self
    if (!isSelf && actorRole === "admin" && (target.role === "sysadmin" || (body as any)?.role === "sysadmin")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admins cannot modify sysadmin accounts" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();

    if (body && typeof body === "object") {
      const updates: Record<string, any> = {};

      if (body.role && VALID_ROLES.includes(body.role as Role)) {
        updates.role = body.role;
      }
      if (body.account_status && VALID_STATUSES.includes(body.account_status as AccountStatus)) {
        updates.account_status = body.account_status;
      }
      if (body.flags && Array.isArray(body.flags)) {
        for (const flag of body.flags) {
          if (VALID_FLAGS.includes(flag)) {
            await setUserFlag(id, flag, actorId);
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("users").update(updates).eq("id", id);
        if (error) {
          return NextResponse.json(
            { success: false, error: { code: "SERVER_ERROR", message: error.message } },
            { status: 500 }
          );
        }
        await addAudit({
          userId: actorId,
          action: "USER_UPDATED",
          details: { timestamp: new Date().toISOString(), targetId: id, updates },
        });
      }
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

/** DELETE /api/users/[id] deprovision user (sysadmin only). */
async function handleDelete(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "";

    if (!actorId || actorRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sysadmin only" } },
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

    if (target.role === "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot delete sysadmin" } },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("users").update({ account_status: "DEPROVISIONED" }).eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    await addAudit({
      userId: actorId,
      action: "USER_DEPROVISIONED",
      details: { timestamp: new Date().toISOString(), targetId: id },
    });

    return NextResponse.json({ success: true, message: "User deprovisioned" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal server error" } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: "sysadmin" });