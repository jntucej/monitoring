import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/backup-status
 *
 * Cron backup status sourced from /opt/monitoring/backups (written by the
 * host backup cron): daily dump listings with timestamps + sizes, the
 * newest dump, its age in hours, and a staleness flag (>24h).
 *
 * On non-host environments the directory may be absent — the endpoint then
 * reports source=unavailable.
 *
 * SysAdmin + admin only, read-only.
 */
const BACKUP_ROOT = "/opt/monitoring/backups";

async function listRecent(dir: string, limit: number) {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const out: Array<{ name: string; mtime: string; sizeBytes: number }> = [];
  for (const name of entries) {
    try {
      const stat = await fs.stat(`${dir}/${name}`);
      if (stat.isFile()) {
        out.push({ name, mtime: stat.mtime.toISOString(), sizeBytes: stat.size });
      }
    } catch {
      // ignore unreadable entries
    }
  }
  out.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return out.slice(0, limit);
}

async function handleGet(_req: NextRequest, _context: unknown) {
  const result: Record<string, unknown> = {
    source: "unavailable",
    lastBackup: null,
    lastBackupAgeHours: null,
    stale: false,
    daily: [],
    weekly: [],
  };

  try {
    await fs.access(BACKUP_ROOT);
  } catch {
    // Directory absent — return unavailable cleanly
    return NextResponse.json({ success: true, data: result });
  }
  result.source = "host-backup-dir";

  const daily = await listRecent(`${BACKUP_ROOT}/daily`, 10);
  const weekly = await listRecent(`${BACKUP_ROOT}/weekly`, 5);
  result.daily = daily ?? [];
  result.weekly = weekly ?? [];

  const all = [...(daily ?? []), ...(weekly ?? [])];
  if (all.length > 0) {
    const newest = all[0];
    const ageHours = (Date.now() - Date.parse(newest.mtime)) / 3_600_000;
    result.lastBackup = { ...newest };
    result.lastBackupAgeHours = Math.round(ageHours * 10) / 10;
    result.stale = ageHours > 24;
  }

  return NextResponse.json({ success: true, data: result });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_backup_status", maxRequests: 60 }
);
