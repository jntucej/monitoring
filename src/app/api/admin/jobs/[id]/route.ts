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
    const { enabled } = await req.json().catch(() => ({}));

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "'enabled' boolean field is required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data: updated, error: updateErr } = await supabase
      .from("scheduled_jobs")
      .update({ enabled })
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
      action: enabled ? "JOB_ENABLED" : "JOB_DISABLED",
      details: { jobId, enabled },
    });

    return NextResponse.json({
      success: true,
      message: `Job '${jobId}' ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin"] });
