import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { createHash, randomBytes } from "crypto";
import { query, addAudit } from "@/lib/db";
import {
  resolveMessEligibility,
  isOnApprovedLeave,
  campusPresence,
  type MessEligibility,
} from "@/lib/mess-eligibility";

/**
 * POST /api/cron/mess-finalize
 *
 * Finds active mess days whose selection window has closed (window_closes_at
 * + 5 minutes) and locks tokens:
 *   1. Sets tokens_locked_at on the day.
 *   2. Applies stored default preferences to eligible hostellers who never
 *      selected (will_be_present defaults to FALSE for them).
 *   3. Issues a token for every selection + defaulted student:
 *        token_code = MESS-<6 random alphanumeric>
 *        qr_payload_hash = SHA-256 hex of the JSON payload
 *   4. Logs FINAL_COUNT per day.
 */
function randomCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % 36];
  return out;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Days past their close window that have not been locked yet.
    const daysRes = await query(
      `SELECT id, meal_date, window_opens_at, window_closes_at
         FROM mess_days
        WHERE is_active = TRUE
          AND tokens_locked_at IS NULL
          AND window_closes_at IS NOT NULL
          AND NOW() >= window_closes_at + INTERVAL '5 minutes'
        ORDER BY meal_date ASC`
    );

    const finalized: Array<{ dayId: string; mealDate: string; defaulted: number; tokensIssued: number; excluded: number }> = [];

    for (const day of daysRes.rows as any[]) {
      // 1. Lock the day.
      await query(
        `UPDATE mess_days SET tokens_locked_at = NOW() WHERE id::text = $1`,
        [day.id]
      );
      let excluded = 0;

      // 2. Apply defaults for eligible hostellers without a selection.
      const defaultedRes = await query(
        `INSERT INTO mess_preferences (user_id, mess_day_id, primary_item, will_be_present, hostel_block)
         SELECT u.id, $1::uuid, d.primary_item, FALSE, sd.hostel_block
           FROM users u
           JOIN student_details sd ON sd.user_id::text = u.id::text
           JOIN mess_default_preferences d ON d.user_id::text = u.id::text
          WHERE u.role = 'student'
            AND sd.hostel_block IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM mess_preferences p
               WHERE p.user_id::text = u.id::text AND p.mess_day_id::text = $1
            )
         RETURNING user_id`,
        [day.id]
      );

      // 3. Issue tokens for all selections that lack a token.
      const tokenRows = await query(
        `SELECT p.user_id, p.primary_item, p.will_be_present,
                d.window_closes_at,
                COALESCE((SELECT ARRAY(
                   SELECT mi.label FROM mess_preference_sub_items spi
                   JOIN mess_menu_items mi ON mi.id::text = spi.menu_item_id::text
                  WHERE spi.preference_id::text = p.id::text ORDER BY mi.sort_order ASC
                 )::text, ARRAY[]::text) AS sub_labels,
                COALESCE((SELECT ARRAY(
                   SELECT spi.menu_item_id FROM mess_preference_sub_items spi
                  WHERE spi.preference_id::text = p.id::text
                 )::text, ARRAY[]::text) AS sub_item_ids
           FROM mess_preferences p
           JOIN mess_days d ON d.id = p.mess_day_id
          WHERE p.mess_day_id::text = $1
            AND NOT EXISTS (
              SELECT 1 FROM mess_tokens t
               WHERE t.user_id::text = p.user_id::text AND t.mess_day_id::text = p.mess_day_id::text
            )`,
        [day.id]
      );

      let tokensIssued = 0;
      for (const tr of tokenRows.rows as any[]) {
        const subLabels: string[] = tr.sub_labels ?? [];
        const subItemIds: string[] = tr.sub_item_ids ?? [];
        const userId: string = tr.user_id;

        // ── Eligibility gate: reconcile leave + presence + opt-out + status ──
        // Only the two non-trivial signals are queried per student; opt-out is
        // already on the row (will_be_present) and hasPreference is true here
        // (this loop only runs for students with a mess_preferences row).
        const onApprovedLeave = await isOnApprovedLeave(
          userId,
          day.window_opens_at,
          day.window_closes_at,
        ).catch(() => false);
        const presence = (await campusPresence(userId, day.meal_date).catch(() => "unknown")) as
          | "in"
          | "out"
          | "returned_today"
          | "unknown";
        const { rows: [u] } = await query<{ status: string; hostel_block: string | null }>(
          `SELECT u.status, sd.hostel_block
             FROM users u
             LEFT JOIN student_details sd ON sd.user_id::text = u.id::text
            WHERE u.id = $1::uuid`,
          [userId],
        );
        const status = u?.status ?? "ACTIVE";
        const isHosteller = (u?.hostel_block ?? tr.hostel_block ?? null) != null;
        const optedOut = tr.will_be_present === false || tr.will_be_present === "false" || tr.will_be_present === 0;

        const elig: MessEligibility = resolveMessEligibility({
          isHosteller,
          userStatus: status,
          optedOut,
          onApprovedLeave,
          presence,
          hasPreference: true,
        });

        // Store the decision (the dashboard + verifier + student empty-state
        // all read this row instead of recomputing).
        await query(
          `INSERT INTO mess_eligibility (user_id, mess_day_id, eligible, reason, explanation)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5)
           ON CONFLICT (user_id, mess_day_id) DO UPDATE
             SET eligible = EXCLUDED.eligible,
                 reason = EXCLUDED.reason,
                 explanation = EXCLUDED.explanation,
                 decided_at = NOW()`,
          [userId, day.id, elig.eligible, elig.reason, elig.explanation],
        );

        if (!elig.eligible) {
          excluded += 1;
          continue; // no token for an ineligible student
        }

        const tokenCode = `MESS-${randomCode()}`;
        const qrPayload = JSON.stringify({
          type: "MESS_TOKEN",
          messDayId: day.id,
          mealDate: day.meal_date,
          userId,
          primaryItem: tr.primary_item,
          subItemIds,
          tokenCode,
        });
        const qrPayloadHash = createHash("sha256").update(qrPayload).digest("hex");
        const expiresAt = new Date(new Date(tr.window_closes_at).getTime() + 60 * 60 * 1000).toISOString();

        await query(
          `INSERT INTO mess_tokens
             (user_id, mess_day_id, token_code, qr_payload_hash,
              primary_item, sub_item_labels, expires_at)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::text[], $7::timestamptz)`,
          [userId, day.id, tokenCode, qrPayloadHash, tr.primary_item, subLabels, expiresAt]
        );
        tokensIssued += 1;
      }

      await query(
        `INSERT INTO mess_notifications_log
           (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
         SELECT 'system-cron'::uuid, $1::uuid, 'FINAL_COUNT', 'system', 'SENT',
                jsonb_build_object(
                  'defaulted', $2::int,
                  'tokensIssued', $3::int,
                  'excluded', $4::int,
                  'mealDate', $5::text
                ),
                NOW()`,
        [day.id, defaultedRes.rows.length, tokensIssued, excluded, day.meal_date]
      );

      finalized.push({
        dayId: day.id,
        mealDate: day.meal_date,
        defaulted: defaultedRes.rows.length,
        tokensIssued,
        excluded,
      });
    }

    if (finalized.length > 0) {
      await addAudit({
        action: "MESS_FINAL_COUNT",
        userId: "system-cron",
        userName: "Cron Scheduler",
        role: "sysadmin",
        details: { finalized },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        daysFinalized: finalized.length,
        finalized,
      },
    });
  } catch (err) {
    console.error("[cron/mess-finalize]", err);
    return NextResponse.json(
      { success: false, error: { message: errMsg(err) } },
      { status: 500 }
    );
  }
}
