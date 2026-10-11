import { NextRequest, NextResponse } from "next/server";
import {
  listParents,
  linkParentToStudent,
  generateUceJUniqueId,
  addAudit,
} from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import type { Role } from "@/lib/types";

/**
 * GET /api/parents
 *  - role=guardian|parent  (default guardian)
 *  - q=<search>
 *  - includeUnlinked=true|false (default false)
 */
async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const role = params.get("role") || "guardian";
    const q = params.get("q") || undefined;
    const includeUnlinked = params.get("includeUnlinked") === "true";

    const parents = await listParents({ role, q, includeUnlinked });
    return NextResponse.json({ success: true, data: parents });
  } catch (error) {
    console.error("Error listing parents:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list parents" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/parents
 * Body: {
 *   name: string,
 *   email?: string,
 *   phone?: string,
 *   role: "guardian" | "parent" (default "guardian"),
 *   uniqueId?: string,   // auto ucej-p-NNNN when omitted
 *   studentId?: string,  // link the new parent to this student immediately
 * }
 *
 * Provisions a Supabase Auth identity + public.users profile row for a
 * parent/guardian, auto-generates ucej-p-NNNN, and returns the one-time
 * initial password (the only place it ever appears). Optionally links the
 * new parent to a student in one call.
 */
async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id") || "system";
  const actorRole = req.headers.get("x-user-role") as Role || "sysadmin";
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      email,
      phone,
      role = "guardian",
      uniqueId,
      studentId,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_NAME", message: "Parent name is required" } },
        { status: 400 }
      );
    }

    if (role !== "guardian" && role !== "parent") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: "role must be 'guardian' or 'parent'" } },
        { status: 400 }
      );
    }

    // One-time initial password — generated here and returned only in this response.
    const generatedPassword = Array.from({ length: 12 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[
        Math.floor(Math.random() * 57)
      ]
    ).join("");

    const service = getSupabaseServiceClient();

    const effectiveEmail =
      (email && String(email).trim()) ||
      `${String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, ".")}@jntuhcej.ac.in`;

    // ---- Step 1: Supabase Auth identity ----
    const { data: authUser, error: authErr } = await service.auth.admin.createUser({
      email: effectiveEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name: String(name).trim(), role },
      app_metadata: { provider: "email", role },
    });

    if (authErr || !authUser?.user?.id) {
      console.error("Parent auth user creation failed:", authErr);
      return NextResponse.json(
        {
          success: false,
          error: { code: "AUTH_CREATE_FAILED", message: authErr?.message || "Could not create auth user" },
        },
        { status: 500 }
      );
    }

    const userId = authUser.user.id;

    // ---- Step 2: public.users profile (auto ucej-p-NNNN when no uniqueId) ----
    const effectiveUniqueId =
      (uniqueId && String(uniqueId).trim()) || (await generateUceJUniqueId("parent"));

    const { error: profileErr } = await service
      .from("users")
      .insert({
        id: userId,
        name: String(name).trim(),
        email: effectiveEmail,
        phone: phone ? String(phone).trim() : null,
        role,
        unique_id: effectiveUniqueId,
        login_identifier: effectiveUniqueId,
        status: "ACTIVE",
      });

    if (profileErr) {
      console.error("Parent profile insert failed:", profileErr);
      await service.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: "PROFILE_CREATE_FAILED", message: profileErr.message } },
        { status: 500 }
      );
    }

    // ---- Step 3: optional student link ----
    let linkedStudent: { id: string; roll: string; name: string } | null = null;
    if (studentId && typeof studentId === "string" && studentId.trim()) {
      const { data: stu } = await service
        .from("users")
        .select("id, name, unique_id")
        .eq("id", studentId.trim())
        .maybeSingle();
      if (stu) {
        await linkParentToStudent(stu.id, userId, actorId);
        linkedStudent = { id: stu.id, roll: stu.unique_id || stu.id, name: stu.name };
      } else {
        return NextResponse.json(
          {
            success: false,
            error: { code: "STUDENT_NOT_FOUND", message: `Student ${studentId} not found; parent was created but not linked` },
          },
          { status: 404 }
        );
      }
    }

    await addAudit({
      action: "PARENT_CREATED",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Created parent ${effectiveUniqueId} (${name})${linkedStudent ? ` linked to student ${linkedStudent.id}` : ""}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        name: String(name).trim(),
        email: effectiveEmail,
        phone: phone ? String(phone).trim() : null,
        uniqueId: effectiveUniqueId,
        role,
        password: generatedPassword,
        linkedStudent,
      },
    });
  } catch (error: any) {
    console.error("Error creating parent:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create parent" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "parents_list", maxRequests: 60 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "parents_create", maxRequests: 30 }
);
