import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import os from "os";
import fs from "fs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import { promQuery } from "@/lib/monitoring";

/**
 * GET /api/sysadmin/infrastructure
 *
 * Host-level infrastructure overview: uptime, load, memory, and disk usage.
 * Combines OS telemetry (available inside the container/worker host) with
 * PostgreSQL connection/lock stats and Prometheus node-exporter metrics when
 * reachable. Read-only, sysadmin + admin only.
 */
async function handleGet(_req: NextRequest) {
  const out: Record<string, unknown> = {};

  // OS-level stats (the web container shares the host's /proc/os info; if
  // running on the host directly this is accurate, otherwise it reflects the
  // container's cgroup limits when /proc/1/cgroup is readable).
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  out.host = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptimeSeconds: Math.round(os.uptime()),
    loadAvg: os.loadavg(),
    cpuCount: os.cpus().length,
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: totalMem - freeMem,
      usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
  };

  // Disk usage — read the host's /proc/1/root path when available; fall back
  // to a note when the container has no mount visibility.
  try {
    const rootDir = fs.realpathSync("/proc/1/root") || "/";
    const stats = fs.statfsSync(rootDir);
    out.disk = {
      path: rootDir,
      totalBytes: stats.blocks * stats.bsize,
      availableBytes: stats.bavail * stats.bsize,
      usedPercent: Math.round((1 - stats.bavail / stats.blocks) * 100),
    };
  } catch {
    out.disk = null;
  }

  // PostgreSQL connection + lock stats
  try {
    const connRes = await query<{ total: number; active: number; idle: number; max_conns: string }>(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE state = 'active')::int AS active,
        COUNT(*) FILTER (WHERE state = 'idle')::int AS idle,
        max_setting::text AS max_conns
      FROM pg_stat_activity,
      LATERAL (SELECT current_setting('max_connections')::text AS max_setting)`,
    );
    out.postgres = {
      connections: {
        total: connRes.rows[0]?.total ?? 0,
        active: connRes.rows[0]?.active ?? 0,
        idle: connRes.rows[0]?.idle ?? 0,
        maxConns: connRes.rows[0]?.max_conns ?? null,
      },
    };
  } catch {
    out.postgres = null;
  }

  // Prometheus node-exporter: CPU + memory + disk usage (best-effort)
  try {
    const cpu = await promQuery(
      `(1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100`
    );
    const mem = await promQuery(
      `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`
    );
    const disk = await promQuery(
      `(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100`
    );
    const first = (r: unknown) => {
      const arr = (r as { data?: { result?: Array<{ value?: [number, string] }> } }).data?.result ?? [];
      return arr.length > 0 ? Number(arr[0]?.value?.[1] ?? 0) : null;
    };
  out.prometheus = {
      reachable: true,
      cpuPercent: first(cpu),
      memoryPercent: first(mem),
      diskPercent: first(disk),
    };
  } catch {
    out.prometheus = { reachable: false };
  }

  return NextResponse.json({ success: true, data: out });
}

export const GET = withApiChain(handleGet, {
  route: "/api/sysadmin/infrastructure",
  auth: "user",
  requiredRole: ["sysadmin", "admin"],
  rateLimit: { keyPrefix: "sysadmin_infrastructure", maxRequests: 120 },
});
