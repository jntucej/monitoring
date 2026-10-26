// src/app/api/mess/reviews/export/route.ts
// GET ?from=&to= — CSV export of active reviews for principal/audit (R12).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { csvRow } from "@/lib/csv";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "1970-01-01";
  const to = url.searchParams.get("to") ?? new Date().toISOString();

  const { rows } = await query(
    `SELECT r.review_date, r.meal_type, r.satisfaction, r.comment, r.created_at,
            (SELECT u.name FROM public.users u WHERE u.id = r.user_id LIMIT 1) AS student_name
       FROM public.mess_meal_reviews r
      WHERE r.review_date BETWEEN $1::date AND $2::date
        AND r.deleted_at IS NULL
      ORDER BY r.review_date DESC
      LIMIT 50000`,
    [from, to],
  );

  await addAudit({
    action: "MESS_REVIEW_EXPORT",
    userId: auth.userId,
    role: auth.role,
    details: { from, to, count: rows.length },
  });

  const headers = ["review_date", "meal_type", "satisfaction", "comment", "created_at", "student_name"];
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) =>
        csvRow(headers.map((h) => String((r as Record<string, unknown>)[h] ?? ""))),
      ),
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mess-reviews-${Date.now()}.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet);
