import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getDbClient } from "@/lib/db";

async function handleGet(_req: NextRequest) {
  try {
    const { data: history } = await getDbClient()
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      success: true,
      data: history || [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });