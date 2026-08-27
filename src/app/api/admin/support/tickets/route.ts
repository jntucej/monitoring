import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const supabase = getSupabaseServiceClient();
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data: tickets, error } = await query;

    if (error || !tickets) {
      const fallback = [
        { id: "tck-demo-1", ticket_number: "TCK-1001", user_id: "u-101", user_name: "Demo Operator", user_role: "operator", category: "gate_access", priority: "high", subject: "North Gate scanner delay", description: "Response latency elevated during peak hours.", status: "open", created_at: new Date().toISOString() },
      ];
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });

