// src/app/api/users/bulk/commit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { commitImport, validateImport } from "@/lib/user-import";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => ({}));
    let rows = body.rows;
    if (!rows && body.csv) {
      const val = await validateImport(body.csv);
      rows = val.rows;
    }
    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ success: false, error: { message: "Invalid rows array" } }, { status: 400 });
    }
    const result = await commitImport(rows, context.auth.userId, body.skipErrors !== false);
    return NextResponse.json({ success: true, data: result, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Commit failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
