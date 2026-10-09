import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus, setUserFlag, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role, AccountStatus } from "@/lib/types";
import type { FlagStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

const VALID_ROLES: (Role | string)[] = ["operator", "admin", "sysadmin", "supervisor", "guardian", "parent", "hod", "student", "warden", "faculty", "staff", "worker", "visitor", "caretaker", "deputy_warden", "hostel_manager", "principal", "vice_principal", "oie", "exam_branch"];
const VALID_STATUSES: AccountStatus[] = ["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"];
const VALID_FLAGS: Array<FlagStatus> = ["OVERDUE", "UNAUTHORIZED_EXIT", "NO_GATE_PASS", "SUSPENDED", "CURFEW_VIOLATION", "MANUAL_LOCKDOWN"]; // null handled separately in setUserFlag

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
      if (body.role && VALID_ROLES.includes(body.role as Role)) {
        await updateUserRole(id, body.role as Role, actorId);
      }
      if (body.status || body.account_status) {
        const targetStatus = (body.status || body.account_status) as AccountStatus;
        if (VALID_STATUSES.includes(targetStatus)) {
          await updateAccountStatus(id, targetStatus);
        }
      }
      if (body.flags && Array.isArray(body.flags)) {
        for (const flag of body.flags) {
          if (VALID_FLAGS.includes(flag)) {
            await setUserFlag(id, flag, actorId);
          }
        }
      }
      if (body.flagStatus !== undefined || body.flag_status !== undefined) {
        const rawFlag = body.flagStatus !== undefined ? body.flagStatus : body.flag_status;
        if (rawFlag === null || rawFlag === "" || rawFlag === "NONE") {
          await setUserFlag(id, null, actorId);
        } else if (typeof rawFlag === "string") {
          const upper = rawFlag.toUpperCase() as FlagStatus;
          if (VALID_FLAGS.includes(upper)) {
            await setUserFlag(id, upper, actorId);
          } else if (rawFlag === "suspicious" || rawFlag === "FLAGGED") {
            await setUserFlag(id, "MANUAL_LOCKDOWN", actorId);
          }
        }
      }

      await addAudit({
        userId: actorId,
        action: "USER_UPDATED",
        details: { timestamp: new Date().toISOString(), targetId: id, updates: body },
      });
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
    const { error } = await supabase.from("users").update({ status: "DEPROVISIONED" }).eq("id", id);
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