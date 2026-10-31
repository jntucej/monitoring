import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface CustomReasonRow {
  id: string;
  code: string;
  label: string;
  workflow_type: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let items: CustomReasonRow[] = [];

      try {
        const res = await query<CustomReasonRow>(`
          SELECT
            id::text AS id,
            code,
            label,
            workflow_type,
            is_active,
            created_by::text AS created_by,
            created_at::text AS created_at,
            updated_at::text AS updated_at
          FROM public.custom_reasons
          ORDER BY workflow_type ASC, label ASC
        `);
        items = res.rows;
      } catch {
        items = [];
      }

      return ok({ items });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60000, maxRequests: 60 }
);
