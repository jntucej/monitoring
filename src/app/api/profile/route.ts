// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

/* ------------------------------------------------------------------ *
 *  GET /api/profile — return the caller's own profile
 * ------------------------------------------------------------------ */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();

  const { data: user, error } = await supabase
    .from("users")
    .select(`
      id, name, email, phone, role, status, account_status, unique_id,
      photo_url, department_id, login_identifier,
      two_factor_enabled, created_at,
      student_details ( roll, year, section, batch, hostel_block, room_number, gender, student_type ),
      employee_details ( employee_id, designation, department_id, staff_category )
    `)
    .eq("id", context.auth.userId)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
  }

  const rawStudent = (user as any).student_details;
  const rawEmployee = (user as any).employee_details;

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status || (user as any).account_status || "ACTIVE",
      uniqueId: user.unique_id,
      photoUrl: user.photo_url,
      departmentId: user.department_id,
      loginIdentifier: user.login_identifier,
      twoFactorEnabled: !!user.two_factor_enabled,
      createdAt: user.created_at,
      studentDetails: Array.isArray(rawStudent) ? rawStudent[0] : rawStudent,
      employeeDetails: Array.isArray(rawEmployee) ? rawEmployee[0] : rawEmployee,
    },
  });
}

/* ------------------------------------------------------------------ *
 *  PATCH /api/profile — update the caller's own name / phone / photo
 *  Deliberately does NOT allow: role, status, email, unique_id,
 *  password, pin. Those go through their own hardened endpoints.
 * ------------------------------------------------------------------ */
async function handlePatch(req: NextRequest, context: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => ({}));

  const updates: Record<string, any> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ success: false, error: "Name must be 2–100 characters" }, { status: 400 });
    }
    updates.name = name;
  }

  if (typeof body.phone === "string") {
    const phone = body.phone.trim();
    if (phone && !/^[+\d][\d\s\-()]{6,20}$/.test(phone)) {
      return NextResponse.json({ success: false, error: "Invalid phone number" }, { status: 400 });
    }
    updates.phone = phone || null;
  }

  if (typeof body.photoUrl === "string") {
    updates.photo_url = body.photoUrl || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: false, error: "No updatable fields supplied" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", context.auth.userId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  /* await addAudit({
    action: "USER_UPDATED",
    userId: context.auth.userId,
    userName: updates.name ?? context.auth.email,
    role: context.auth.role,
    details: { selfUpdate: true, fields: Object.keys(updates) },
  }); */

  return NextResponse.json({ success: true, data: updates });
}

export const GET = withAuthorization(handleGet);
export const PATCH = withAuthorization(handlePatch);
