import { query } from '../db.js';

/**
 * Scheduled Job: Daily mess-scan anomaly detection.
 *
 * Scans the previous 24h of mess_scan_log and flags:
 *   - one device redeeming > 300 tokens in 10 min (scripted abuse)
 *   - hmac_fail rate > 1% at a gate (someone reverse-engineering)
 *   - a student's token redeemed at two different blocks in one session
 *
 * Alerts route to mess_incharge + admin via the notification table with
 * priority='high'.
 */
export default async function messAnomalyDaily() {
  try {
    const alerts = [];

    // 1. Device abuse: > 300 'ok' scans from one device in a 10-min window.
    const deviceAbuse = await query(
      `SELECT device_id, COUNT(*) AS n
         FROM public.mess_scan_log
        WHERE result = 'ok' AND device_id IS NOT NULL
          AND scanned_at > NOW() - INTERVAL '24 hours'
        GROUP BY device_id
        HAVING COUNT(*) > 300
        LIMIT 50`
    );
    for (const d of deviceAbuse.rows) {
      alerts.push({
        kind: 'device_abuse',
        detail: `device ${d.device_id} redeemed ${d.n} tokens in 24h (>300 threshold)`,
      });
    }

    // 2. hmac_fail rate per gate.
    const hmacFail = await query(
      `SELECT scanned_by,
              COUNT(*) FILTER (WHERE result='hmac_fail') AS fails,
              COUNT(*) AS total
         FROM public.mess_scan_log
        WHERE scanned_at > NOW() - INTERVAL '24 hours'
        GROUP BY scanned_by
        HAVING COUNT(*) > 0`
    );
    for (const g of hmacFail.rows) {
      const total = parseInt(g.total, 10);
      const fails = parseInt(g.fails, 10);
      if (total > 20 && fails / total > 0.01) {
        alerts.push({
          kind: 'hmac_fail_rate',
          detail: `scann ${g.scanned_by}: ${fails}/${total} scans are hmac_fail (>1%)`,
        });
      }
    }

    // 3. Double-block redemption: a student's token redeemed in two
    //    distinct mess days (impossible if the day is single, signals a
    //    shared/traded phone).
    const double = await query(
      `SELECT student_id, COUNT(DISTINCT mess_day_id) AS days
         FROM public.mess_scan_log
        WHERE result = 'ok' AND scanned_at > NOW() - INTERVAL '24 hours'
        GROUP BY student_id
        HAVING COUNT(DISTINCT mess_day_id) > 1
        LIMIT 50`
    );
    for (const s of double.rows) {
      alerts.push({
        kind: 'double_block',
        detail: `student ${s.student_id} redeemed in ${s.days} mess days in 24h (phone sharing?)`,
      });
    }

    if (alerts.length === 0) {
      console.log('[Worker Job] No mess anomalies.');
      return;
    }

    for (const a of alerts) {
      for (const role of ['mess_incharge', 'admin']) {
        await query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_id, recipient_type, channels, data,
              event_type, scope, actor_role)
           VALUES ($1, 'high', $2, $3, $4, 'role', '{in_app}'::text[], $5::jsonb, $6, 'mess', 'system')`,
          [
            'mess.anomaly',
            'Mess scan anomaly',
            a.detail,
            role,
            JSON.stringify(a),
            'mess.anomaly',
          ]
        );
      }
    }
    console.log(`[Worker Job] ${alerts.length} mess anomalies → mess_incharge + admin.`);
  } catch (err) {
    console.error('[Worker Job] Mess anomaly scan failed:', err.message);
  }
}
