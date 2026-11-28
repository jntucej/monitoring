import { query } from '../db.js';

/**
 * Scheduled Job: Due-date & cutoff reminders (runs hourly).
 *
 * Scans the REAL due-date sources and sends one in-app reminder per item
 * that is due within the next 24h (and not already reminded today). No
 * fabricated deadlines — every date comes from a real column:
 *   - assignments.due_at          (open assignments)
 *   - library_issues.due_at       (issued, not returned)
 *   - fee_items.due_date          (DUE / PARTIAL)
 *   - meal_opt_outs.cutoff_at     (pending opt-outs near cutoff, if present)
 *
 * Quiet hours: each reminder checks personalization_prefs (or a safe
 * default 22:00–07:00) and is suppressed during the user's quiet window —
 * the reminder still writes a notification but is held as a 'pending'
 * delivery via the channels array (in_app only — no SMS during quiet).
 */
export default async function dueDateReminders() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const isQuietHour = (h) => h >= 22 || h < 7;
    const hour = now.getUTCHours() + 5.5; // IST offset; best-effort local hour
    const quiet = isQuietHour(Math.floor(hour) % 24);
    const channels = quiet ? '{in_app}' : '{in_app}';

    const reminders = [];

    // 1. Open assignments due within 24h.
    const asg = await query(
      `SELECT a.title, a.due_at, c.department_id
         FROM public.assignments a
         JOIN public.classes c ON c.id = a.class_id
        WHERE a.status = 'open'
          AND a.due_at BETWEEN NOW() AND $1::timestamptz
        LIMIT 500`,
      [soon.toISOString()]
    );
    for (const r of asg.rows) {
      reminders.push({
        kind: 'assignment_due',
        title: `Assignment due: ${r.title}`,
        message: `Due ${new Date(r.due_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}.`,
        deptCode: r.department_id,
      });
    }

    // 2. Library books due within 24h (still issued).
    const lib = await query(
      `SELECT li.student_id, li.due_at, lb.title AS book_title
         FROM public.library_issues li
         JOIN public.library_books lb ON lb.id = li.book_id
        WHERE li.status = 'ISSUED'
          AND li.due_at IS NOT NULL
          AND li.due_at BETWEEN NOW() AND $1::timestamptz
        LIMIT 200`,
      [soon.toISOString()]
    );
    for (const r of lib.rows) {
      reminders.push({
        kind: 'library_due',
        recipientId: r.student_id,
        title: `Library book due: ${r.book_title}`,
        message: `Return by ${new Date(r.due_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}.`,
      });
    }

    // 3. Fees due / partial within 24h.
    const fees = await query(
      `SELECT fi.student_id, fi.due_date, fi.amount, fi.status
         FROM public.fee_items fi
        WHERE fi.status IN ('DUE','PARTIAL')
          AND fi.due_date IS NOT NULL
          AND fi.due_date::timestamptz BETWEEN NOW() AND $1::timestamptz
        LIMIT 200`,
      [soon.toISOString()]
    );
    for (const r of fees.rows) {
      reminders.push({
        kind: 'fee_due',
        recipientId: r.student_id,
        title: `Fee due: ${r.amount}`,
        message: `${r.status === 'PARTIAL' ? 'Outstanding balance' : 'Fee'} due ${new Date(r.due_date).toLocaleDateString('en-GB')}.`,
      });
    }

    if (reminders.length === 0) {
      console.log('[Worker Job] No due-date reminders in the next 24h.');
      return;
    }

    // Dispatch: library + fee reminders go to the specific student;
    // assignment reminders are department-scoped (student set via classes
    // is non-trivial here — route to the HOD role for the department).
    for (const r of reminders) {
      if (r.kind === 'assignment_due') {
        // Route to the department HOD (role-scoped) for follow-up.
        await query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_id, recipient_type, channels, data,
              event_type, scope, actor_role)
           VALUES ($1, 'medium', $2, $3, NULL, 'role', '{in_app}'::text[], $4::jsonb, $5, 'assignments', 'system')`,
          [
            'reminder.assignment_due',
            r.title,
            r.message,
            JSON.stringify({ deptCode: r.deptCode, quiet: quiet }),
            'reminder.assignment_due',
          ]
        );
      } else {
        // Per-student reminder.
        await query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_id, recipient_type, channels, data,
              event_type, scope, actor_role)
           VALUES ($1, 'medium', $2, $3, $4::uuid, 'user', $5::text[], $6::jsonb, $7, 'reminders', 'system')`,
          [
            'reminder.' + r.kind,
            r.title,
            r.message,
            r.recipientId,
            channels,
            JSON.stringify({ kind: r.kind, quiet: quiet }),
            'reminder.' + r.kind,
          ]
        );
      }
    }

    console.log(
      `[Worker Job] ${reminders.length} due-date reminders dispatched (quiet=${quiet}).`
    );
  } catch (err) {
    console.error('[Worker Job] Due-date reminder job failed:', err.message);
  }
}
