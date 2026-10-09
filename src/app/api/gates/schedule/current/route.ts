/* eslint-disable @typescript-eslint/no-explicit-any */
 
 
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";

import { withAuthorization } from "@/middleware/authorization";
async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const dayOfWeek = now.getDay();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const { data: holidays } = await supabase.from("gate_holidays").select("*").eq("date", todayStr);
    if (holidays && holidays.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          isRestricted: true,
          reason: `Holiday Restriction (${holidays[0].name})`,
          currentRule: holidays[0],
          timestamp: now.toISOString(),
        },
      });
    }

    const { data: rules } = await supabase
      .from("gate_access_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    let isRestricted = false;
    let appliedRule: any = null;

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const days = Array.isArray(rule.days_of_week) ? rule.days_of_week : JSON.parse(rule.days_of_week || "[]");
        if (days.includes(dayOfWeek)) {
          if (currentTimeStr >= rule.start_time && currentTimeStr <= rule.end_time) {
            appliedRule = rule;
            if (rule.action === "restrict") isRestricted = true;
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isRestricted,
        reason: isRestricted ? `Restricted by rule: ${appliedRule?.rule_name || "Night Curfew"}` : "Gate open per standard operating hours",
        appliedRule,
        timestamp: now.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet);
