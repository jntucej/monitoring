// src/app/api/admin/audit/export/route.ts
// GET /api/admin/audit/export?from=...&to=... — CSV export of audit logs.
// Admin / sysadmin only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { fail } from "@/server/http/response";
import { query, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { csvRow } from "@/lib/csv";

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  if (!["admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "1970-01-01";
  const to = url.searchParams.get("to") ?? new Date().toISOString();

  const { rows } = await query(
    `SELECT id, action, user_id, user_name, user_role, ip_address, timestamp,
            details
       FROM public.audit_logs
      WHERE timestamp BETWEEN $1 AND $2
      ORDER BY timestamp DESC
      LIMIT 50000`,
    [from, to],
  );

  await addAudit({
    action: "ADMIN_EXPORT",
    userId: auth.userId,
    role: auth.role as Role,
    details: { from, to, count: rows.length },
  });

  const headers = [
    "id",
    "action",
    "user_id",
    "user_name",
    "user_role",
    "ip_address",
    "timestamp",
    "details",
  ];
  const csv = [headers.join(",")]
    .concat(
      rows.map((r) => {
        const detail = (r as Record<string, unknown>).details;
        const detailStr =
          detail && typeof detail === "object" ? JSON.stringify(detail) : String(detail ?? "");
        return csvRow(
          headers.map((h) => (h === "details" ? detailStr : String((r as Record<string, unknown>)[h] ?? "")))
        );
      }),
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="audit-${Date.now()}.csv"`,
    },
  });
}

export const GET = withAuthorization(handleGet);
