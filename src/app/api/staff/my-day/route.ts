import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, self-scoped "my duties" endpoint for the staff role.
 *
 * Returns { success, data: { myRecent, openRequests, dutyRoster } } — all
 * derived from tables already readable at the staff tier, scoped to the
 * caller's own user id (identity comes from the trusted auth context, never
 * the client).
 *
 * Per-page slices (so each staff sub-page renders distinct data):
 *   assignedTasks — open staff_leave requests + open movement logs the caller
 *                   is expected to action today
 *   duties        — today's duty roster (staff on shift at shared gates)
 *   myDaySummary  — compact day-at-a-glance (counts + last 3 movements)
 *   notifications — the caller's unread notifications (mirrors /api/notifications)
 */

interface MovementRow {
  id: string;
  user_id: string;
  gate_id: string | null;
  direction: string;
  timestamp: string;
}

interface RequestRow {
  id: string;
  ticket_number: string | null;
  workflow_type: string;
  status: string;
  current_stage: string | null;
  created_at: string;
  updated_at: string;
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const service = getSupabaseServiceClient();

    // ── 1. Caller's recent movements (shared across slices) ───────────────
    const myRecentRes = await query<MovementRow>(
      `SELECT * FROM movement_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC LIMIT 15`,
      [auth.userId]
    );
    const myRecent = myRecentRes.rows;

    // ── 2. Open staff_leave requests (shared across slices) ───────────────
    const openRequestsRes = await query<RequestRow>(
      `SELECT pr.* FROM permission_requests pr
        WHERE pr.workflow_type = 'staff_leave'
          AND pr.student_user_id = $1
        ORDER BY pr.created_at DESC LIMIT 15`,
      [auth.userId]
    );
    const openRequests = openRequestsRes.rows;

    // ── 3. Today's duty roster (shared) ────────────────────────────────────
    const rosterRes = await query<{ id: string; name: string; role: string }>(
      `SELECT DISTINCT u.id, u.name, u.role
        FROM movement_logs ml
        JOIN users u ON u.id = ml.user_id
        WHERE ml.direction = 'IN'
          AND ml.timestamp >= date_trunc('day', NOW())
          AND u.role = 'staff'
        ORDER BY u.name LIMIT 50`,
      []
    );
    const dutyRoster = rosterRes.rows;

    // ── Per-page slices ────────────────────────────────────────────────────

    // assignedTasks: open requests the caller must action + their most recent
    // in/out event (so the page shows "what needs doing right now").
    const assignedTasks = {
      openRequests,
      lastMovement: myRecent[0] ?? null,
      totalOpen: openRequests.length,
    };

    // duties: today's on-shift staff roster (distinct from my-day summary).
    const duties = {
      roster: dutyRoster,
      totalOnShift: dutyRoster.length,
    };

    // myDaySummary: compact day-at-a-glance (counts + last 3 movements).
    const myDaySummary = {
      movementsToday: myRecent.length,
      lastMovements: myRecent.slice(0, 3),
      openRequestsCount: openRequests.length,
      rosterOnShift: dutyRoster.length,
    };

    // notifications: the caller's unread notifications (mirrors /api/notifications).
    const notifRes = await service
      .from("notifications")
      .select("id, title, body, type, read, created_at, meta")
      .eq("user_id", auth.userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20);
    const notifications = notifRes.data ?? [];

    return NextResponse.json({
      success: true,
      data: {
        myRecent,
        openRequests,
        dutyRoster,
        assignedTasks,
        duties,
        myDaySummary,
        notifications,
      },
    });
  } catch (error) {
    console.error("Staff my-day fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch staff duty data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "staff", "hod", "supervisor", "faculty"] }),
  { keyPrefix: "staff_my_day", maxRequests: 60 }
);
