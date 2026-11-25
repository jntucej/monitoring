import { query } from '../db.js';

/**
 * Scheduled Job: Confirmation SLA escalation.
 *
 * Scans `permissions` for PENDING/ESCALATED tickets whose `sla_deadline` has
 * passed and re-routes them up the chain (reads the escalation target from
 * ops_rules('leave_threshold','auto_escalation')). Fires a high-priority
 * notification_events row to the escalation target via the notification
 * queue so the next approver is paged.
 */
export default async function confirmationSla() {
  console.log('[Worker Job] Confirmation SLA scan...');
  try {
    // Read the escalation target from ops_rules (no hard-coded role).
    const esc = await query(
      `SELECT value FROM public.ops_rules
        WHERE domain='leave_threshold' AND rule_key='auto_escalation'
          AND (effective_to IS NULL OR effective_to > now())
        ORDER BY effective_from DESC LIMIT 1`
    );
    const escalateTo = esc.rows[0]?.value?.escalate_to ?? 'hostel_manager';

    const due = await query(
      `SELECT id, ticket_number, current_stage
         FROM public.permissions
        WHERE status IN ('PENDING','ESCALATED')
          AND sla_deadline IS NOT NULL
          AND sla_deadline < NOW()
          AND current_stage IS NOT NULL
          AND current_stage <> $1
        LIMIT 200`,
      [escalateTo]
    );

    if (due.rows.length === 0) {
      console.log('[Worker Job] No overdue confirmations.');
      return;
    }

    let escalated = 0;
    for (const t of due.rows) {
      await query(
        `UPDATE public.permissions
            SET status = 'ESCALATED', routed_to_role = $1, updated_at = now()
          WHERE id = $2 AND status IN ('PENDING','ESCALATED')`,
        [escalateTo, t.id]
      );
      // Queue a high-priority in-app notification to the escalation target.
      await query(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_id, recipient_type, channels, data,
            event_type, scope, actor_role)
         VALUES ($1, $2, $3, $4, $5, $6, '{in_app}'::text[], $7::jsonb, $8, 'global', 'system')`,
        [
          'confirmation.sla_breach',
          'high',
          'Confirmation SLA breach',
          `Ticket ${t.ticket_number} is past its SLA; escalated to ${escalateTo}`,
          t.id,
          'role',
          JSON.stringify({ ticket_number: t.ticket_number, was_stage: t.current_stage }),
          'confirmation.sla_breach',
        ]
      );
      escalated++;
    }
    console.log(`[Worker Job] Escalated ${escalated} overdue confirmations to '${escalateTo}'.`);
  } catch (err) {
    console.error('[Worker Job] Confirmation SLA scan failed:', err.message);
  }
}
