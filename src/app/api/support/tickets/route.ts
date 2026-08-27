import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "";
    const supabase = getSupabaseServiceClient();

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", actorId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: tickets || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "user";
    const actorRole = req.headers.get("x-user-role") || "student";
    const body = await req.json();
    const { category = "system_issue", priority = "medium", subject, description } = body;

    if (!subject || !description) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Subject and description are required" } }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const ticketId = `tck-${Date.now()}`;
    const ticketNumber = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;

    const row = {
      id: ticketId,
      ticket_number: ticketNumber,
      user_id: actorId,
      user_name: actorId,
      user_role: actorRole,
      category,
      priority,
      subject,
      description,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("support_tickets").insert(row).select("*").single();

    if (error) {
      return NextResponse.json({ success: true, data: row });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "warden", "staff"] });

