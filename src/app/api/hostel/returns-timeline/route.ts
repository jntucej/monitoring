// src/app/api/hostel/returns-timeline/route.ts
// GET /api/hostel/returns-timeline — hostel return-oversight board: students who
// used an OUT pass and are expected back soon, plus those already overdue.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const HOSTEL_ROLES = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
  "supervisor",
];

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  if (!HOSTEL_ROLES.includes(auth.role)) {
    return ok({
      upcoming: [],
      overdue: [],
      summary: { upcomingCount: 0, overdueCount: 0 },
    });
  }

  const upcoming = await query<{
    id: string;
    ticket_number: string;
    name: string;
    roll: string;
    to_date: string;
    minutes_until_return: number;
  }>(
    `SELECT p.id, p.ticket_number, u.name, u.unique_id AS roll,
            p.to_date,
            EXTRACT(EPOCH FROM (p.to_date - NOW())) / 60 AS minutes_until_return
       FROM public.permissions p
       JOIN public.users u ON u.id = p.student_user_id
      WHERE p.workflow_type = 'hostel'
        AND p.reason = 'home_out'
        AND p.status = 'COMPLETED'
        AND p.used_at IS NOT NULL
        AND p.to_date BETWEEN NOW() AND NOW() + INTERVAL '6 hours'
      ORDER BY p.to_date ASC`,
  );

  const overdue = await query<{
    id: string;
    ticket_number: string;
    name: string;
    roll: string;
    to_date: string;
    minutes_overdue: number;
  }>(
    `SELECT p.id, p.ticket_number, u.name, u.unique_id AS roll,
            p.to_date,
            EXTRACT(EPOCH FROM (NOW() - p.to_date)) / 60 AS minutes_overdue
       FROM public.permissions p
       JOIN public.users u ON u.id = p.student_user_id
      WHERE p.workflow_type = 'hostel'
        AND p.reason = 'home_out'
        AND p.status = 'COMPLETED'
        AND p.used_at IS NOT NULL
        AND p.to_date < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM public.movement_logs m
           WHERE m.user_id = p.student_user_id
             AND m.direction = 'IN'
             AND m.timestamp > p.used_at
        )
      ORDER BY p.to_date ASC
      LIMIT 100`,
  );

  return ok({
    upcoming: upcoming.rows,
    overdue: overdue.rows,
    summary: {
      upcomingCount: upcoming.rowCount ?? 0,
      overdueCount: overdue.rowCount ?? 0,
    },
  });
}

export const GET = withAuthorization(handleGet);
