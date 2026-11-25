// worker/jobs/sos_escalate.js
import { getWorkerDbPool } from "../db.js";

export async function runSosEscalate() {
  const pool = getWorkerDbPool();
  const { rows: ruleRows } = await pool.query(
    `SELECT value FROM public.ops_rules
      WHERE domain = 'sos_escalation' AND rule_key = 'default'
      ORDER BY effective_from DESC LIMIT 1`,
  );
  const cfg = ruleRows[0]?.value ?? {
    supervisor_after_s: 60,
    admin_after_s: 120,
    guardian_after_s: 300,
  };

  const { rows: openSos } = await pool.query(
    `SELECT id, student_id, category, priority,
            EXTRACT(EPOCH FROM (NOW() - created_at))::int AS age_s
       FROM public.sos_requests
      WHERE status IN ('open', 'dispatched')
        AND created_at < NOW() - ($1::int * INTERVAL '1 second')
      LIMIT 20`,
    [cfg.supervisor_after_s ?? 60],
  );

  let escalated = 0;
  for (const s of openSos) {
    const level =
      s.age_s >= (cfg.guardian_after_s ?? 300)
        ? "guardian"
        : s.age_s >= (cfg.admin_after_s ?? 120)
          ? "admin"
          : "supervisor";

    const { rows: already } = await pool.query(
      `SELECT 1 FROM public.sos_events
        WHERE sos_id = $1::uuid AND kind = 'escalated' AND payload->>'level' = $2
        LIMIT 1`,
      [s.id, level],
    );
    if (already.length > 0) continue;

    await pool.query(
      `UPDATE public.sos_requests SET status = 'escalated' WHERE id = $1::uuid AND status IN ('open','dispatched')`,
      [s.id],
    );
    await pool.query(
      `INSERT INTO public.sos_events (sos_id, actor_role, kind, payload)
       VALUES ($1::uuid, 'system', 'escalated', $2::jsonb)`,
      [s.id, JSON.stringify({ level, age_s: s.age_s })],
    );
    escalated++;
  }
  return { escalated };
}
