import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const { rows } = await query<{
    id: string;
    subject: string;
    section: string;
    room: string | null;
    starts_at: string;
    ends_at: string;
    marked: boolean;
  }>(
    `SELECT c.id, COALESCE(c.name, c.section) AS subject, c.section,
            c.room_number AS room,
            '09:00' AS starts_at,
            '10:00' AS ends_at,
            EXISTS (
              SELECT 1 FROM attendance_records ar
              WHERE ar.person_id = $1
                AND ar.date = CURRENT_DATE
                AND ar.meta->>'class_id' = c.id::text
            ) AS marked
       FROM classes c
       WHERE c.class_teacher_id = $1
         AND c.is_active = TRUE
       ORDER BY c.section`,
    [auth.userId]
  ).catch(() => ({ rows: [] as any[] }));

  return ok({
    schedule: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      section: r.section,
      room: r.room,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      marked: r.marked,
    })),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["hod", "faculty", "admin", "sysadmin"],
});
