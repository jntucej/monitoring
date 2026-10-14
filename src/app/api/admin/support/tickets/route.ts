import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const assignee = searchParams.get("assignee");

    const supabase = getSupabaseServiceClient();
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (assignee) query = query.eq("assigned_to", assignee);

    const { data: tickets, error } = await query;

    if (error || !tickets) {
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message } },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "admin_support_tickets", ...RATE_LIMITS.read },
);
