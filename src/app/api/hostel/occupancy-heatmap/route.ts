import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT COALESCE(sd.hostel_block, 'UNASSIGNED') AS block_id,
            COUNT(*)::int AS occupied,
            COUNT(*) FILTER (WHERE sp.status = 'out_campus')::int AS currently_out,
            (SELECT hs.score FROM public.housekeeping_scores hs
              WHERE hs.block_id = COALESCE(sd.hostel_block, 'UNASSIGNED')
              ORDER BY hs.scored_at DESC LIMIT 1) AS latest_housekeeping_score
       FROM public.student_details sd
       JOIN public.users u ON u.id = sd.user_id AND u.deleted_at IS NULL
       LEFT JOIN public.student_presence sp ON sp.user_id = u.id
      WHERE sd.hostel_block IS NOT NULL
      GROUP BY sd.hostel_block
      ORDER BY sd.hostel_block ASC`,
  );
  return ok({ blocks: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
