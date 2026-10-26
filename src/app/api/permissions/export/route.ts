// src/app/api/permissions/export/route.ts
// GET /api/permissions/export?from=...&to=... — CSV export of permissions.
// Principal / admin / sysadmin only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { fail } from "@/server/http/response";
import { query } from "@/lib/db";
import { addAudit } from "@/lib/db";
import { csvRow } from "@/lib/csv";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  if (!["principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "1970-01-01";
  const to = url.searchParams.get("to") ?? new Date().toISOString();

  const { rows } = await query(
    `SELECT p.ticket_number, p.workflow_type, p.reason, p.status, p.current_stage,
            p.from_date, p.to_date, p.created_at, p.updated_at,
            (SELECT u.name FROM public.users u WHERE u.id = p.requester_user_id LIMIT 1)
              AS requester_name
       FROM public.permissions p
      WHERE p.created_at BETWEEN $1 AND $2
      ORDER BY p.created_at DESC
      LIMIT 10000`,
    [from, to],
  );

  await addAudit({
    action: "PERMISSION_EXPORT",
    userId: auth.userId,
    role: auth.role as Role,
    details: { from, to, count: rows.length },
  });

  const headers = [
    "ticket_number",
    "workflow_type",
    "reason",
    "status",
    "current_stage",
    "from_date",
    "to_date",
    "created_at",
    "updated_at",
    "requester_name",
  ];
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
      "content-disposition": `attachment; filename="permissions-${Date.now()}.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet);
