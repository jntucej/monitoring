import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { findAllPersons, searchPersons, findPersonByUniqueId, findPersonsByType, getLinkedPersons, mPerson } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { Person, PersonType } from "@/lib/types";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

async function handleGet(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const authRole = req.headers.get("x-user-role");
    const authUserId = req.headers.get("x-user-id");
    const params = req.nextUrl.searchParams;
    const uniqueId = params.get("uniqueId") || params.get("roll");
    const q = params.get("q");
    const type = params.get("type") as PersonType | null;
    let parentId = params.get("guardianId") || params.get("parentId");

    // Force parentId to be the user's own ID if client role is parent or guardian to prevent tampering
    if (authRole === "parent" || authRole === "guardian") {
      parentId = authUserId;
    }

    if (parentId) {
      if (authRole !== "admin" && authRole !== "sysadmin" && authUserId !== parentId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only access your own linked persons." } },
          { status: 403 }
        );
      }
      const children = await getLinkedPersons(parentId);
      return NextResponse.json({ success: true, data: children });
    }

    if (uniqueId) {
      const person = await findPersonByUniqueId(uniqueId);
      if (!person) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Person not found" } },
          { status: 404 }
        );
      }

      // Privileged roles can view any person details
      if (["operator", "admin", "sysadmin"].includes(authRole || "")) {
        return NextResponse.json({ success: true, data: person });
      }

      // For faculty/staff/parent/student: ensure self-lookup
      const isSelf = authUserId && (
        authUserId === person.id ||
        authUserId === person.uniqueId ||
        authUserId === person.employeeDetails?.employeeId
      );
      if (isSelf) {
        return NextResponse.json({ success: true, data: person });
      }

      if (authRole === "faculty" && authUserId) {
        const { findUserById } = await import("@/lib/db");
        const callingUser = await findUserById(authUserId);
        if (callingUser?.isHod && callingUser.departmentId && callingUser.departmentId === person.department) {
          return NextResponse.json({ success: true, data: person });
        }
      }

      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to view this profile." } },
        { status: 403 }
      );
    }

    if (q) {
      if (!["admin", "sysadmin", "operator"].includes(authRole || "")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to search persons." } },
          { status: 403 }
        );
      }
      const data = await searchPersons(q, type || undefined);
      return NextResponse.json({ success: true, data });
    }

    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to list persons." } },
        { status: 403 }
      );
    }

    const data = type ? await findPersonsByType(type) : await findAllPersons();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Error fetching person data:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load persons" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can create persons." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { uniqueId, fullName, personType, department, designation, email, phone } = body || {};

    if (!uniqueId || !fullName || !personType) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "uniqueId, fullName, and personType are required." } },
        { status: 400 }
      );
    }

    const cleanEmail = email?.trim().toLowerCase() || `${uniqueId.trim().toLowerCase()}@jntuhcej.ac.in`;
    const tempPassword = randomBytes(16).toString("hex") + "Aa1!";
    const service = getSupabaseServiceClient();

    const { data: authData, error: authErr } = await service.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: String(fullName).trim(), role: personType, unique_id: uniqueId.trim().toUpperCase() },
    });

    if (authErr || !authData?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "AUTH_ERROR", message: authErr?.message || "Failed to create authentication account" } },
        { status: 500 }
      );
    }

    const id = authData.user.id;
    const userRow = {
      id,
      unique_id: uniqueId.trim().toUpperCase(),
      handle: (cleanEmail || uniqueId).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      name: String(fullName).trim(),
      role: personType,
      email: cleanEmail,
      phone: phone || null,
      department_id: department || null,
      status: "ACTIVE",
      login_identifier: uniqueId.trim().toUpperCase(),
    };

    const { data: newUser, error } = await service.from("users").insert(userRow).select().single();
    if (error || !newUser) {
      await service.auth.admin.deleteUser(id).catch(() => {});
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error?.message || "Database insert failed" } },
        { status: 500 }
      );
    }

    if (["faculty", "staff", "worker"].includes(personType)) {
      await service.from("employee_details").upsert({
        user_id: id,
        employee_id: uniqueId.trim().toUpperCase(),
        designation: designation || null,
        department_id: department || null,
      }, { onConflict: "user_id" });
    } else if (personType === "student") {
      await service.from("student_details").upsert({
        user_id: id,
        roll: uniqueId.trim().toUpperCase(),
        department_id: department || null,
      }, { onConflict: "user_id" });
    }

    return NextResponse.json({ success: true, data: mPerson(newUser) });
  } catch (error: unknown) {
    console.error("Error creating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create person" } },
      { status: 500 }
    );
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can update persons." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, uniqueId, ...updates } = body;
    if (!id && !uniqueId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Person id or uniqueId required." } },
        { status: 400 }
      );
    }

    const userUpdates: any = {};
    if (updates.fullName !== undefined) userUpdates.name = updates.fullName;
    if (updates.full_name !== undefined) userUpdates.name = updates.full_name;
    if (updates.name !== undefined) userUpdates.name = updates.name;

    if (updates.personType !== undefined) userUpdates.role = updates.personType;
    if (updates.person_type !== undefined) userUpdates.role = updates.person_type;
    if (updates.role !== undefined) userUpdates.role = updates.role;

    if (updates.email !== undefined) userUpdates.email = updates.email;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone;

    if (updates.department !== undefined) userUpdates.department_id = updates.department;
    if (updates.department_id !== undefined) userUpdates.department_id = updates.department_id;

    if (updates.status !== undefined) {
      const upStatus = updates.status.toUpperCase();
      if (["ACTIVE", "LOCKED", "SUSPENDED", "DISABLED", "DEPROVISIONED"].includes(upStatus)) {
        userUpdates.status = upStatus;
      } else if (upStatus === "INACTIVE" || upStatus === "IN-ACTIVE") {
        userUpdates.status = "DISABLED";
      }
    }

    const service = getSupabaseServiceClient();
    let query = service.from("users").update(userUpdates);
    if (id) query = query.eq("id", id);
    else query = query.eq("unique_id", uniqueId);

    const { data: updatedUser, error } = await query.select().single();
    if (error || !updatedUser) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error?.message || "Database update failed" } },
        { status: 500 }
      );
    }

    if (updates.designation !== undefined) {
      await service
        .from("employee_details")
        .update({ designation: updates.designation })
        .eq("user_id", updatedUser.id);
    }

    return NextResponse.json({ success: true, data: mPerson(updatedUser) });
  } catch (error: unknown) {
    console.error("Error updating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update person" } },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only admins can delete persons." } },
        { status: 403 }
      );
    }

    const params = req.nextUrl.searchParams;
    const id = params.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Person id is required." } },
        { status: 400 }
      );
    }

    const service = getSupabaseServiceClient();
    const { error } = await service.from("users").update({ status: "DISABLED" }).eq("id", id);
    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Person deactivated successfully" });
  } catch (error: unknown) {
    console.error("Error deactivating person:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to deactivate person" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["operator", "admin", "sysadmin", "parent", "faculty", "staff"] }),
  { keyPrefix: "persons_get", maxRequests: 100 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_post", maxRequests: 30 }
);

export const PATCH = withRateLimit(
  withAuthorization(handlePatch, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_patch", maxRequests: 30 }
);

export const DELETE = withRateLimit(
  withAuthorization(handleDelete, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "persons_delete", maxRequests: 30 }
);
