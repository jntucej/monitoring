import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";

async function handleGet(_req: NextRequest) {
  try {
    const data: Record<string, unknown> = {};

    // 1. Container health
    try {
      const { execSync } = await import("child_process");
      const raw = execSync("docker ps --format '{{.Names}}\\t{{.Status}}' 2>/dev/null", {
        timeout: 5000,
        encoding: "utf-8",
      });
      const containers: Array<{ name: string; running: boolean; status: string }> =
        raw.trim().split("\n").filter(Boolean).map((line) => {
          const [name, status] = line.split("\t");
          return {
            name: name ?? "unknown",
            running: status?.includes("Up") ?? false,
            status: status ?? "unknown",
          };
        });
      data.containers = {
        total: containers.length,
        running: containers.filter((c) => c.running).length,
        list: containers,
      };
    } catch {
      data.containers = { error: "docker not available" };
    }

    // 2. Gate jobs health
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const gjPath = join(
        "/opt/hermes-data",
        "gate-jobs-health.jsonl"
      );
      const lines = readFileSync(gjPath, "utf-8").trim().split("\n").filter(Boolean);
      const latest = lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null;
      data.gateJobs = latest ?? { error: "no data" };
    } catch {
      data.gateJobs = { error: "gate-jobs-health.jsonl not found" };
    }

    // 3. Findings summary
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const fPath = join(
        "/opt/hermes-data",
        "findings.json"
      );
      const findings: Array<{
        id: string;
        title: string;
        severity: string;
        status: string;
      }> = JSON.parse(readFileSync(fPath, "utf-8"));
      const byStatus: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      for (const f of findings) {
        byStatus[f.status ?? "UNKNOWN"] = (byStatus[f.status ?? "UNKNOWN"] ?? 0) + 1;
        bySeverity[f.severity ?? "P?"] = (bySeverity[f.severity ?? "P?"] ?? 0) + 1;
      }
      data.findings = {
        total: findings.length,
        byStatus,
        bySeverity,
        active: findings.filter(
          (f) => !["RESOLVED", "FALSE_POSITIVE", "ACCEPTED"].includes(f.status)
        ),
      };
    } catch {
      data.findings = { error: "findings.json not found" };
    }

    // 4. Deployment state
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const statePath = join(
        "/opt/hermes-data",
        "deployment-state.json"
      );
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      data.deployment = state;
    } catch {
      data.deployment = { error: "deployment-state.json not found" };
    }

    // 5. Backup health
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const bPath = join(
        "/opt/hermes-data",
        "backup-health.jsonl"
      );
      const lines = readFileSync(bPath, "utf-8").trim().split("\n").filter(Boolean);
      const latest = lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null;
      data.backup = latest ?? { error: "no data" };
    } catch {
      data.backup = { error: "backup-health.jsonl not found" };
    }

    // 6. Mode events
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const mPath = join(
        "/opt/hermes-data",
        "mode-events.jsonl"
      );
      const lines = readFileSync(mPath, "utf-8").trim().split("\n").filter(Boolean);
      const latest = lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null;
      data.gateMode = latest ?? { error: "no data" };
    } catch {
      data.gateMode = { error: "mode-events.jsonl not found" };
    }

    return ok(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(withRateLimit(handleGet), {
  requiredRole: ["sysadmin", "admin"],
});

export const POST = withMutationGuard(handleGet, {
  requiredRole: ["sysadmin", "admin"],
});
