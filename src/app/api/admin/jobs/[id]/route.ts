import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handlePatch(req: NextRequest) {
  const jobId = getIdFromPath(req);
  const actorId = req.headers.get("x-user-id") || "";

  try {
    const { enabled, cron_expression } = await req.json().catch(() => ({}));

    if (typeof enabled !== "boolean" && typeof cron_expression !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "'enabled' boolean and/or 'cron_expression' string field is required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const updatePayload: Record<string, unknown> = {};
    if (typeof enabled === "boolean") updatePayload.enabled = enabled;
    if (typeof cron_expression === "string" && cron_expression.trim()) updatePayload.cron_expression = cron_expression;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("scheduled_jobs")
      .update(updatePayload)
      .eq("id", jobId)
      .select();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: { code: "SERVER_ERROR", message: updateErr.message } },
        { status: 500 }
      );
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Job '${jobId}' not found` } },
        { status: 404 }
      );
    }

    await addAudit({
      userId: actorId,
      action: typeof enabled === "boolean" ? (enabled ? "JOB_ENABLED" : "JOB_DISABLED") : "JOB_SCHEDULE_UPDATED",
      details: { jobId, ...updatePayload },
    });

    return NextResponse.json({
      success: true,
      message: `Job '${jobId}' updated successfully`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: String(error) } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin", "admin"] });
