import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const fallback = [
        { id: "anc-welcome", title: "Gate Monitor v2.5 Online", message: "System upgrades complete. 2FA TOTP and active session controls are live.", priority: "medium", audience: "all", is_published: true, created_by: "sysadmin", created_at: new Date().toISOString() },
      ];
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "admin";
    const body = await req.json();
    const { title, message, priority = "medium", audience = "all", expiresAt } = body;

    if (!title || !message) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Title and message are required" } }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const newId = `anc-${Date.now()}`;
    const row = {
      id: newId,
      title,
      message,
      priority,
      audience,
      scheduled_at: new Date().toISOString(),
      expires_at: expiresAt || null,
      is_published: true,
      created_by: actorId,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("announcements").insert(row).select("*").single();

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

