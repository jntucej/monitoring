// src/app/api/users/bulk/commit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { commitImport, validateImport } from "@/lib/user-import";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  let rows = body.rows;
  if (!rows && body.csv) {
    const val = await validateImport(body.csv);
    rows = val.rows;
  }
  const result = await commitImport(rows || [], context.auth.userId, body.skipErrors !== false);
  return NextResponse.json(result);
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
