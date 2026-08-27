import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { supabase } from "@/lib/supabaseClient";

async function handleGet(req: NextRequest) {
  try {
    const { data: history } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      success: true,
      data: history || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });