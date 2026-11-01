import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

export const GET = withAuthorization(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("all") !== "true";
    const { rows } = await query(
      `SELECT code, label, body, variables, sender_id, dlt_template_id,
              category, is_active, updated_at
         FROM sms_templates
        ${activeOnly ? "WHERE is_active = TRUE" : ""}
        ORDER BY code`
    );
    return ok({ templates: rows });
  },
  { requiredRole: ["admin", "sysadmin"] }
);
