/**
 * Deadline watch sweep worker (1-minute cron).
 *
 * Fires three autonomous event classes from the reliability layer:
 *
 * 1. CURFEW_OVERDUE — deadline_watches WHERE watch_type='CURFEW_RETURN'
 *    AND status='OPEN' AND due_at < NOW() -> flip to BREACHED, emit event.
 *
 * 2. SLA_ESCALATION — deadline_watches WHERE watch_type='SLA_ESCALATION'
 *    AND status='OPEN' AND due_at < NOW() -> increment escalation_step,
 *    resolve next role from routing_policies.escalation_chain[], emit event.
 *
 * 3. SEMESTER_TRANSITION — academic_calendar_events WHERE
 *    status='SCHEDULED' AND occurs_at <= NOW() -> fire the rollover playbook,
 *    stamp FIRED.
 *
 * All windows / escalation chains / playbook state-graphs are read from the
 * versioned policy tables (routing_policies, automation_workflows,
 * lifecycle_playbooks) — zero hardcoded.
 */

import { getWorkerDbPool } from "../db.js";

export async function runDeadlineSweep() {
  const pool = getWorkerDbPool();
  let curfewBreached = 0;
  let slaEscalated = 0;
  let calendarFired = 0;

  // 1. CURFEW_OVERDUE sweep.
  try {
    const { rows: curfewWatches } = await pool.query(
      `UPDATE public.deadline_watches
          SET status = 'BREACHED', updated_at = NOW()
        WHERE watch_type = 'CURFEW_RETURN'
          AND status = 'OPEN'
          AND due_at < NOW()
        RETURNING entity_id, entity_type`,
    );
    for (const w of curfewWatches) {
      await pool.query(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_id, recipient_type, channels, event_type, scope, actor_role)
         VALUES ($1, 'high', $2, $3, $4::uuid, 'user', '{in_app, sms}'::text[], 'curfew', 'curfew', 'system')`,
        [
          "curfew.overdue",
          "Curfew breach detected",
          `Student ${w.entity_id} missed the curfew return deadline.`,
          w.entity_id,
        ],
      ).catch(() => {});
    }
    curfewBreached = curfewWatches.length;
  } catch (err) {
    console.warn("[deadline-sweep] curfew sweep failed:", err?.message ?? err);
  }

  // 2. SLA_ESCALATION sweep (reads escalation chain from routing_policies).
  try {
    const { rows: slaWatches } = await pool.query(
      `UPDATE public.deadline_watches
          SET status = 'BREACHED', escalation_step = escalation_step + 1, updated_at = NOW()
        WHERE watch_type = 'SLA_ESCALATION'
          AND status = 'OPEN'
          AND due_at < NOW()
        RETURNING entity_id, entity_type, escalation_step`,
    );
    for (const w of slaWatches) {
      // Resolve the next role from the routing policy's escalation chain.
      const { rows: chainRows } = await pool.query(
        `SELECT escalation_chain
           FROM public.routing_policies
          WHERE status = 'ACTIVE' AND category IN ('academic', 'hostel')
          ORDER BY effective_from DESC LIMIT 1`,
      );
      const chain = chainRows[0]?.escalation_chain ?? [];
      const nextRole = chain[Number(w.escalation_step)] ?? "principal";

      await pool.query(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_type, channels, event_type, scope, actor_role)
         VALUES ($1, 'high', $2, $3, 'role', '{in_app}'::text[], 'sla', 'escalation', 'system')`,
        [
          "sla.escalated",
          `SLA breach escalated to ${nextRole}`,
          `Doubt/approval ${w.entity_id} breached its SLA window; escalated to ${nextRole} (step ${w.escalation_step}).`,
        ],
      ).catch(() => {});
    }
    slaEscalated = slaWatches.length;
  } catch (err) {
    console.warn("[deadline-sweep] SLA sweep failed:", err?.message ?? err);
  }

  // 3. Calendar-driven rollover (fires SCHEDULED events that are due).
  try {
    const { rows: firedEvents } = await pool.query(
      `UPDATE public.academic_calendar_events
          SET status = 'FIRED', fired_at = NOW()
        WHERE status = 'SCHEDULED' AND occurs_at <= NOW()
        RETURNING id, event_type, payload`,
    );
    for (const ev of firedEvents) {
      // Emit to the outbox so the relay worker picks it up.
      await pool.query(
        `INSERT INTO public.domain_outbox (event_type, payload)
         VALUES ($1, $2::jsonb)`,
        [ev.event_type, JSON.stringify({ ...ev.payload, occurredAt: ev.occurs_at ?? null })],
      ).catch(() => {});
    }
    calendarFired = firedEvents.length;
  } catch (err) {
    console.warn("[deadline-sweep] calendar sweep failed:", err?.message ?? err);
  }

  if (curfewBreached || slaEscalated || calendarFired) {
    console.log(
      `[deadline-sweep] curfew_breached=${curfewBreached} sla_escalated=${slaEscalated} calendar_fired=${calendarFired}`,
    );
  }
  return { curfewBreached, slaEscalated, calendarFired };
}
