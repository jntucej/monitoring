import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/deployments?limit=N
 *
 * Deployment history parsed from /var/log/monitoring-deploy.log
 * (written by the host deploy watchdog under /opt/monitoring).
 *
 * Events returned (newest first):
 *   • "Update detected. Synced to <commit>. Deploying..."  → deploy attempt
 *   • "skipping deploy" / fatal git errors                 → skip/failure
 *   • "✓ Compiled successfully" / build failures           → build outcome
 *
 * Read-only; the log file may not exist on non-host dev environments —
 * in that case the endpoint returns an empty list with source=unavailable
 * and the UI falls back to the DevContactStrip note.
 *
 * SysAdmin + admin only.
 */
const DEPLOY_LOG = "/var/log/monitoring-deploy.log";

async function handleGet(req: NextRequest, _context: unknown) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);

  let content: string;
  try {
    content = await fs.readFile(/* turbopackIgnore: true */ DEPLOY_LOG, "utf-8");
  } catch {
    return NextResponse.json({
      success: true,
      data: { source: "unavailable", deployments: [] },
    });
  }

  const lines = content.split("\n");
  const deployments: Array<{
    timestamp: string | null;
    commit: string | null;
    status: "deploying" | "skipped" | "failed" | "git_error";
    detail: string;
  }> = [];

  let ts: string | null = null;
  for (const line of lines) {
    const tsMatch = line.match(/^\[(.+ IST)\] (.*)$/);
    if (tsMatch) {
      ts = tsMatch[1];
      const rest = tsMatch[2];
      const commitMatch = rest.match(/Synced to ([0-9a-f]{40})/);
      if (commitMatch) {
        deployments.push({
          timestamp: ts,
          commit: commitMatch[1].slice(0, 12),
          status: "deploying",
          detail: "Update detected — deploying",
        });
      } else if (/skipping deploy/i.test(rest)) {
        deployments.push({
          timestamp: ts,
          commit: null,
          status: "skipped",
          detail: rest.trim(),
        });
      } else if (/fatal: (Not possible to fast-forward|Diverging)/i.test(line)) {
        deployments.push({
          timestamp: ts,
          commit: null,
          status: "git_error",
          detail: rest.trim(),
        });
      }
    } else if (/did not complete successfully: exit code: 1/.test(line)) {
      deployments.push({
        timestamp: ts,
        commit: null,
        status: "failed",
        detail: "Build failed (npm run build exit 1)",
      });
      ts = null;
    }
  }

  // Newest first, de-duped, capped
  const seen = new Set<string>();
  const out: typeof deployments = [];
  for (let i = deployments.length - 1; i >= 0; i--) {
    const d = deployments[i];
    const id = `${d.timestamp}|${d.status}|${d.commit ?? d.detail}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(d);
    if (out.length >= limit) break;
  }

  return NextResponse.json({
    success: true,
    data: { source: "host-deploy-log", deployments: out },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_deployments", maxRequests: 60 }
);
