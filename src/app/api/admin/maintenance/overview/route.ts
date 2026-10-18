// src/app/api/admin/maintenance/overview/route.ts
// GET /api/admin/maintenance/overview
// Maintenance windows Gantt + KPIs.
//
// No maintenance table confirmed in the codebase (grep results are all
// unrelated — caretaker tickets, digital-twin status string). The route
// below issues a guarded query against a conventionally-named
// `maintenance_windows` table and returns an empty documented structure
// when the table does not exist, so the UI can render a
// "no windows scheduled" state.
//
// Expected schema (when created):
//   maintenance_windows
//   -------------------
//   id            TEXT PRIMARY KEY
//   title         TEXT NOT NULL
//   type          TEXT NOT NULL  -- 'scheduled' | 'ad-hoc' | 'emergency'
//   status        TEXT NOT NULL  -- 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
//   window_start  TIMESTAMPTZ
//   window_end    TIMESTAMPTZ
//   notifications_sent INT DEFAULT 0
//
// Real vs stubbed:
//   scheduled / in_progress / next_window_at / notifications_sent / windows
//     — ALL STUBBED. The table does not exist today. All values return
//     documented safe defaults (0 / null / []) so the UI can render a
//     "no windows scheduled" state without crashing.
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface MaintenanceWindow {
  id: string;
  title: string;
  type: string;
  status: string;
  window_start: string | null;
  window_end: string | null;
}

/** Human-readable countdown from now to an ISO timestamp. */
function countdown(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      // ── STUB: windows (maintenance_windows table does not exist) ──
      let windows: MaintenanceWindow[] = [];
      try {
        const res = await query<MaintenanceWindow>(
          `SELECT id, title, type, status,
                  window_start::text AS window_start,
                  window_end::text   AS window_end
             FROM maintenance_windows
            WHERE window_start >= NOW() - INTERVAL '30 days'
               OR status IN ('upcoming', 'in_progress')
            ORDER BY window_start ASC`
        );
        windows = res.rows;
      } catch {
        // Table does not exist — return empty documented structure.
        windows = [];
      }

      const scheduled = windows.filter((w) => w.status === "upcoming").length;
      const inProgress = windows.filter((w) => w.status === "in_progress").length;

      const nextWindow = windows
        .filter((w) => w.status === "upcoming" && w.window_start)
        .sort((a, b) => (a.window_start ?? "").localeCompare(b.window_start ?? ""));
      const next_window_at = nextWindow[0]?.window_start ?? null;

      const notifications_sent = 0; // stub: no column today

      void countdown; // referenced for the UI helper (future use)

      return ok({
        scheduled,
        in_progress: inProgress,
        next_window_at,
        notifications_sent,
        windows: windows.map((w) => ({
          id: w.id,
          title: w.title,
          window_start: w.window_start,
          window_end: w.window_end,
          type: w.type,
          status: w.status,
        })),
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
