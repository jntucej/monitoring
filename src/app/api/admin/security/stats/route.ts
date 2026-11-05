import { errMsg } from "@/lib/err-msg";
import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSecurityStats } from "@/lib/security";

async function handleGet() {
  try {
    const stats = await getSecurityStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "principal", "operator", "worker", "supervisor"] });
