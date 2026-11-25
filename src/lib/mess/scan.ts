/**
 * src/lib/mess/scan.ts — Mess v2 atomic scan verification, counter increment,
 * special-item tracking, and manual override.
 *
 * Hard guard: zero writes to movement_logs, gate_events, or gate_devices.
 */
import { query } from "@/lib/postgres";
import { publishNotification } from "@/lib/notifications/bus";
import { getDailySecret, verifyQr } from "./totp";

export type MessScanOutcome =
  | "ok"
  | "duplicate"
  | "expired"
  | "wrong_session"
  | "invalid_code"
  | "tampered"
  | "not_registered"
  | "manual_override"
  | "wrong_device";

export interface VerifyAndRedeemInput {
  qr: string;
  session_id: string;
  counter_id: string;
  operator_id: string;
  device_id: string;
  nowMs?: number;
}

export interface VerifyAndRedeemResult {
  outcome: MessScanOutcome;
  reason?: string;
  student_id?: string;
  student_name?: string;
  roll_no?: string;
  meal_type?: string;
  special_subline?: string | null;
}

async function logMessScanEvent(params: {
  student_id: string;
  session_id: string;
  counter_id: string;
  operator_id: string;
  device_id: string;
  outcome: MessScanOutcome;
  reason_text?: string;
  meta?: Record<string, unknown>;
}) {
  await query(
    `INSERT INTO public.mess_scan_events
       (student_id, session_id, counter_id, operator_id, device_id, outcome, reason_text, meta)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8::jsonb)`,
    [
      params.student_id,
      params.session_id,
      params.counter_id,
      params.operator_id,
      params.device_id,
      params.outcome,
      params.reason_text ?? null,
      JSON.stringify(params.meta ?? {}),
    ],
  ).catch(() => {});
}

function extractStudentIdFromQr(qr: string): string | null {
  const parts = qr.trim().split("|");
  if (parts.length >= 2 && /^[0-9a-f-]{36}$/i.test(parts[1])) {
    return parts[1];
  }
  return null;
}

export async function verifyAndRedeem(
  input: VerifyAndRedeemInput,
): Promise<VerifyAndRedeemResult> {
  const nowMs = input.nowMs ?? Date.now();
  const parsedSid = extractStudentIdFromQr(input.qr);

  // 1. Load active meal session from mess_days
  const { rows: sessionRows } = await query<{
    id: string;
    meal_date: string;
    meal_type: string;
    window_opens_at: string;
    window_closes_at: string;
    is_active: boolean;
  }>(
    `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at, is_active
       FROM public.mess_days
      WHERE id = $1::uuid
      LIMIT 1`,
    [input.session_id],
  );
  const session = sessionRows[0];
  if (!session || !session.is_active) {
    if (parsedSid) {
      await logMessScanEvent({
        student_id: parsedSid,
        session_id: input.session_id,
        counter_id: input.counter_id,
        operator_id: input.operator_id,
        device_id: input.device_id,
        outcome: "wrong_session",
        reason_text: "Session not found or inactive",
      });
    }
    return { outcome: "wrong_session", reason: "Session is not active" };
  }

  const opensMs = new Date(session.window_opens_at).getTime();
  const closesMs = new Date(session.window_closes_at).getTime();
  if (nowMs < opensMs || nowMs > closesMs) {
    if (parsedSid) {
      await logMessScanEvent({
        student_id: parsedSid,
        session_id: input.session_id,
        counter_id: input.counter_id,
        operator_id: input.operator_id,
        device_id: input.device_id,
        outcome: "wrong_session",
        reason_text: "Outside meal window",
      });
    }
    return { outcome: "wrong_session", reason: "Outside meal session window" };
  }

  if (!parsedSid) {
    return { outcome: "tampered", reason: "Malformed QR payload" };
  }

  // 2. Load student's daily TOTP secret
  const secretHex = await getDailySecret(parsedSid, session.meal_date);
  if (!secretHex) {
    await logMessScanEvent({
      student_id: parsedSid,
      session_id: input.session_id,
      counter_id: input.counter_id,
      operator_id: input.operator_id,
      device_id: input.device_id,
      outcome: "not_registered",
      reason_text: "No daily TOTP secret",
    });
    return { outcome: "not_registered", reason: "Student not registered for today" };
  }

  // 3. Verify HMAC + TOTP (±1 window)
  const v = verifyQr(input.qr, input.session_id, opensMs, secretHex, nowMs);
  if (!v.ok) {
    const outcome: MessScanOutcome =
      v.reason === "malformed" ? "tampered" : v.reason;
    await logMessScanEvent({
      student_id: parsedSid,
      session_id: input.session_id,
      counter_id: input.counter_id,
      operator_id: input.operator_id,
      device_id: input.device_id,
      outcome,
      reason_text: `QR verification failed: ${v.reason}`,
    });
    return { outcome, reason: `Verification failed (${v.reason})` };
  }

  // 4. Atomic monotonic counter update (prevents replay & concurrent race)
  const { rows: stateRows } = await query<{ student_id: string }>(
    `INSERT INTO public.mess_totp_state (student_id, session_id, last_counter, last_scan_at)
     VALUES ($1::uuid, $2::uuid, $3, NOW())
     ON CONFLICT (student_id, session_id) DO UPDATE
       SET last_counter = EXCLUDED.last_counter,
           last_scan_at = NOW()
       WHERE public.mess_totp_state.last_counter < EXCLUDED.last_counter
     RETURNING student_id`,
    [v.studentId, input.session_id, v.counter],
  );

  if (!stateRows[0]) {
    await logMessScanEvent({
      student_id: v.studentId,
      session_id: input.session_id,
      counter_id: input.counter_id,
      operator_id: input.operator_id,
      device_id: input.device_id,
      outcome: "duplicate",
      reason_text: "Already scanned in this session",
    });
    return {
      outcome: "duplicate",
      student_id: v.studentId,
      reason: "Already scanned in this session",
    };
  }

  // 5. Record successful scan + increment counter served count
  await logMessScanEvent({
    student_id: v.studentId,
    session_id: input.session_id,
    counter_id: input.counter_id,
    operator_id: input.operator_id,
    device_id: input.device_id,
    outcome: "ok",
  });

  await query(
    `INSERT INTO public.mess_session_counters (session_id, counter_id, served)
     VALUES ($1::uuid, $2::uuid, 1)
     ON CONFLICT (session_id, counter_id) DO UPDATE
       SET served = public.mess_session_counters.served + 1`,
    [input.session_id, input.counter_id],
  );

  // 6. Special item counter update + threshold notifications (80% / 100%)
  let specialSubline: string | null = null;
  const { rows: specialRows } = await query<{
    id: string;
    item_name: string;
    expected_count: number;
    served_count: number;
    low_threshold: string;
    status: string;
    low_notified_at: string | null;
    sold_out_notified_at: string | null;
  }>(
    `UPDATE public.mess_special_schedules
        SET served_count = served_count + 1,
            status = CASE
              WHEN served_count + 1 >= expected_count THEN 'sold_out'
              ELSE 'live'
            END
      WHERE session_id = $1::uuid
        AND counter_id = $2::uuid
        AND status IN ('planned', 'live')
      RETURNING id, item_name, expected_count, served_count, low_threshold::text,
                status, low_notified_at, sold_out_notified_at`,
    [input.session_id, input.counter_id],
  );

  const sp = specialRows[0];
  if (sp) {
    const remaining = Math.max(0, sp.expected_count - sp.served_count);
    if (sp.status === "sold_out") {
      specialSubline = `${sp.item_name} sold out — regular meal only`;
      if (!sp.sold_out_notified_at) {
        await query(
          `UPDATE public.mess_special_schedules SET sold_out_notified_at = NOW() WHERE id = $1::uuid AND sold_out_notified_at IS NULL`,
          [sp.id],
        );
        await publishNotification({
          eventType: "mess.special.sold_out",
          actorId: input.operator_id,
          actorRole: "operator",
          scope: "mess",
          title: `${sp.item_name} sold out`,
          message: `${sp.item_name} (${sp.expected_count} portions) is sold out — start redirecting.`,
          payload: { schedule_id: sp.id, item_name: sp.item_name, expected_count: sp.expected_count },
          priority: "high",
          channels: ["in_app"],
        }).catch(() => {});
      }
    } else {
      specialSubline = `${sp.item_name} ✓ — ${remaining}/${sp.expected_count} remaining`;
      const lowRatio = 1 - Number(sp.low_threshold || 0.2);
      if (
        sp.served_count >= Math.ceil(sp.expected_count * lowRatio) &&
        !sp.low_notified_at
      ) {
        await query(
          `UPDATE public.mess_special_schedules SET low_notified_at = NOW() WHERE id = $1::uuid AND low_notified_at IS NULL`,
          [sp.id],
        );
        await publishNotification({
          eventType: "mess.special.running_low",
          actorId: input.operator_id,
          actorRole: "operator",
          scope: "mess",
          title: `${sp.item_name} running low`,
          message: `~${remaining} portions of ${sp.item_name} remaining.`,
          payload: { schedule_id: sp.id, item_name: sp.item_name, remaining },
          priority: "high",
          channels: ["in_app"],
        }).catch(() => {});
      }
    }
  }

  // 7. Load student display info
  const { rows: userRows } = await query<{ name: string; unique_id: string }>(
    `SELECT name, unique_id FROM public.users WHERE id = $1::uuid LIMIT 1`,
    [v.studentId],
  );

  return {
    outcome: "ok",
    student_id: v.studentId,
    student_name: userRows[0]?.name ?? "Student",
    roll_no: userRows[0]?.unique_id ?? "",
    meal_type: session.meal_type,
    special_subline: specialSubline,
  };
}

export async function recordManualOverride(params: {
  student_id: string;
  session_id: string;
  counter_id: string;
  operator_id: string;
  device_id: string;
  reason_text: string;
}) {
  await logMessScanEvent({
    student_id: params.student_id,
    session_id: params.session_id,
    counter_id: params.counter_id,
    operator_id: params.operator_id,
    device_id: params.device_id,
    outcome: "manual_override",
    reason_text: params.reason_text,
  });

  await query(
    `INSERT INTO public.mess_session_counters (session_id, counter_id, served)
     VALUES ($1::uuid, $2::uuid, 1)
     ON CONFLICT (session_id, counter_id) DO UPDATE
       SET served = public.mess_session_counters.served + 1`,
    [params.session_id, params.counter_id],
  );

  await publishNotification({
    eventType: "mess.manual_override",
    actorId: params.operator_id,
    actorRole: "operator",
    scope: "mess",
    title: "Mess manual override recorded",
    message: `Operator recorded manual override: ${params.reason_text}`,
    payload: { session_id: params.session_id, student_id: params.student_id, reason: params.reason_text },
    priority: "high",
    channels: ["in_app"],
  }).catch(() => {});
}
