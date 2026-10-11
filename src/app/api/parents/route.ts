import { NextRequest, NextResponse } from "next/server";
import {
  listParents,
  linkParentToStudent,
} from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

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
 *   uniqueId?: string  (auto ucej-p-NNNN when omitted),
 *   studentId?: string  // link a parent to a specific student by user id,
 *   parentUserId?: string // parent to link to a student (used with studentId)
 * }
 *
 * Creates the parent user (if needed) and links them to a student.
 * Returns the created/linked parent info plus the auto-generated password
 * (shown once in a modal).
 */
async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      email,
      phone,
      role = "guardian",
      uniqueId,
      studentId,
      parentUserId,
      password,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_NAME", message: "Parent name is required" } },
        { status: 400 }
      );
    }

    // Generate password if not supplied
    let generatedPassword: string | null = null;
    if (password && typeof password === "string" && password.length >= 8) {
      // use supplied password
    } else {
      generatedPassword = Array.from({ length: 12 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[
          Math.floor(Math.random() * 57)
        ]
      ).join("");
    }

    // Use Supabase Admin API via the service client for auth user creation.
    const { getSupabaseServiceClient } = await import("@/lib/dbClient");
    const service = getSupabaseServiceClient();

    // Build the auth user
    const effectiveEmail =
      (email && String(email).trim()) ||
      `${String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, ".")}@jntuhcej.ac.in`;

    const { data: authUser, error: authErr } = await service.auth.admin.createUser({
      email: effectiveEmail,
      password: password && typeof password === "string" ? password : generatedPassword!,
      email_confirm: true,
      user_metadata: { name: String(name).trim(), role: String(role) },
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

    // Resolve uniqueId — auto ucej-p-NNNN when omitted
    let effectiveUniqueId = uniqueId || undefined;
    if (!effectiveUniqueId) {
      const { generateUceJUniqueId } = await import("@/lib/db");
      effectiveUniqueId = await generateUceJUniqueId("parent");
    }

    // Insert public.users profile
    const { error: profileErr } = await service.from("users").insert({
      id: userId,
      name: String(name).trim(),
      email: effectiveEmail,
      phone: phone || null,
      role: String(role),
      unique_id: effectiveUniqueId,
      login_identifier: effectiveUniqueId,
      status: "ACTIVE",
      initial_pin_hash: null,
    });

    if (profileErr) {
      console.error("Parent profile insert failed:", profileErr);
      // Roll back auth user
      await service.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: "PROFILE_CREATE_FAILED", message: profileErr.message } },
        { status: 500 }
      );
    }

    // Link to a student if requested
    let linkedStudent: { id: string; roll: string; name: string } | null = null;
    if (studentId && typeof studentId === "string") {
      const { data: stu } = await service
        .from("users")
        .select("id, name, unique_id")
        .eq("id", studentId)
        .maybeSingle();
      if (stu) {
        await linkParentToStudent(stu.id, userId, "sysadmin");
        linkedStudent = { id: stu.id, roll: stu.unique_id || stu.id, name: stu.name };
      }
    } else if (parentUserId) {
      // parentUserId is already created (this path is for the "pick existing parent" flow)
      // In practice, the linkParentToStudent call happens after the POST creates the user.
      // If parentUserId is provided alongside studentId, use it instead.
      const { data: stu } = await service
        .from("users")
        .select("id, name, unique_id")
        .eq("id", studentId)
        .maybeSingle();
      if (stu && parentUserId) {
        await linkParentToStudent(stu.id, parentUserId, "sysadmin");
        linkedStudent = { id: stu.id, roll: stu.unique_id || stu.id, name: stu.name };
      }
    }

    // If the caller just wanted to link an EXISTING parent to a student without creating a new one
    if (parentUserId && studentId && !authErr) {
      // The user was just created above; no need to re-link.
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userId,
        name: String(name).trim(),
        email: effectiveEmail,
        phone: phone || null,
        uniqueId: effectiveUniqueId,
        role: String(role),
        password: password && typeof password === "string" ? null : generatedPassword,
        linkedStudent,
      },
    });
  } catch (error) {
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
