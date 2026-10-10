import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { resolve } from "path";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

const ALLOWED_LOGS: Record<string, string> = {
  deploy: "/var/log/monitoring-deploy.log",
  heartbeat: "/var/log/monitoring-heartbeat.log",
  caddy: "/var/log/caddy/access.log",
};

async function handleGet(req: NextRequest, _context: { auth: AuthContext }) {
  const url = new URL(req.url);
  const logKey = url.searchParams.get("log") ?? "deploy";

  const path = ALLOWED_LOGS[logKey];
  if (!path) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: `Unknown log "${logKey}". Allowed: ${Object.keys(ALLOWED_LOGS).join(", ")}` } },
      { status: 400 }
    );
  }

  const resolved = resolve(path);
  if (!resolved.startsWith("/var/log/")) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid log path" } }, { status: 400 });
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");
    const lines = content.split("\n");
    const tail = lines.slice(-200);
    return NextResponse.json({ success: true, data: { log: logKey, lines: tail, total: lines.length } });
  } catch {
    return NextResponse.json({ success: true, data: { log: logKey, lines: ["Log file not yet initialized or empty."], total: 1 } });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "deployment_logs", maxRequests: 20 }
);
