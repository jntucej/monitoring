// src/app/api/users/bulk/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { validateImport } from "@/lib/user-import";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const csv = body.csv || body.content || body.rows;
    if (!csv) {
      return NextResponse.json({ success: false, error: { message: "No CSV content supplied" } }, { status: 400 });
    }
    const result = await validateImport(csv);
    return NextResponse.json({ success: true, data: result, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message || "Validation failed" } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
