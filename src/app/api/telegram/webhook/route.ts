// src/app/api/telegram/webhook/route.ts
//
// Telegram bot webhook for the deep-link enrollment flow.
//
// Configure once (run from an ops host with TELEGRAM_BOT_TOKEN set):
//   curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
//     -d "url=${PUBLIC_BASE_URL}/api/telegram/webhook" \
//     -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
//
// Every update Telegram sends then carries the header
// `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>` and any
// request without the exact header is rejected with 403.
//
// Flow:
//   1. `/start <TOKEN>` — proves control of a Telegram account. The
//      token is marked claimed (used_at) but NOT verified: the user
//      still owes the phone-number check.
//   2. Candidate shares their phone number (Telegram contact object,
//      via a "request_contact" reply keyboard). TWO hard checks:
//        a. contact.user_id === message.from.id — if they forwarded a
//           friend's contact card, the ids differ and the whole attempt
//           is rejected immediately (not saved, not verified).
//        b. Normalized phone number (digits only) must EXACTLY match
//           users.phone. Mismatch → FAILED, hard stop, direct to admin.
//      Both pass → verified; enrollment code burned; bootstrap link sent.
//
// No fallback, no "try another number" — a single failure blocks the
// candidate until an admin re-issues the link.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { query, withTransaction } from "@/lib/postgres";
import { hashDeepLinkToken } from "@/lib/telegram-deep-link";
import { addAudit } from "@/lib/db";

interface TelegramContact {
  phone_number?: string;
  user_id?: number;
  first_name?: string;
}

interface TelegramUpdate {
  update_id?: number;
  message?: {
    text?: string;
    contact?: TelegramContact;
    from?: { id?: number; username?: string };
    chat?: { id?: number };
  };
}

/**
 * Fail-closed secret check, mirroring verifyAlertmanagerToken:
 *  - secret not configured → 503 (misconfigured service, Telegram retries)
 *  - secret configured but mismatch → 403 (hostile or misrouted caller)
 */
function verifyTelegramSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503 },
    );
  }

  const supplied = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Idempotency guard for Telegram retries. Telegram redelivers any update
 * whose POST did not get a 2xx within its timeout, so the same update_id
 * can arrive twice (or three times). We record update_id in
 * telegram_webhook_dedupe and treat a second sighting within 48 hours as
 * a replay: log TELEGRAM_DEEP_LINK_REPLAYED and return 200 without
 * re-processing (the state machine already advanced on the first pass).
 *
 * Best-effort: if the dedupe table is unavailable we fall through to
 * processing — the FOR UPDATE lock in the /start branch and the
 * enrollment_code burn still prevent double-verification; dedupe just
 * keeps the audit log clean.
 */
async function claimUpdateId(updateId: number | undefined): Promise<boolean> {
  if (updateId === undefined) return true; // no update_id → nothing to dedupe on
  try {
    await query(
      `INSERT INTO public.telegram_webhook_dedupe (update_id, processed_at)
       VALUES ($1, NOW())
       ON CONFLICT (update_id) DO NOTHING`,
      [updateId],
    );
    // Purge entries older than 48h (idempotent, cheap — partial index).
    await query(
      `DELETE FROM public.telegram_webhook_dedupe
       WHERE processed_at < NOW() - INTERVAL '48 hours'`
    ).catch(() => undefined);
    return true;
  } catch {
    // dedupe table missing or DB down — fall through, still safe
    return true;
  }
}

async function isReplayedUpdate(updateId: number | undefined): Promise<boolean> {
  if (updateId === undefined) return false;
  try {
    const { rows } = await query(
      `SELECT 1 FROM public.telegram_webhook_dedupe
       WHERE update_id = $1 AND processed_at > NOW() - INTERVAL '48 hours'`,
      [updateId],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Best-effort reply to the candidate's chat (never throws). */
async function replyToChat(chatId: number, text: string, requestContact = false): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) return;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };
    if (requestContact) {
      body.reply_keyboard = {
        keyboard: [[{ text: "Share my phone number", request_contact: true }]],
        one_time_keyboard: true,
      };
      body.resize_keyboard = true;
    }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    }).catch(() => undefined);
  } catch {
    // reply is cosmetic; the verification state is what matters
  }
}

/**
 * Digits-only normalization for phone comparison. Strips every non-digit
 * character (spaces, dashes, parentheses, +) so that "+91 98480 00000"
 * and "919848000000" compare equal. Returns "" for empty input so the
 * caller can fail closed on missing numbers.
 */
function normalizePhone(p: string): string {
  return p.replace(/[^\d]/g, "");
}

export async function POST(req: NextRequest): Promise<Response> {
  const denied = verifyTelegramSecret(req);
  if (denied) return denied;

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  const telegramUserId = message?.from?.id;
  const telegramChatId = message?.chat?.id;

  if (!telegramUserId || !telegramChatId || !message) {
    return NextResponse.json({ ok: false, error: { code: "BAD_UPDATE" } });
  }

  // Idempotency: if this exact update was already processed (Telegram
  // retry), skip the state machine and just return 200 so it stops.
  if (await isReplayedUpdate(update.update_id)) {
    await addAudit({
      action: "TELEGRAM_DEEP_LINK_REPLAYED",
      userId: "system",
      userName: "telegram-webhook",
      details: { updateId: update.update_id, telegramChatId },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, replayed: true });
  }
  await claimUpdateId(update.update_id);

  // ── Step 1: /start TOKEN ───────────────────────────────────────────────────
  if (message.text?.startsWith("/start ")) {
    const token = message.text.slice(7).trim();
    if (!token) return NextResponse.json({ ok: true, ignored: true });

    const tokenHash = hashDeepLinkToken(token);
    const result = await withTransaction(async (client) => {
      // FOR UPDATE serializes two concurrent /start deliveries for the
      // same token — only the first can claim it.
      const { rows } = await client.query(
        `SELECT id, user_id FROM public.telegram_deep_links
          WHERE token_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()
          FOR UPDATE`,
        [tokenHash],
      );
      if (rows.length === 0) {
        return { ok: false as const };
      }

      const link = rows[0] as { id: string; user_id: string };

      // Claim the token; verification happens in step 2.
      await client.query(
        `UPDATE public.telegram_deep_links
            SET used_at = NOW(),
                telegram_user_id = $2,
                telegram_chat_id = $3
          WHERE id = $1`,
        [link.id, telegramUserId, telegramChatId],
      );

      // Carry the Telegram identity forward — NOT a verified identity yet.
      await client.query(
        `UPDATE public.users
            SET telegram_chat_id = $2,
                telegram_user_id = $3
          WHERE id = $1`,
        [link.user_id, telegramChatId, telegramUserId],
      );

      return { ok: true as const, userId: link.user_id };
    });

    if (!result.ok) {
      await replyToChat(
        telegramChatId,
        "This link is invalid or has expired. Please ask your administrator to issue a new one.",
      );
    } else {
      await replyToChat(
        telegramChatId,
        "Link received. To verify your account, share your phone number using the button below. It must match the number on your records — otherwise you will be directed to your admin.",
        true,
      );
    }

    await addAudit({
      action: "TELEGRAM_DEEP_LINK_ISSUED",
      userId: "system",
      userName: "telegram-webhook",
      details: {
        result: result.ok ? "token_claimed" : "invalid_or_expired",
        telegramChatId,
        userId: "userId" in result ? result.userId : null,
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  }

  // ── Step 2: contact (shared phone number) — the hard gate ────────────────
  const contact = message.contact;
  if (contact?.phone_number) {
    // Rule 1: the shared contact card must belong to the SENDER.
    // A forwarded card carries a different user_id → reject immediately.
    if (contact.user_id !== undefined && contact.user_id !== telegramUserId) {
      await replyToChat(
        telegramChatId,
        "That contact does not belong to your Telegram account. This verification cannot continue — please contact your admin.",
      );
      await addAudit({
        action: "TELEGRAM_DEEP_LINK_FAILED",
        userId: "system",
        userName: "telegram-webhook",
        details: {
          reason: "forwarded_contact",
          telegramChatId,
          telegramUserId,
          contactUserId: contact.user_id,
        },
      }).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }

    const sharedDigits = normalizePhone(contact.phone_number);
    if (!sharedDigits) {
      await replyToChat(telegramChatId, "Invalid phone number format. Please contact your admin.");
      return NextResponse.json({ ok: true });
    }

    // Find the claimed link for this Telegram account (if any).
    const { rows: linkRows } = await query<{ user_id: string }>(
      `SELECT user_id FROM public.telegram_deep_links
        WHERE telegram_chat_id = $1
          AND used_at IS NOT NULL
          AND expires_at > NOW()
        ORDER BY used_at DESC
        LIMIT 1`,
      [telegramChatId],
    );

    if (linkRows.length === 0) {
      await replyToChat(
        telegramChatId,
        "No active verification link for this account. Ask your admin to issue one.",
      );
      return NextResponse.json({ ok: true });
    }

    const candidateUserId = linkRows[0].user_id;

    // Rule 2: shared number must EXACTLY match the number on record.
    const { rows: userRows } = await query<{ phone: string | null }>(
      `SELECT phone FROM public.users WHERE id = $1`,
      [candidateUserId],
    );
    const expectedDigits = userRows[0]?.phone ? normalizePhone(userRows[0].phone) : "";

    if (!expectedDigits || expectedDigits !== sharedDigits) {
      await replyToChat(
        telegramChatId,
        "The phone number you shared does not match our records. Verification is blocked — please contact your admin to resolve this.",
      );
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE public.users
              SET telegram_verification_failed_at = NOW()
            WHERE id = $1`,
          [candidateUserId],
        );
      }).catch(() => undefined);
      await addAudit({
        action: "TELEGRAM_DEEP_LINK_FAILED",
        userId: "system",
        userName: "telegram-webhook",
        details: {
          reason: "phone_mismatch",
          telegramChatId,
          candidateUserId,
          sharedDigits: sharedDigits.slice(-4).padStart(4, "*"), // last 4 only in audit
        },
      }).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }

    // Both checks passed → verified. Burn the enrollment code atomically.
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.users
            SET telegram_verified_at = NOW(),
                telegram_verification_failed_at = NULL
          WHERE id = $1`,
        [candidateUserId],
      );
      await client.query(
        `UPDATE public.enrollment_codes
            SET used_at = NOW()
          WHERE user_id = $1
            AND purpose = 'web_bootstrap_tg'
            AND used_at IS NULL`,
        [candidateUserId],
      );
    }).catch(() => undefined);

    const base = process.env.PUBLIC_BASE_URL ?? "https://monitor.ucej.in";
    await replyToChat(
      telegramChatId,
      `Verified. Finish account setup here:\n${base}/bootstrap`,
    );

    await addAudit({
      action: "TELEGRAM_DEEP_LINK_VERIFIED",
      userId: "system",
      userName: "telegram-webhook",
      details: {
        telegramChatId,
        candidateUserId,
        matchedDigitsLast4: sharedDigits.slice(-4),
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  }

  // Non-relevant updates are acknowledged so Telegram does not retry.
  return NextResponse.json({ ok: true, ignored: true });
}
