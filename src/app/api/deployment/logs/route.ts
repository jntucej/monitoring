import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const logPath = "/var/log/monitoring-deploy.log";
    // Read the log file
    const logContent = await fs.readFile(logPath, "utf-8");
    // Get the last 50 lines
    const lines = logContent.split("\n");
    const lastLines = lines.slice(-50).join("\n");
    
    return NextResponse.json({ success: true, data: lastLines });
  } catch (error) {
    console.error("Error fetching deployment logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin'] }),
  { keyPrefix: 'deploy_logs_list', maxRequests: 10 }
);
