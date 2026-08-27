import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const [resRules, resHolidays] = await Promise.all([
      supabase.from("gate_access_rules").select("*").order("priority", { ascending: false }),
      supabase.from("gate_holidays").select("*").order("date", { ascending: true }),
    ]);

    const rules = resRules.data || [
      { id: "rule-default-main", gate_id: "ALL", rule_name: "Standard Campus Operating Hours", days_of_week: [1,2,3,4,5,6], start_time: "06:00", end_time: "22:00", action: "allow", priority: 1, is_active: true },
      { id: "rule-night-curfew", gate_id: "ALL", rule_name: "Night Curfew Restricted Access", days_of_week: [0,1,2,3,4,5,6], start_time: "22:01", end_time: "05:59", action: "restrict", priority: 2, is_active: true },
    ];

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
      await supabase.from("gate_holidays").insert(row);
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

    await supabase.from("gate_access_rules").insert(row);
    return NextResponse.json({ success: true, data: row });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });

