/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withTransaction } from "@/lib/postgres";
import { getDepartments, createDepartment, deleteDepartment, updateDepartment } from "@/lib/departments";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { Role } from '@/lib/types';
import type { AuthContext } from '@/lib/authContext';
import { listDepartments } from "@/server/services/departments/list";
import { ok } from "@/server/http/response";

async function handleGet() {
  const result = await listDepartments();
  return ok(result.departments);
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json();
    const { code, name, numericCode, shortName, hodUserId } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: { message: "Department Code and Name are required" } }, { status: 400 });
    }

    const svc = getSupabaseServiceClient();

    // Check if exists
    const { data: existing } = await svc.from("departments").select("id").eq("code", code).maybeSingle();

    if (existing) {
        await updateDepartment(code, { name, numericCode, shortName });
    } else {
        await createDepartment({ code, name, numericCode, shortName });
    }

    // Atomic HOD reassignment
    if (hodUserId) {
      await withTransaction(async (db) => {
        // Clear previous HOD
        await db.query(`
          UPDATE public.employee_details ed
          SET is_hod = FALSE
          FROM public.users u
          WHERE ed.user_id = u.id AND u.department_id = $1 AND ed.is_hod = TRUE
        `, [code]);
        // Set new HOD
        await db.query(`
          UPDATE public.employee_details
          SET is_hod = TRUE, department_id = $1
          WHERE user_id = $2
        `, [code, hodUserId]);
      }, { currentUserId: auth.userId });
    }

    await addAudit({
      action: "DEPARTMENT_UPSERT",
      userId: auth.userId,
      userName: auth.email || "SysAdmin",
      role: auth.role,
      details: `Saved department '${code}' (${name}).`,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e.message } }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Missing department code" } }, { status: 400 });
  }

  try {
    await deleteDepartment(code);
    await addAudit({
      action: "DEPARTMENT_DELETED",
    userId: auth.userId,
    userName: auth.email,
    role: auth.role,
    details: `Deleted department '${code}'.`,
  });
  return NextResponse.json(
    { success: true, message: `Deleted department ${code}` },
    { headers: { "Cache-Control": "no-store" } }
  );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 400 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const PATCH = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
export const DELETE = withAuthorization(handleDelete, { requiredRole: ["sysadmin"] });

export const GET = withAuthorization(handleGet);
