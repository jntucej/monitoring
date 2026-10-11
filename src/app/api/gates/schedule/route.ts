import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { listGateSchedules } from "@/server/services/gate-schedules/list";

// Re-using original handleGet logic as it fetches MORE than just schedules (rules + holidays)
// Only replacing the scheduling part if it was isolated, but it is integrated.
// Sticking to original logic to avoid breaking response shape.

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const [resRules, resHolidays] = await Promise.all([
      supabase.from("gate_access_rules").select("*").order("priority", { ascending: false }),
      supabase.from("gate_holidays").select("*").order("date", { ascending: true }),
    ]);

    const rules = resRules.data || [];

    return NextResponse.json({
      success: true,
      data: {
        rules,
        holidays: resHolidays.data || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    if (body.type === "holiday") {
      const row = {
        id: `hol-${Date.now()}`,
        date: body.date,
        name: body.name,
        gate_id: body.gate_id || "ALL",
        restricted: true,
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("gate_holidays").insert(row);
    if (error) {
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
    }
      return NextResponse.json({ success: true, data: row });
    }

    const row = {
      id: `rule-${Date.now()}`,
      gate_id: body.gate_id || "ALL",
      rule_name: body.rule_name,
      days_of_week: body.days_of_week || [0,1,2,3,4,5,6],
      start_time: body.start_time || "06:00",
      end_time: body.end_time || "22:00",
      action: body.action || "allow",
      priority: body.priority || 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("gate_access_rules").insert(row);
    if (error) {
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });
