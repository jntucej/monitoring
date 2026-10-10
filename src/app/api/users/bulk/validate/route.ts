// src/app/api/users/bulk/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { validateImport } from "@/lib/user-import";

async function handlePost(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const csv = body.csv || body.csvText || body.content || "";
  const result = await validateImport(csv);
  return NextResponse.json(result);
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
