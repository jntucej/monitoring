// src/app/api/hostel/blocks/[block]/rooms/route.ts
// GET /api/hostel/blocks/[block]/rooms — rooms + occupants inside a hostel block.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
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

function getBlock(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  if (!HOSTEL_ROLES.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const block = getBlock(req);
  if (!block) return fail("VALIDATION_ERROR", "block required", 400);

  const { rows } = await query(
    `SELECT sd.room_number AS room_number,
            COUNT(*) AS beds,
            COUNT(*) FILTER (WHERE co.current_status = 'IN') AS occupied,
            array_agg(
              jsonb_build_object(
                'id', u.id, 'name', u.name, 'roll', u.unique_id
              )
              FILTER (WHERE co.current_status = 'IN')
            ) AS occupants
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id
       LEFT JOIN public.campus_occupancy co ON co.user_id = sd.user_id
      WHERE sd.hostel_block = $1
        AND sd.room_number IS NOT NULL
      GROUP BY sd.room_number
      ORDER BY sd.room_number`,
    [block],
  );

  return ok({ block, rooms: rows });
}

export const GET = withAuthorization(handleGet);
