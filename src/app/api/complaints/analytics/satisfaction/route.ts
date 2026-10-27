// src/app/api/complaints/analytics/satisfaction/route.ts
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["admin", "sysadmin", "principal"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const { rows } = await query(
    `SELECT ROUND(AVG(rating), 2) AS "averageRating", COUNT(*)::int AS "totalFeedback" FROM public.complaint_feedback`,
  );
  return ok({ satisfaction: rows[0] ?? { averageRating: 0, totalFeedback: 0 } });
}
export const GET = withAuthorization(handleGet);
