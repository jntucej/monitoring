import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withRateLimit } from "@/lib/rate-limit";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";

const DEFAULT_STUDENT_RULES = {
  curfew: {
    weekdayCurfew: "21:30",
    weekendCurfew: "22:00",
    morningEarliestExit: "06:00",
    lateEntryGraceMinutes: 15,
  },
  quotas: {
    maxDailyOutingsPerWeek: 4,
    maxHomeVisitsPerMonth: 2,
    maxOverdueGraceHours: 2,
  },
  approvals: {
    dayPassRequiresWarden: true,
    nightPassRequiresParentConsent: true,
    emergencyExitBypassesApproval: true,
  },
  notifications: {
    notifyParentOnExit: true,
    notifyParentOnEntry: true,
    notifyWardenOnLateReturn: true,
  },
};

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("campus_settings")
      .select("value")
      .eq("key", "student_rules")
      .maybeSingle();

    if (error || !data?.value) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_STUDENT_RULES,
      });
    }

    const rules = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return NextResponse.json({
      success: true,
      data: { ...DEFAULT_STUDENT_RULES, ...rules },
    });
  } catch (error: any) {
    console.error("[API] Error fetching student rules:", error);
    return NextResponse.json({
      success: true,
      data: DEFAULT_STUDENT_RULES,
    });
  }
}

async function handlePost(req: NextRequest, user?: { sub: string; role: Role; name?: string }) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase
      .from("campus_settings")
      .upsert({
        key: "student_rules",
        value: JSON.stringify(body),
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 }
      );
    }

    if (user) {
      await addAudit({
        action: "UPDATE_STUDENT_RULES",
        userId: user.sub,
        userName: user.name || "Admin",
        role: user.role,
        details: "Campus student entry/exit rules and curfew policies updated",
      });
    }

    return NextResponse.json({
      success: true,
      data: body,
      message: "Student rules updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGet, { limit: 100, windowMs: 60_000 });
export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
export const PUT = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
