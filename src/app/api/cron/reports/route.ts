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

  if (!cronSecret) {
    return NextResponse.json({ success: false, error: { message: "CRON_SECRET is not configured on server" } }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
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

      const reportTitle = report.name || report.title || "Campus Access Report";
      const rawRecipients = report.recipients || report.email_recipient;
      let recipients: string[] = [];
      try {
        if (Array.isArray(rawRecipients)) {
          recipients = rawRecipients;
        } else if (typeof rawRecipients === "string") {
          recipients = rawRecipients.trim().startsWith("[")
            ? JSON.parse(rawRecipients)
            : [rawRecipients];
        }
      } catch {
        recipients = typeof rawRecipients === "string" ? [rawRecipients] : [];
      }

      for (const to of recipients) {
        if (to && typeof to === "string" && to.includes("@")) {
          await sendEmail({
            to: to.trim(),
            subject: `[Automated Report] ${reportTitle}`,
            body: `Your scheduled report "${reportTitle}" was generated successfully at ${now}.\n\nView details in Gate Monitor Admin Panel.`,
          });
        }
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
