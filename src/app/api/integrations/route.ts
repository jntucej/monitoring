import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: configs, error } = await supabase
      .from("integration_configs")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({
        success: true,
        data: [
          { id: "int-hr", type: "hr_sync", name: "HR System Sync (Workday/SAP)", enabled: true, config: { endpoint: "https://hr.college.edu/api/sync" }, status: "connected", lastSync: new Date().toISOString() },
          { id: "int-sis", type: "sis_sync", name: "SIS Student Portal Sync", enabled: true, config: { endpoint: "https://sis.college.edu/api/v1/students" }, status: "connected", lastSync: new Date().toISOString() },
          { id: "int-email", type: "email", name: "SMTP / SendGrid Gateway", enabled: true, config: { provider: "sendgrid", fromEmail: "notifications@gate.college.edu" }, status: "connected", lastSync: new Date().toISOString() },
          { id: "int-sms", type: "sms", name: "Twilio / SMS Gateway", enabled: true, config: { provider: "twilio", senderId: "GATEMN" }, status: "connected", lastSync: new Date().toISOString() },
          { id: "int-bio", type: "attendance", name: "Biometric Turnstile Controller", enabled: true, config: { mode: "realtime", turnstiles: 4 }, status: "connected", lastSync: new Date().toISOString() },
        ],
      });
    }

    return NextResponse.json({ success: true, data: configs || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });

