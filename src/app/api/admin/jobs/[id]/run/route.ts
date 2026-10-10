import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { executeJob, hasRealImplementation } from "@/lib/jobs";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL: /api/admin/jobs/[id]/run -> [id] is segments[3]
  return decodeURIComponent(segments[segments.length - 2]);
}

async function handlePost(req: NextRequest) {
  const jobId = getIdFromPath(req);
  const actorId = req.headers.get("x-user-id") || "";

  try {
    if (!hasRealImplementation(jobId)) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_IMPLEMENTED", message: `Job '${jobId}' has no executable implementation` } },
        { status: 501 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const startTime = new Date().toISOString();

    // Record job execution start
    const { data: run, error: runErr } = await supabase
      .from("job_runs")
      .insert({
        job_id: jobId,
        status: "RUNNING",
        start_time: startTime,
      })
      .select()
      .single();

    if (runErr || !run?.id) {
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: runErr?.message || "Could not record job run" } },
        { status: 500 }
      );
    }

    // Execute the REAL handler — failures must surface as FAILED runs.
    try {
      const result = await executeJob(jobId);
      const endTime = new Date().toISOString();

      await supabase
        .from("job_runs")
        .update({ status: "SUCCESS", end_time: endTime, records_affected: result.recordsAffected })
        .eq("id", run.id);

      await supabase.from("scheduled_jobs").update({ last_run: endTime }).eq("id", jobId);

      // await addAudit({
        userId: actorId,
        action: "JOB_TRIGGERED_MANUALLY",
        details: { jobId, runId: run.id, recordsAffected: result.recordsAffected, summary: result.details },
      });

      return NextResponse.json({
        success: true,
        message: `Job '${jobId}' completed`,
        data: { jobId, runId: run.id, status: "SUCCESS", ...result },
      });
    } catch (jobError: unknown) {
      const endTime = new Date().toISOString();
      const detail = jobError instanceof Error ? jobError.message : String(jobError);
      await supabase
        .from("job_runs")
        .update({ status: "FAILED", end_time: endTime, error_message: detail.slice(0, 500) })
        .eq("id", run.id);
      throw jobError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: { code: "JOB_FAILED", message } },
      { status: 500 }
    );
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
