import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

const DEFAULT_JOBS = [
  {
    id: "backfill_daily_stats",
    name: "Daily Gate Statistics Aggregation",
    description: "Aggregates entry/exit statistics per gate every midnight",
    cron_expression: "0 0 * * *",
    enabled: true,
    last_run: null,
    next_run: null,
  },
  {
    id: "cleanup_expired_passes",
    name: "Cleanup Expired Gate Passes",
    description: "Archives approved outpasses once their validity window ends",
    cron_expression: "0 * * * *",
    enabled: true,
    last_run: null,
    next_run: null,
  },
  {
    id: "audit_log_rotation",
    name: "Audit Log Rotation Report",
    description: "Weekly audit log volume report (archive partitioning runs in Postgres)",
    cron_expression: "0 2 * * 0",
    enabled: true,
    last_run: null,
    next_run: null,
  },
];

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    let dbJobs = null; let jobsErr = null;
    try { const res = await supabase.from("scheduled_jobs").select("*"); dbJobs = res.data; jobsErr = res.error; } catch(e) { jobsErr = true; }
    const { data: dbRuns, error: runsErr } = await supabase
      .from("job_runs")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(10);

    const jobs = dbJobs && dbJobs.length > 0 ? dbJobs : DEFAULT_JOBS;
    const runs = dbRuns || [];

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        recentRuns: runs,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      data: {
        jobs: DEFAULT_JOBS,
        recentRuns: [],
      },
    });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
