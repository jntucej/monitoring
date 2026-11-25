/**
 * src/lib/mess/interest.ts — Conversion-gated interest poll v2 evaluation.
 *
 * Rules:
 *   - Three-way vote: yes / maybe / no
 *   - Recency weighting: votes in last 7 days weighted 1.5x
 *   - Participation threshold: total_voters / scope_size >= participation_min (default 0.40)
 *   - Approval threshold: weighted_yes / weighted_total >= approval_min (default 0.60)
 *   - Both must hold for status='approved'; if participation fails, status='closed'
 *     with result.participation_failed = true.
 *   - On approval, auto-creates a mess_special_schedules row with
 *     expected_count = round(weighted_yes * avg_conversion_of_past_3_items).
 */
import { query } from "@/lib/postgres";
import { publishNotification } from "@/lib/notifications/bus";

export interface PollEvaluation {
  poll_id: string;
  proposed_item: string;
  scope_size: number;
  total_voters: number;
  participation_pct: number;
  participation_met: boolean;
  participation_failed: boolean;
  yes: number;
  maybe: number;
  no: number;
  weighted_yes: number;
  weighted_maybe: number;
  weighted_no: number;
  approval_pct: number;
  approved: boolean;
  avg_conversion_pct: number;
  estimated_portions: number;
  past_conversions: Array<{
    proposed_item: string;
    conversion_pct: number;
    recorded_at: string;
  }>;
}

export async function evaluateInterestPoll(pollId: string): Promise<PollEvaluation | null> {
  const { rows: pollRows } = await query<{
    id: string;
    proposed_item: string;
    meal_type: string;
    scheduled_for: string | null;
    counter_id: string | null;
    target_scope: string;
    participation_min: string;
    approval_min: string;
  }>(
    `SELECT id, proposed_item, meal_type, scheduled_for::text, counter_id,
            target_scope, participation_min::text, approval_min::text
       FROM public.mess_interest_polls
      WHERE id = $1::uuid LIMIT 1`,
    [pollId],
  );
  const poll = pollRows[0];
  if (!poll) return null;

  // Scope size: active mess-eligible residents (fallback to active students if mess_eligibility empty)
  const { rows: scopeRows } = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM public.mess_eligibility WHERE active = true`,
  );
  let scopeSize = parseInt(scopeRows[0]?.cnt ?? "0", 10);
  if (scopeSize === 0) {
    const { rows: stuRows } = await query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM public.users WHERE role = 'student' AND deleted_at IS NULL`,
    );
    scopeSize = Math.max(1, parseInt(stuRows[0]?.cnt ?? "1", 10));
  }

  const { rows: voteRows } = await query<{
    vote: "yes" | "maybe" | "no";
    is_recent: boolean;
  }>(
    `SELECT vote, (voted_at >= NOW() - INTERVAL '7 days') AS is_recent
       FROM public.mess_interest_votes
      WHERE poll_id = $1::uuid`,
    [pollId],
  );

  let yes = 0;
  let maybe = 0;
  let no = 0;
  let weightedYes = 0;
  let weightedMaybe = 0;
  let weightedNo = 0;

  for (const v of voteRows) {
    const w = v.is_recent ? 1.5 : 1.0;
    if (v.vote === "yes") {
      yes++;
      weightedYes += w;
    } else if (v.vote === "maybe") {
      maybe++;
      weightedMaybe += w;
    } else {
      no++;
      weightedNo += w;
    }
  }

  const totalVoters = yes + maybe + no;
  const weightedTotal = weightedYes + weightedMaybe + weightedNo;
  const participationPct = scopeSize > 0 ? totalVoters / scopeSize : 0;
  const participationMin = Number(poll.participation_min || 0.4);
  const approvalMin = Number(poll.approval_min || 0.6);
  const participationMet = participationPct >= participationMin;
  const approvalPct = weightedTotal > 0 ? weightedYes / weightedTotal : 0;
  const approved = participationMet && approvalPct >= approvalMin;

  const { rows: convRows } = await query<{
    proposed_item: string;
    conversion_pct: string;
    recorded_at: string;
  }>(
    `SELECT p.proposed_item, c.conversion_pct::text, c.recorded_at::text
       FROM public.mess_interest_conversions c
       JOIN public.mess_interest_polls p ON p.id = c.poll_id
      WHERE c.conversion_pct IS NOT NULL
      ORDER BY c.recorded_at DESC
      LIMIT 3`,
  );

  const pastConversions = convRows.map((r) => ({
    proposed_item: r.proposed_item,
    conversion_pct: Number(r.conversion_pct),
    recorded_at: r.recorded_at,
  }));

  const avgConversionPct =
    pastConversions.length > 0
      ? pastConversions.reduce((acc, r) => acc + r.conversion_pct, 0) / pastConversions.length
      : 0.65;

  const estimatedPortions = Math.max(1, Math.round(weightedYes * avgConversionPct));

  return {
    poll_id: poll.id,
    proposed_item: poll.proposed_item,
    scope_size: scopeSize,
    total_voters: totalVoters,
    participation_pct: Number(participationPct.toFixed(4)),
    participation_met: participationMet,
    participation_failed: !participationMet,
    yes,
    maybe,
    no,
    weighted_yes: Number(weightedYes.toFixed(2)),
    weighted_maybe: Number(weightedMaybe.toFixed(2)),
    weighted_no: Number(weightedNo.toFixed(2)),
    approval_pct: Number(approvalPct.toFixed(4)),
    approved,
    avg_conversion_pct: Number(avgConversionPct.toFixed(4)),
    estimated_portions: estimatedPortions,
    past_conversions: pastConversions,
  };
}

export async function finalizeInterestPoll(
  pollId: string,
  actorId: string,
  forceDecision?: "approved" | "rejected",
): Promise<{ status: string; evaluation: PollEvaluation; schedule_id?: string } | null> {
  const evaluation = await evaluateInterestPoll(pollId);
  if (!evaluation) return null;

  let nextStatus: "approved" | "rejected" | "closed";
  if (forceDecision) {
    nextStatus = forceDecision;
  } else if (evaluation.participation_failed) {
    nextStatus = "closed";
  } else {
    nextStatus = evaluation.approved ? "approved" : "rejected";
  }

  await query(
    `UPDATE public.mess_interest_polls
        SET status = $2, result = $3::jsonb
      WHERE id = $1::uuid`,
    [pollId, nextStatus, JSON.stringify(evaluation)],
  );

  let scheduleId: string | undefined;
  if (nextStatus === "approved") {
    const { rows: pollMeta } = await query<{
      proposed_item: string;
      meal_type: string;
      scheduled_for: string | null;
      counter_id: string | null;
    }>(
      `SELECT proposed_item, meal_type, scheduled_for::text, counter_id
         FROM public.mess_interest_polls WHERE id = $1::uuid LIMIT 1`,
      [pollId],
    );
    const pm = pollMeta[0];
    if (pm) {
      // Find matching mess_days session (or next active session of that meal_type)
      const { rows: dayRows } = await query<{ id: string }>(
        pm.scheduled_for
          ? `SELECT id FROM public.mess_days WHERE meal_date = $1::date AND meal_type = $2 LIMIT 1`
          : `SELECT id FROM public.mess_days WHERE meal_type = $1 AND is_active = true ORDER BY meal_date DESC LIMIT 1`,
        pm.scheduled_for ? [pm.scheduled_for, pm.meal_type] : [pm.meal_type],
      );
      let counterId = pm.counter_id;
      if (!counterId) {
        const { rows: cRows } = await query<{ id: string }>(
          `SELECT id FROM public.mess_counters WHERE active = true ORDER BY created_at ASC LIMIT 1`,
        );
        counterId = cRows[0]?.id ?? null;
      }
      if (dayRows[0] && counterId) {
        const { rows: schedRows } = await query<{ id: string }>(
          `INSERT INTO public.mess_special_schedules
             (session_id, counter_id, item_name, expected_count, status, created_by)
           VALUES ($1::uuid, $2::uuid, $3, $4, 'planned', $5::uuid)
           RETURNING id`,
          [dayRows[0].id, counterId, pm.proposed_item, evaluation.estimated_portions, actorId],
        );
        scheduleId = schedRows[0]?.id;
      }
    }
  }

  await publishNotification({
    eventType: "mess.poll.result",
    actorId,
    actorRole: "mess_incharge",
    scope: "mess",
    title: `Poll ${nextStatus}: ${evaluation.proposed_item}`,
    message: `Participation ${Math.round(evaluation.participation_pct * 100)}%, approval ${Math.round(evaluation.approval_pct * 100)}%.`,
    payload: { ...evaluation, status: nextStatus, schedule_id: scheduleId },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return { status: nextStatus, evaluation, schedule_id: scheduleId };
}
