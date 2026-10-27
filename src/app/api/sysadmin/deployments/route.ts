// src/app/api/sysadmin/deployments/route.ts
// Reads deployment history from the `deployments` DB table.
// CI writes to this table via POST /api/admin/deployments.
// The response shape is preserved so the sysadmin UI needs no changes.

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * GET /api/sysadmin/deployments?limit=N
 *
 * Returns recent deployment events from the `deployments` table, newest first.
 * Falls back to source=unavailable when the table does not exist yet
 * (e.g. the migration has not been applied).
 *
 * SysAdmin + admin only.
 */

interface DeploymentRow {
  timestamp: string | null;
  commit: string | null;
  status: "deploying" | "skipped" | "failed" | "git_error";
  detail: string;
}

async function handleGet(req: NextRequest, _context: unknown) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);

  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("deployments")
    .select("id, version, deployed_at, message, source, commit")
    .order("deployed_at", { ascending: false })
    .limit(limit);

  // Table missing (migration not applied) → return empty with a clear source.
  if (error) {
    return NextResponse.json({
      success: true,
      data: { source: "log-unavailable", deployments: [] },
    });
  }

  const rows: DeploymentRow[] = (data ?? []).map((r) => {
    const rec = r as Record<string, unknown>;
    const commit = (rec.commit as string | null) ?? null;
    const version = (rec.version as string | null) ?? null;
    const detail = (rec.message as string | null)
      ?? (version ? `Deployed version ${version}` : "Deployment");
    const src = (rec.source as string | null) ?? "ci";
    // Map the DB source to the UI status enum.
    // CI rows are "deploying" unless the message suggests failure.
    let status: DeploymentRow["status"] = "deploying";
    const msg = (rec.message as string | null) ?? "";
    if (/fail|error|fatal/i.test(msg)) status = "failed";
    else if (/skip/i.test(msg)) status = "skipped";
    else if (/git/i.test(msg) || /diverg/i.test(msg)) status = "git_error";
    void src;

    return {
      timestamp: (rec.deployed_at as string | null) ?? null,
      commit: commit ? commit.slice(0, 12) : null,
      status,
      detail,
    };
  });

  return NextResponse.json({
    success: true,
    data: { source: "deployments-db", deployments: rows },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_deployments", maxRequests: 60 },
);
