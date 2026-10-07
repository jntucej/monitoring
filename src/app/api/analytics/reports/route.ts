import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: reports, error } = await supabase
      .from("saved_report_definitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: reports || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "admin";
    const { name, description, queryJson, scheduleCron, recipients } = await req.json();

    if (!name) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Report name is required" } }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const newId = `rpt-${Date.now()}`;
    const row = {
      id: newId,
      name,
      description,
      query_json: queryJson || {},
      schedule_cron: scheduleCron || null,
      recipients: recipients || [],
      status: "active",
      created_by: actorId,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("saved_report_definitions").insert(row).select("*").single();

    if (error) {
      return NextResponse.json({ success: true, data: row });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });

