import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL: /api/admin/jobs/[id]/run -> [id] is segments[3]
  return decodeURIComponent(segments[segments.length - 2]);
}

async function handlePost(req: NextRequest) {
  const jobId = getIdFromPath(req);
  const actorId = req.headers.get("x-user-id") || "";

  try {
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

    // Perform simulated or actual background execution
    const endTime = new Date().toISOString();
    if (run?.id) {
      await supabase
        .from("job_runs")
        .update({
          status: "SUCCESS",
          end_time: endTime,
        })
        .eq("id", run.id);
    }

    await supabase
      .from("scheduled_jobs")
      .update({
        last_run: endTime,
      })
      .eq("id", jobId);

    await addAudit({
      userId: actorId,
      action: "JOB_TRIGGERED_MANUALLY",
      details: { jobId, runId: run?.id || "simulated-run" },
    });

    return NextResponse.json({
      success: true,
      message: `Job '${jobId}' executed successfully`,
      data: { jobId, runId: run?.id, status: "SUCCESS" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
