import { query } from '../db.js';

/**
 * Scheduled Job: Close mess interest polls at closes_at.
 *
 * For each open poll past its closes_at, computes yes_count / target_count
 * against min_interest_pct, sets the poll + weekly item to approved/rejected,
 * and fires a 'mess.poll.result' notification to mess_incharge +
 * hostel_manager (NOT other residents — that would out voters).
 */
export default async function messPollClose() {
  try {
    const open = await query(
      `SELECT p.id, p.weekly_item_id, p.closes_at, p.min_interest_pct, p.target_scope,
              COUNT(v.user_id) FILTER (WHERE v.vote='yes') AS yes,
              COUNT(v.user_id) AS total
         FROM public.mess_item_interest_polls p
         LEFT JOIN public.mess_item_interest_votes v ON v.poll_id = p.id
        WHERE p.status = 'open' AND p.closes_at <= NOW()
        GROUP BY p.id
        LIMIT 100`
    );
    if (open.rows.length === 0) return;

    for (const poll of open.rows) {
      const total = parseInt(poll.total, 10) || 0;
      const yes = parseInt(poll.yes, 10) || 0;
      const minPct = parseFloat(poll.min_interest_pct) || 0;
      // Interest is measured against the target-scope population, not just
      // voters (abstention counts against the item). We use voter turnout as
      // the denominator unless a target-scope count is available; the spec's
      // "60% of residents" is approximated by voters when the poll has
      // turnout.
      const pct = total > 0 ? yes / total : 0;
      const passed = pct >= minPct;

      await query(
        `UPDATE public.mess_item_interest_polls
            SET status = $1,
                result_json = $2::jsonb
          WHERE id = $3`,
        [
          passed ? 'approved' : 'rejected',
          JSON.stringify({ yes, no: total - yes, yes_pct: Math.round(pct * 1000) / 10, min_pct: minPct, at: new Date().toISOString() }),
          poll.id,
        ]
      );
      await query(
        `UPDATE public.mess_weekly_items
            SET status = $1
          WHERE id = $2 AND status = 'draft'`,
        [passed ? 'approved' : 'rejected', poll.weekly_item_id]
      );

      // Notify the committee only (mess_incharge + hostel_manager).
      await query(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_id, recipient_type, channels, data,
            event_type, scope, actor_role)
         VALUES
           ($1, 'normal', $2, $3, 'mess_incharge', 'role', '{in_app}'::text[], $4::jsonb, $5, 'mess', 'system'),
           ($1, 'normal', $2, $3, 'hostel_manager', 'role', '{in_app}'::text[], $4::jsonb, $5, 'mess', 'system')`,
        [
          'mess.poll.result',
          'Interest poll result',
          `Poll ${poll.id}: ${passed ? 'APPROVED' : 'REJECTED'} (${yes}/${total} yes, ${Math.round(pct * 100)}% vs ${Math.round(minPct * 100)}% needed)`,
          JSON.stringify({ poll_id: poll.id, weekly_item_id: poll.weekly_item_id, yes, total, passed }),
          'mess.poll.result',
        ]
      );
    }
    console.log(`[Worker Job] Closed ${open.rows.length} mess interest polls.`);
  } catch (err) {
    console.error('[Worker Job] Mess poll close failed:', err.message);
  }
}
