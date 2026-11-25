// worker/jobs/achievement_auto.js
import { getWorkerDbPool } from "../db.js";

export async function runAchievementAuto() {
  const pool = getWorkerDbPool();
  const { rows: templates } = await pool.query(
    `SELECT id, code, title, visibility, auto_rule
       FROM public.achievement_templates
      WHERE active = true AND auto_rule IS NOT NULL`,
  );

  let awarded = 0;
  for (const tpl of templates) {
    const rule = tpl.auto_rule;
    if (rule?.metric === "attendance_pct" && typeof rule.value === "number") {
      const minClasses = Number(rule.min_classes ?? 30);
      const { rows: eligible } = await pool.query(
        `SELECT ar.person_id AS student_id
           FROM public.attendance_records ar
          GROUP BY ar.person_id
         HAVING COUNT(*) >= $1
            AND (100.0 * COUNT(*) FILTER (WHERE ar.status = 'PRESENT') / COUNT(*)) >= $2`,
        [minClasses, rule.value],
      );
      for (const s of eligible) {
        const { rows: exists } = await pool.query(
          `SELECT 1 FROM public.user_achievements
            WHERE user_id = $1::uuid AND template_id = $2::uuid AND revoked_at IS NULL LIMIT 1`,
          [s.student_id, tpl.id],
        );
        if (exists.length > 0) continue;
        await pool.query(
          `INSERT INTO public.user_achievements
             (user_id, achievement_code, template_id, awarded_by_role, scope, note)
           VALUES ($1::uuid, $2, $3::uuid, 'system', $4, 'Auto-awarded')`,
          [s.student_id, tpl.code, tpl.id, tpl.visibility],
        );
        awarded++;
      }
    }
  }
  return { awarded };
}
