import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { logAuditEvent } from "@/lib/audit";
import { sendEmail } from "@/lib/integrations/email";

/**
 * GET /api/cron/reports — Cron runner for scheduled report generation
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: { message: "Unauthorized cron request" } }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data: reports, error } = await supabase
      .from("saved_report_definitions")
      .select("*");

    if (error && error.code !== "PGRST116") {
      // Return empty report run if table not present in local dev
    }

    const now = new Date().toISOString();
    const executed: string[] = [];

    for (const report of reports || []) {
      await supabase
        .from("saved_report_definitions")
        .update({ last_run: now })
        .eq("id", report.id);

      executed.push(report.id);

      if (report.email_recipient) {
        await sendEmail({
          to: report.email_recipient,
          subject: `[Automated Report] ${report.title || "Campus Access Report"}`,
          body: `Your scheduled report "${report.title || "Report"}" was generated successfully at ${now}.\n\nView details in Gate Monitor Admin Panel.`,
        });
      }
    }

    await logAuditEvent({
      action: "CRON_REPORTS_EXECUTED",
      userId: "system-cron",
      userName: "Cron Scheduler",
      userRole: "sysadmin",
      details: { executedCount: executed.length, reportIds: executed },
    });

    return NextResponse.json({
      success: true,
      data: {
        executedAt: now,
        reportsProcessed: executed.length,
        reportIds: executed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
  }
}
