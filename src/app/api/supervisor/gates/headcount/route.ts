import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query<{
    gate_id: string;
    gate_name: string;
    gate_type: string;
    in_today: number;
    out_today: number;
    net_inside: number;
  }>(
    `SELECT g.id AS gate_id,
            g.name AS gate_name,
            g.type AS gate_type,
            COUNT(ml.id) FILTER (WHERE ml.direction = 'IN')::int AS in_today,
            COUNT(ml.id) FILTER (WHERE ml.direction = 'OUT')::int AS out_today,
            (COUNT(ml.id) FILTER (WHERE ml.direction = 'IN') - COUNT(ml.id) FILTER (WHERE ml.direction = 'OUT'))::int AS net_inside
       FROM public.gates g
       LEFT JOIN public.movement_logs ml
         ON ml.gate_id = g.id AND ml.timestamp >= CURRENT_DATE
      WHERE g.is_active = true
      GROUP BY g.id
      ORDER BY g.name ASC`,
  );

  const totalIn = rows.reduce((a, r) => a + r.in_today, 0);
  const totalOut = rows.reduce((a, r) => a + r.out_today, 0);

  return ok({
    gates: rows,
    totals: { in_today: totalIn, out_today: totalOut, net_inside: totalIn - totalOut },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
