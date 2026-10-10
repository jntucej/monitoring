import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createUser, updateUserRole, updateAccountStatus, findUserById, addAudit } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { Role } from "@/lib/types";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

const VALID_ROLES: (Role | string)[] = ["operator", "admin", "sysadmin", "supervisor", "guardian", "parent", "hod", "student", "warden", "faculty", "staff", "worker", "visitor", "caretaker", "deputy_warden", "hostel_manager", "principal", "vice_principal", "oie", "exam_branch"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id");
  const actorRole = req.headers.get("x-user-role");

  if (!actorId || (actorRole !== "admin" && actorRole !== "sysadmin")) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Admin privileges required" } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    // Support CsvBulkImporter two-phase actions
    if (body?.action === "validate") {
      const { validateImport } = await import("@/lib/user-import");
      const result = await validateImport(body.csvText || "");
      return NextResponse.json({ success: true, data: result });
    }

    if (body?.action === "commit") {
      const { validateImport, commitImport } = await import("@/lib/user-import");
      const validation = await validateImport(body.csvText || "");
      const commitRes = await commitImport(validation.validRows, actorId, body.skipErrors !== false);
      return NextResponse.json({ success: true, data: commitRes });
    }

    const usersList = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : null;

    if (!usersList || usersList.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No user items provided for bulk operation" } },
        { status: 400 }
      );
    }

    if (usersList.length > 20000) {
      return NextResponse.json(
        { success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Bulk import capped at 20000 users per request" } },
        { status: 400 }
      );
    }

    const service = getSupabaseServiceClient();
    const results: Array<{ email: string; success: boolean; id?: string; error?: string }> = [];

    for (const item of usersList) {
      const {
        name, email, role, status = "ACTIVE",
        employeeId, uniqueId, phone, gateId,
        assignedHostel, hostelRoom, departmentId, department, isHosteller,
      } = item || {};

      if (!email || !EMAIL_PATTERN.test(email)) {
        results.push({ email: email || "unknown", success: false, error: "Invalid or missing email" });
        continue;
      }

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        results.push({ email, success: false, error: "Name is required" });
        continue;
      }

      if (!role || !VALID_ROLES.includes(role as Role)) {
        results.push({ email, success: false, error: `Invalid role: ${role}` });
        continue;
      }

      // SECURITY GUARD: Only sysadmin can create or promote users to sysadmin
      if (role === "sysadmin" && actorRole !== "sysadmin") {
        results.push({ email, success: false, error: "Only system administrators can create or promote users to sysadmin" });
        continue;
      }

      // Check if user exists by email
      const { data: existingProfiles } = await service
        .from("users")
        .select("id, role, status")
        .eq("email", email.trim().toLowerCase());

      const existing = existingProfiles?.[0];

      if (existing) {
        // Update existing user
        if (existing.role !== role) {
          await updateUserRole(existing.id, role as Role, actorId);
        }
        if (existing.status !== status) {
          await updateAccountStatus(existing.id, status);
        }

        results.push({ email, success: true, id: existing.id });
      } else {
        // Create new identity and profile
        const cleanEmail = email.trim().toLowerCase();
        const tempPassword = randomBytes(16).toString("hex") + "Aa1!";
        
        const { data: authData, error: authError } = await service.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: name.trim(), role },
        });

        if (authError || !authData?.user?.id) {
          results.push({ email, success: false, error: authError?.message || "Failed to create Auth user" });
          continue;
        }

        const newUserId = authData.user.id;
        const profile = await createUser({
          id: newUserId,
          name: name.trim(),
          email: cleanEmail,
          role: role as Role,
          status,
          employeeId: employeeId?.trim(),
          uniqueId: (uniqueId || employeeId)?.trim(),
          phone: phone?.trim(),
          gateId,
          assignedHostel: assignedHostel || hostelRoom,
          hostelRoom,
          isHosteller,
          departmentId: departmentId || department,
        });

        if (!profile) {
          // Cleanup orphan auth user
          await service.auth.admin.deleteUser(newUserId);
          results.push({ email, success: false, error: "Failed to insert user profile" });
          continue;
        }

        results.push({ email, success: true, id: newUserId });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    await addAudit({
      action: "USER_CREATED",
      userId: actorId,
      userName: "Admin",
      role: actorRole as Role,
      details: JSON.stringify({ message: `Processed bulk import/update for ${usersList.length} items (${successCount} succeeded)` }),
    });

    return NextResponse.json({
      success: true,
      processed: usersList.length,
      succeeded: successCount,
      failed: usersList.length - successCount,
      results,
    });
  } catch (error) {
    console.error("Error in bulk users operation:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Bulk user import failed" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "users_bulk", maxRequests: 5 }
);
