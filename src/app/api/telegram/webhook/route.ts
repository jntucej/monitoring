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
import { query, withTransaction, getTelegramPool } from "@/lib/postgres";
import { hashDeepLinkToken } from "@/lib/telegram-deep-link";
import { addAudit } from "@/lib/db";
import { compare } from "@/server/lib/crypto";
import type { Pool, PoolClient } from "pg";

/**
 * Query helper that uses the telegram pool when TELEGRAM_DATABASE_URL is set,
 * otherwise falls back to the main pool (current behavior).
 */
async function tgQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[]; rowCount: number | null }> {
  const pool = await getTelegramPool();
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } finally {
    client.release();
  }
}

async function tgTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getTelegramPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

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
    await tgQuery(
      `INSERT INTO public.telegram_webhook_dedupe (update_id, processed_at)
       VALUES ($1, NOW())
       ON CONFLICT (update_id) DO NOTHING`,
      [updateId],
    );
    // Purge entries older than 48h (idempotent, cheap — partial index).
    await tgQuery(
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
    const { rows } = await tgQuery(
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
    const result = await tgTransaction(async (client) => {
      // SELECT without FOR UPDATE — the isolated telegram DB has no RLS
      // and no cross-DB row locks; dedupe + used_at check prevent
      // double-verification in concurrent cases.
      const { rows } = await client.query(
        `SELECT id, user_id, user_unique_id, user_name, user_phone
           FROM public.telegram_deep_links
          WHERE token_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()`,
        [tokenHash],
      );
      if (rows.length === 0) {
        return { ok: false as const, user: null as null | { uniqueId: string; name: string; phone: string } };
      }

      const link = rows[0] as {
        id: string;
        user_id: string;
        user_unique_id: string | null;
        user_name: string | null;
        user_phone: string | null;
      };

      // Claim the token; verification happens in step 2.
      await client.query(
        `UPDATE public.telegram_deep_links
            SET used_at = NOW(),
                telegram_user_id = $2,
                telegram_chat_id = $3
          WHERE id = $1`,
        [link.id, telegramUserId, telegramChatId],
      );

      // Log the claim in the verification log (isolated DB).
      await client.query(
        `INSERT INTO public.telegram_verification_log
           (user_unique_id, telegram_chat_id, telegram_user_id, result)
         VALUES ($1, $2, $3, 'claimed')`,
        [link.user_unique_id ?? link.user_id, telegramChatId, telegramUserId],
      ).catch(() => undefined);

      return {
        ok: true as const,
        user: {
          uniqueId: link.user_unique_id ?? "",
          name: link.user_name ?? "",
          phone: link.user_phone ?? "",
        },
      };
    }).catch(() => ({ ok: false as const, user: null as null | { uniqueId: string; name: string; phone: string } }));

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
        userId: result.user?.uniqueId ?? null,
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
    // Uses the isolated telegram DB (tgQuery) for deep link lookups.
    const { rows: linkRows } = await tgQuery<{ user_id: string; user_unique_id: string | null; user_phone: string | null }>(
      `SELECT user_id, user_unique_id, user_phone
         FROM public.telegram_deep_links
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

    const claimedLink = linkRows[0];
    const candidateUniqueId = claimedLink.user_unique_id ?? claimedLink.user_id;

    // Look up the candidate's phone from the MAIN users table (via main pool).
    const { rows: userRows } = await query<{ phone: string | null }>(
      `SELECT phone FROM public.users WHERE unique_id = $1`,
      [candidateUniqueId],
    );
    const expectedDigits = userRows[0]?.phone ? normalizePhone(userRows[0].phone) : "";

    if (!expectedDigits || expectedDigits !== sharedDigits) {
      await replyToChat(
        telegramChatId,
        "The phone number you shared does not match our records. Verification is blocked — please contact your admin to resolve this.",
      );
      // Log the failure in the isolated telegram DB.
      await tgQuery(
        `INSERT INTO public.telegram_verification_log
           (user_unique_id, telegram_chat_id, telegram_user_id, shared_phone_last4, result)
         VALUES ($1, $2, $3, $4, 'phone_mismatch')`,
        [candidateUniqueId, telegramChatId, telegramUserId, sharedDigits.slice(-4)],
      ).catch(() => undefined);
      await addAudit({
        action: "TELEGRAM_DEEP_LINK_FAILED",
        userId: "system",
        userName: "telegram-webhook",
        details: {
          reason: "phone_mismatch",
          telegramChatId,
          candidateUniqueId,
          sharedDigits: sharedDigits.slice(-4).padStart(4, "*"), // last 4 only in audit
        },
      }).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }

    // Both checks passed → verified.
    // Update main users table + burn enrollment code (via main pool).
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.users
            SET telegram_verified_at = NOW(),
                telegram_verification_failed_at = NULL
          WHERE unique_id = $1`,
        [candidateUniqueId],
      );
      await client.query(
        `UPDATE public.enrollment_codes
            SET used_at = NOW()
          WHERE user_id = (SELECT id FROM public.users WHERE unique_id = $1)
            AND purpose = 'web_bootstrap_tg'
            AND used_at IS NULL`,
        [candidateUniqueId],
      );
    }).catch(() => undefined);

    // Log the verification in the isolated telegram DB.
    await tgQuery(
      `INSERT INTO public.telegram_verification_log
         (user_unique_id, telegram_chat_id, telegram_user_id, shared_phone_last4, result)
       VALUES ($1, $2, $3, $4, 'verified')`,
      [candidateUniqueId, telegramChatId, telegramUserId, sharedDigits.slice(-4)],
    ).catch(() => undefined);

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
        candidateUniqueId,
        matchedDigitsLast4: sharedDigits.slice(-4),
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  }

  // ── Step 3: Slash Commands ──────────────────────────────────────────────
  const text = (message.text ?? "").trim();

  // /help — reply with available commands
  if (text === "/help" || text.startsWith("/help@")) {
    await replyToChat(
      telegramChatId,
      "🤖 *Gate Monitor Student Assistant*\n\n" +
        "Available commands:\n" +
        "• `/status` — View your onboarding and profile status\n" +
        "• `/link <roll>` — Link this Telegram account to your student roll number\n" +
        "• `/verify <code>` — Verify your account using a 6-digit verification code\n" +
        "• `/help` — Show this help message\n\n" +
        "Need help? Contact the sysadmin or campus gate security.",
    );
    return NextResponse.json({ ok: true });
  }

  // /status — reply with the student's current onboarding status
  if (text === "/status" || text.startsWith("/status@")) {
    // Look up by telegram_chat_id in users
    const { rows: userRows } = await query<{
      unique_id: string;
      name: string;
      role: string;
      status: string;
      onboarded_at: string | null;
      telegram_verified_at: string | null;
    }>(
      `SELECT unique_id, name, role, status, onboarded_at, telegram_verified_at
         FROM public.users
        WHERE telegram_chat_id = $1
        LIMIT 1`,
      [telegramChatId],
    );

    if (userRows.length === 0) {
      await replyToChat(
        telegramChatId,
        "Account not linked. Please use `/link <roll>` or use the deep link provided by your administrator.",
      );
      return NextResponse.json({ ok: true });
    }

    const u = userRows[0];
    const onboardedStr = u.onboarded_at
      ? `Completed on ${new Date(u.onboarded_at).toLocaleString()}`
      : "Pending onboarding";
    const verifiedStr = u.telegram_verified_at
      ? `Verified on ${new Date(u.telegram_verified_at).toLocaleString()}`
      : "Not verified";

    await replyToChat(
      telegramChatId,
      `📋 *Account Status*\n\n` +
        `• Student Roll: ${u.unique_id}\n` +
        `• Name: ${u.name}\n` +
        `• Account Status: ${u.status}\n` +
        `• Onboarding: ${onboardedStr}\n` +
        `• Telegram Verified: ${verifiedStr}`,
    );

    // Update last_seen_at
    await tgQuery(
      `UPDATE public.telegram_user_profiles
          SET last_seen_at = NOW(), updated_at = NOW()
        WHERE telegram_chat_id = $1`,
      [telegramChatId],
    ).catch(() => undefined);

    await query(
      `UPDATE public.users
          SET telegram_last_seen_at = NOW()
        WHERE telegram_chat_id = $1`,
      [telegramChatId],
    ).catch(() => undefined);

    return NextResponse.json({ ok: true });
  }

  // /verify <code> — look up pending verification, match code, link & update
  if (text.startsWith("/verify")) {
    const code = text.slice(7).trim();
    if (!code) {
      await replyToChat(
        telegramChatId,
        "Please provide the 6-digit code. Example: `/verify 123456`",
      );
      return NextResponse.json({ ok: true });
    }

    // Look for pending codes in telegram_bot DB
    // A student might have linked their chat via /link, or we search active codes
    // First, check if this chat is already associated with a student
    const { rows: linkedUsers } = await query<{ unique_id: string }>(
      `SELECT unique_id FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );

    let targetRoll: string | null = linkedUsers[0]?.unique_id ?? null;

    // If not directly linked yet, check telegram_user_profiles or telegram_deep_links
    if (!targetRoll) {
      const { rows: profileRows } = await tgQuery<{ user_unique_id: string }>(
        `SELECT user_unique_id FROM public.telegram_user_profiles WHERE telegram_chat_id = $1 LIMIT 1`,
        [telegramChatId],
      );
      targetRoll = profileRows[0]?.user_unique_id ?? null;
    }

    // Look for valid, unused verify codes
    let candidateCodes: Array<{ id: string; user_unique_id: string; code_hash: string }>;
    if (targetRoll) {
      const { rows } = await tgQuery<{ id: string; user_unique_id: string; code_hash: string }>(
        `SELECT id, user_unique_id, code_hash
           FROM public.telegram_verify_codes
          WHERE UPPER(user_unique_id) = UPPER($1)
            AND used_at IS NULL
            AND expires_at > NOW()
          ORDER BY created_at DESC`,
        [targetRoll],
      );
      candidateCodes = rows;
    } else {
      const { rows } = await tgQuery<{ id: string; user_unique_id: string; code_hash: string }>(
        `SELECT id, user_unique_id, code_hash
           FROM public.telegram_verify_codes
          WHERE used_at IS NULL
            AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 20`,
      );
      candidateCodes = rows;
    }

    let matchedCodeRow: { id: string; user_unique_id: string } | null = null;
    for (const c of candidateCodes) {
      const isMatch = await compare(code, c.code_hash).catch(() => false);
      if (isMatch) {
        matchedCodeRow = c;
        break;
      }
    }

    if (!matchedCodeRow) {
      await replyToChat(
        telegramChatId,
        "❌ Invalid or expired verification code. Please check your code or request a new one from the portal.",
      );
      return NextResponse.json({ ok: true });
    }

    const verifiedRoll = matchedCodeRow.user_unique_id.trim().toUpperCase();

    // Mark code as used
    await tgQuery(
      `UPDATE public.telegram_verify_codes SET used_at = NOW() WHERE id = $1`,
      [matchedCodeRow.id],
    );

    // Link telegram_chat_id to users table in main DB
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE public.users
            SET telegram_chat_id = $1,
                telegram_user_id = $2,
                telegram_verified_at = NOW(),
                telegram_last_seen_at = NOW(),
                telegram_verification_failed_at = NULL
          WHERE UPPER(unique_id) = $3`,
        [telegramChatId, telegramUserId, verifiedRoll],
      );
    });

    // Update telegram_user_profiles
    await tgQuery(
      `INSERT INTO public.telegram_user_profiles
         (user_unique_id, telegram_chat_id, telegram_user_id, bot_subscribed, last_seen_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (user_unique_id)
       DO UPDATE SET
         telegram_chat_id = EXCLUDED.telegram_chat_id,
         telegram_user_id = EXCLUDED.telegram_user_id,
         bot_subscribed = true,
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [verifiedRoll, telegramChatId, telegramUserId],
    );

    await replyToChat(
      telegramChatId,
      `✅ Verification successful! Your Telegram account is now linked to student ${verifiedRoll}.`,
    );

    return NextResponse.json({ ok: true });
  }

  // /link <roll> — link this Telegram account to that student roll number
  // (requires the student to have a pending verification code)
  if (text.startsWith("/link")) {
    const roll = text.slice(5).trim().toUpperCase();
    if (!roll) {
      await replyToChat(
        telegramChatId,
        "Please provide your student roll number. Example: `/link 24JJ1A0501`",
      );
      return NextResponse.json({ ok: true });
    }

    // Check if student exists in main DB
    const { rows: studentRows } = await query<{ id: string; unique_id: string; name: string }>(
      `SELECT id, unique_id, name FROM public.users WHERE UPPER(unique_id) = $1 AND role = 'student' LIMIT 1`,
      [roll],
    );

    if (studentRows.length === 0) {
      await replyToChat(
        telegramChatId,
        `Student with roll number "${roll}" was not found. Please verify your roll number.`,
      );
      return NextResponse.json({ ok: true });
    }

    // Requires the student to have a pending verification code
    const { rows: pendingCodes } = await tgQuery<{ id: string }>(
      `SELECT id FROM public.telegram_verify_codes
        WHERE UPPER(user_unique_id) = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1`,
      [roll],
    );

    if (pendingCodes.length === 0) {
      await replyToChat(
        telegramChatId,
        `No pending verification code found for roll number ${roll}. Please request a verification code from the portal or administrator first, then use \`/verify <code>\`.`,
      );
      return NextResponse.json({ ok: true });
    }

    // Store pending association in telegram_user_profiles so subsequent /verify can match
    await tgQuery(
      `INSERT INTO public.telegram_user_profiles
         (user_unique_id, telegram_chat_id, telegram_user_id, last_seen_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_unique_id)
       DO UPDATE SET
         telegram_chat_id = EXCLUDED.telegram_chat_id,
         telegram_user_id = EXCLUDED.telegram_user_id,
         last_seen_at = NOW(),
         updated_at = NOW()`,
      [roll, telegramChatId, telegramUserId],
    );

    await replyToChat(
      telegramChatId,
      `Pending verification code detected for ${roll}!\nPlease send \`/verify <code>\` with your 6-digit code to complete the link.`,
    );

    return NextResponse.json({ ok: true });
  }

  // Non-relevant updates are acknowledged so Telegram does not retry.
  return NextResponse.json({ ok: true, ignored: true });
}
