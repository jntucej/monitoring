import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT id, ticket_code, subject AS title, category, status, created_at,
            EXTRACT(EPOCH FROM (created_at + INTERVAL '24 hours' - NOW()))::int AS seconds_remaining,
            (NOW() > created_at + INTERVAL '24 hours') AS sla_breached
       FROM public.hostel_tickets
      WHERE status NOT IN ('resolved', 'closed')
      ORDER BY created_at ASC LIMIT 50`,
  );
  return ok({ tickets: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "worker", "principal", "admin", "sysadmin"],
});
