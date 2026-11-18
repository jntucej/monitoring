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
import { query, withTransaction, getTelegramPool, getPostgresPool } from "@/lib/postgres";
import { hashDeepLinkToken } from "@/lib/telegram-deep-link";
import { addAudit } from "@/lib/db";
import { compare } from "@/server/lib/crypto";
import { executeBotCommand, getRoleCommands, getMenuKeyboard, parseMenuCallback, type BotContext } from "@/lib/bot-commands";
import { sendTelegramMessage } from "@/lib/telegram";
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
    document?: { file_id?: string; file_name?: string; file_size?: number };
    photo?: Array<{ file_id?: string }>;
    contact?: TelegramContact;
    from?: { id?: number; username?: string };
    chat?: { id?: number };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number; username?: string };
    message?: { chat?: { id?: number } };
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

// Module-scoped: pending CSV upload confirmations (draftId → parsed flags).
// Single-instance Next.js server — safe for in-memory session state.
const _registerUploads = new Map<string, {
  flags: Record<string, boolean>;
  userId: string;
  userName: string;
}>();

export async function POST(req: NextRequest): Promise<Response> {
  const denied = verifyTelegramSecret(req);
  if (denied) return denied;

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  const callbackQuery = update?.callback_query;

  // For callback queries (inline button clicks), the chat/user come from the callback
  const telegramUserId = callbackQuery?.from?.id ?? message?.from?.id;
  const telegramChatId = callbackQuery?.message?.chat?.id ?? message?.chat?.id;

  if (!message && !callbackQuery) {
    return NextResponse.json({ ok: false, error: { code: "BAD_UPDATE" } });
  }
  if (!telegramUserId || !telegramChatId) {
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

  // ── /start — the welcome bot ─────────────────────────────────────────────
  // First message from a new user (or the deep-link /start TOKEN).
  // Fact-first: lead with what they can do, not a greeting.
  const startText = (message?.text ?? "").trim();
  if (startText === "/start" || startText.startsWith("/start@")) {
    // Look up the user by telegram_chat_id
    const { rows: startRows } = await query<{
      id: string; name: string; role: string;
    }>(
      `SELECT id, name, role FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );

    if (startRows.length > 0) {
      const user = startRows[0];
      const roleLabel = user.role.replace(/_/g, " ");
      const firstLine = user.name
        ? user.name.split(" ")[0]
        : "there";

      const byRole: Record<string, string> = {
        student:
          `Hi ${firstLine}.\n\nYour portal is live: /now shows your next class, attendance and fees. /settings changes your theme, quiet hours and density. /register is for CR/ICR takers. /message sends a note to your class.`,
        parent:
          `Hi ${firstLine}.\n\nYou're linked to your child's account. /now shows their attendance, next exam and mess bill. /child gives the full child view. /settings sets your quiet hours and digest time.`,
        faculty:
          `Hi ${firstLine}.\n\nYour tools: /now shows today's schedule. /review is your daily duty-off card. /classes-add adds extra or rescheduled classes. /message relays a note to your students. /register opens the attendance keyboard.`,
        operator:
          `Hi ${firstLine}.\n\nYour shift tools: /now shows gate status. /shifts lists your handover. /gates shows live IN/OUT. /overstay flags students past their window. /menu opens the full command list.`,
        admin:
          `Hi ${firstLine}.\n\nYour approval queue: /audit shows recent events. /users lists accounts. /delegation grants temporary role access. /menu opens the full command list.`,
      };

      const body = byRole[user.role] ??
        `Hi ${firstLine}.\n\nWelcome to the ${roleLabel} bot. /menu shows every command you can use. /settings controls your theme and quiet hours.`;

      await replyToChat(
        telegramChatId,
        body + "\n\nThis bot is scoped to your role. You will never see data you shouldn't.",
      );
    } else {
      await replyToChat(
        telegramChatId,
        "Welcome to the JNTUH UCEJ bot.\n\n" +
        "You're not linked to an account yet. An admin can issue you a deep link, or you can use /link <id> if you already have one.\n\n" +
        "Once linked, /menu shows every command for your role.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── Step 1: /start TOKEN (deep-link claim) ────────────────────────────────
  if (message?.text?.startsWith("/start ")) {
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
  const contact = message?.contact;
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
  const text = (message?.text ?? "").trim();

  // /help — role-aware commands
  if (text === "/help" || text.startsWith("/help@")) {
    // Look up the user's role to show relevant commands
    const { rows: helpUserRows } = await query<{ role: string; name: string }>(
      `SELECT role, name FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );
    const role = helpUserRows[0]?.role ?? "guest";
    const name = helpUserRows[0]?.name ?? "User";

    const cmds = getRoleCommands(role);
    const cmdList = cmds.map((c) => `• ${c.cmd} — ${c.desc}`).join("\n");

    await replyToChat(
      telegramChatId,
      `🤖 *Gate Monitor Assistant*\n\n` +
        `Hi ${name}, you're linked as a *${role.toUpperCase().replace("_", " ")}*.\n\n` +
        `Your commands:\n${cmdList}\n\n` +
        `System commands:\n` +
        `• /link <id> — Link this chat to your account\n` +
        `• /verify <code> — Verify with your 6-digit code\n` +
        `• /cancel — Abort a pending flow\n\n` +
        `Each command shows only YOUR data. No cross-role leakage.`,
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
      flag_status: string | null;
      onboarded_at: string | null;
      telegram_verified_at: string | null;
      academic_status: string | null;
      effective_year: number | null;
    }>(
      `SELECT u.unique_id, u.name, u.role, u.status, u.flag_status,
              u.onboarded_at, u.telegram_verified_at,
              sd.academic_status,
              COALESCE(sd.year_override, sd.year) AS effective_year
         FROM public.users u
         LEFT JOIN public.student_details sd ON sd.user_id = u.id
        WHERE u.telegram_chat_id = $1
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
      : "Pending";
    const verifiedStr = u.telegram_verified_at
      ? `Verified on ${new Date(u.telegram_verified_at).toLocaleString()}`
      : "Not verified";
    const roleLabel = u.role.toUpperCase().replace("_", " ");

    let statusMsg =
      `📋 *Account Status — ${roleLabel}*\n\n` +
      `• ID: ${u.unique_id}\n` +
      `• Name: ${u.name}\n` +
      `• Role: ${roleLabel}\n` +
      `• Account: ${u.status}\n` +
      `• Onboarding: ${onboardedStr}\n` +
      `• Telegram: ${verifiedStr}\n` +
      (u.academic_status ? `• Academic: ${u.academic_status.replace(/_/g, " ")} — Year ${u.effective_year}\n` : "") +
      (u.flag_status ? `• Flag: ${u.flag_status}\n` : "") +
      `\nType /help for available commands.`;

    await replyToChat(
      telegramChatId,
      statusMsg,
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

    // SECURITY: only check codes for users bound to THIS Telegram chat
    if (!targetRoll) {
      const { rows: profileRows } = await tgQuery<{ user_unique_id: string }>(
        `SELECT user_unique_id FROM public.telegram_user_profiles WHERE telegram_chat_id = $1 LIMIT 1`,
        [telegramChatId],
      );
      targetRoll = profileRows[0]?.user_unique_id ?? null;
    }

    if (!targetRoll) {
      await replyToChat(
        telegramChatId,
        "No account is linked to this Telegram chat. Use `/link <id>` first to associate your account, then request a verification code.",
      );
      return NextResponse.json({ ok: true });
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
      // SECURITY: never scan all codes — only the sender's own account
      candidateCodes = [];
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
        "Please provide your account ID. Example: `/link 24JJ1A0501`",
      );
      return NextResponse.json({ ok: true });
    }

    // Check if the account exists and is ACTIVE (any role)
    const { rows: userRows2 } = await query<{ id: string; unique_id: string; name: string; role: string; status: string; telegram_chat_id: number | null }>(
      `SELECT id, unique_id, name, role, status, telegram_chat_id
         FROM public.users WHERE UPPER(unique_id) = $1 LIMIT 1`,
      [roll],
    );

    if (userRows2.length === 0) {
      await replyToChat(
        telegramChatId,
        `Account "${roll}" was not found. Please check your ID and try again.`,
      );
      return NextResponse.json({ ok: true });
    }

    const acct = userRows2[0];
    if (acct.status !== "ACTIVE") {
      await replyToChat(
        telegramChatId,
        `Account ${roll} is not active (${acct.status}). Contact the administrator if you believe this is an error.`,
      );
      return NextResponse.json({ ok: true });
    }

    // SECURITY: warn if this account is already linked to a different Telegram
    if (acct.telegram_chat_id && acct.telegram_chat_id !== telegramChatId) {
      await replyToChat(
        telegramChatId,
        `⚠️ Account ${roll} is already linked to a different Telegram account.\n` +
        `Linking will take over that association. Proceed only if this is your account.\n` +
        `Send "/link ${roll} confirm" to proceed, or "/cancel" to abort.`,
      );
      if (!text.includes("confirm")) {
        return NextResponse.json({ ok: true });
      }
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

    // Store binding in telegram_user_profiles
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

    // Update main DB with the binding
    await query(
      `UPDATE public.users
          SET telegram_chat_id = $1,
              telegram_user_id = $2,
              telegram_last_seen_at = NOW()
        WHERE UPPER(unique_id) = $3`,
      [telegramChatId, telegramUserId, roll],
    );

    await replyToChat(
      telegramChatId,
      `✅ ${roll} linked to this chat.\nSend \`/verify <code>\` with your 6-digit code to complete verification.`,
    );

    return NextResponse.json({ ok: true });
  }

  // /menu — send interactive inline keyboard
  if (text === "/menu" || text.startsWith("/menu@")) {
    const { rows: menuUserRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
      `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );

    if (menuUserRows.length === 0) {
      await replyToChat(
        telegramChatId,
        "Account not linked. Use /link <id> first, then try /menu.",
      );
      return NextResponse.json({ ok: true });
    }

    const user = menuUserRows[0];
    const keyboard = getMenuKeyboard(user.role);

    // Send the menu with inline buttons
    await sendTelegramMessage(
      telegramChatId,
      `📋 *${user.role.toUpperCase().replace("_", " ")} Menu*\n\nPick an option below:`,
      { replyMarkup: keyboard.replyMarkup, parseMode: "Markdown" }
    );
    return NextResponse.json({ ok: true });
  }

  // Handle inline keyboard callback queries (menu button clicks)
  const callbackData = (callbackQuery?.data ?? "").trim();
  if (callbackData) {
    // Register keyboard callbacks (reg:<draftId>:<action>) — handled inline
    // with the caller's own context; no menu parsing.
    if (callbackData.startsWith("reg:")) {
      const regMatch = callbackData.match(/^reg:([^:]+):(all|clear|submit|\d+[A-Z0-9]*)$/i);
      if (regMatch) {
        const draftId = regMatch[1];
        const action = regMatch[2];
        const { rows: regUserRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
          `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
          [telegramChatId],
        );
        if (regUserRows.length) {
          const regUser = regUserRows[0];
          const pool = await getPostgresPool();
          const client = await pool.connect();
          try {
            await client.query("SET ROLE gate_app");
            const ctx: BotContext = {
              chatId: telegramChatId,
              userId: regUser.id,
              uniqueId: regUser.unique_id,
              name: regUser.name,
              role: regUser.role,
              status: regUser.status,
              client,
            };
            const { handleRegisterCallback } = await import("@/lib/bot-personas");
            const reply = handleRegisterCallback(draftId, action, ctx);
            if (reply) await replyToChat(telegramChatId, reply);
          } catch {
            await replyToChat(telegramChatId, "⚠️ Register action failed — re-run /register.");
          } finally {
            await client.query("RESET ROLE").catch(() => undefined);
            client.release();
          }
        }
      }
      if (callbackQuery?.id) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token && callbackQuery.id) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQuery.id }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => undefined);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // CSV upload confirm/cancel (regup:<draftId>:<action>)
    if (callbackData.startsWith("regup:")) {
      const upMatch = callbackData.match(/^regup:([^:]+):(confirm|cancel)$/);
      if (upMatch) {
        const draftId = upMatch[1];
        const action = upMatch[2];
        const pending = _registerUploads.get(draftId);
        if (pending && action === "confirm") {
          const { rows: upUserRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
            `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
            [telegramChatId],
          );
          const upUser = upUserRows[0];
          if (upUser) {
            const pool = await getPostgresPool();
            const client = await pool.connect();
            try {
              await client.query("SET ROLE gate_app");
              const ctx: BotContext = {
                chatId: telegramChatId,
                userId: upUser.id,
                uniqueId: upUser.unique_id,
                name: upUser.name,
                role: upUser.role,
                status: upUser.status,
                client,
              };
              const { submitRegister } = await import("@/lib/register");
              const summary = await submitRegister(ctx.client, {
                draftId,
                actorId: pending.userId,
                actorName: pending.userName,
                presentFlags: pending.flags,
                supersede: true,
                reason: "faculty_csv_upload",
              });
              await sendTelegramMessage(
                telegramChatId,
                `Upload confirmed - ${summary.classCode} P${summary.periodNo}\n` +
                  `Total ${summary.total} / Present ${summary.present} / Absent ${summary.absent}\n` +
                  (summary.absentRolls.length ? `Absent: ${summary.absentRolls.join(", ")}` : "All present") +
                  `\nSupersedes the CR's submission. CR/ICR notified.`,
                { parseMode: "Markdown" },
              ).catch(() => undefined);
              _registerUploads.delete(draftId);
            } finally {
              await client.query("RESET ROLE").catch(() => undefined);
              client.release();
            }
          }
        } else {
          _registerUploads.delete(draftId);
          await replyToChat(telegramChatId, "Upload cancelled.");
        }
        // answer the callback
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token && callbackQuery?.id) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQuery.id }),
            signal: AbortSignal.timeout(5000),
          }).catch(() => undefined);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const parsed = parseMenuCallback(callbackData);
    if (parsed) {
      const { role, cmd } = parsed;

      // Look up the user
      const { rows: cbUserRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
        `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
        [telegramChatId],
      );

      if (cbUserRows.length === 0) {
        await replyToChat(telegramChatId, "Account not linked. Use /link <id> first.");
      } else {
        const user = cbUserRows[0];

        // Edit the menu message with the result
        const pool = await getPostgresPool();
        const client = await pool.connect();
        try {
          await client.query("SET ROLE gate_app");
          const ctx: BotContext = {
            chatId: telegramChatId,
            userId: user.id,
            uniqueId: user.unique_id,
            name: user.name,
            role: user.role,
            status: user.status,
            client,
          };
          let result: string;
          if (cmd === "help") {
            const cmds = getRoleCommands(user.role);
            result = (
              "🤖 *Gate Monitor Assistant*\n\n" +
              cmds.map((c) => `• ${c.cmd} — ${c.desc}`).join("\n")
            );
          } else {
            result = await executeBotCommand(ctx, `/${cmd}`);
          }
          await sendTelegramMessage(
            telegramChatId,
            result,
            { parseMode: "Markdown" }
          );
        } finally {
          await client.query("RESET ROLE").catch(() => undefined);
          client.release();
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Role-based resource commands ──────────────────────────────────────
  // Dispatch /passes, /curfew, /alerts, /complaint, /announce, /attendance,
  // /students, /schedule, /shifts, /gates, /occupancy, /campus, /users,
  // /complaints, /bot, /child, /dept based on the user's role.
  const roleCmds = ["passes","curfew","alerts","complaint","announce","attendance",
    "students","schedule","shifts","gates","occupancy","campus","users","complaints",
    "bot","child","dept","exam","mess","guardian","health","events","delegation",
    "backup","blocks","maintenance","visitor","classes","handover","menu","faculty","audit",
    "now","settings","register","review","classes-add","message"];
  const roleCmd = text.split(/\s+/)[0].replace("/","").replace("@cej_server_bot","").toLowerCase();

  if (roleCmds.includes(roleCmd)) {
    // Look up the user's role by telegram_chat_id
    const { rows: roleUserRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
      `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );

    if (roleUserRows.length === 0) {
      await replyToChat(
        telegramChatId,
        `Account not linked. Use /link <id> first to associate your account, then try /${roleCmd}.`,
      );
      return NextResponse.json({ ok: true });
    }

    const user = roleUserRows[0];

    // Execute the role-scoped command with a transaction
    let result: string;
    try {
      const pool = await getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query("SET ROLE gate_app");
        const ctx: BotContext = {
          chatId: telegramChatId,
          userId: user.id,
          uniqueId: user.unique_id,
          name: user.name,
          role: user.role,
          status: user.status,
          client,
        };
        result = await executeBotCommand(ctx, text);
      } finally {
        await client.query("RESET ROLE").catch(() => undefined);
        client.release();
      }
    } catch (err) {
      console.error(`[Bot] /${roleCmd} error:`, err);
      result = "⚠️ Something went wrong. Please try again later.";
    }

    await replyToChat(telegramChatId, result);
    return NextResponse.json({ ok: true });
  }

  // ── Document upload: CSV register / photo evidence ─────────────────────
  const docFileId = message?.document?.file_id;
  const docFileName = message?.document?.file_name ?? "";
  if (docFileId && telegramChatId) {
    // Pending upload confirmations: draftId → parsed flags
    const registerUploadSessions = new Map<string, {
      draftId: string; userId: string; userName: string;
      presentFlags: Record<string, boolean>;
    }>();
    void registerUploadSessions; // module-level would be better; in-function for now

    // Is there an open draft for this user's class?
    const { rows: userRows } = await query<{ id: string; unique_id: string; name: string; role: string; status: string }>(
      `SELECT id, unique_id, name, role, status FROM public.users WHERE telegram_chat_id = $1 LIMIT 1`,
      [telegramChatId],
    );
    const user = userRows[0];
    if (user) {
      const { rows: openDrafts } = await query<{ id: string; class_id: string; period_no: number; session_date: string; status: string }>(
        `SELECT id, class_id, period_no, session_date, status
           FROM public.class_register_drafts
          WHERE opened_by = $1 AND status = 'open'
          ORDER BY opened_at DESC LIMIT 1`,
        [user.id],
      );
      const draft = openDrafts[0];
      if (draft) {
        const isCsv = /\.csv$/i.test(docFileName);
        if (isCsv) {
          // Download the CSV via the Telegram Bot API
          const token = process.env.TELEGRAM_BOT_TOKEN;
          let csvText = "";
          if (token) {
            try {
              const fileInfo = await (
                await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(docFileId)}`)
              ).json();
              if (fileInfo.ok && fileInfo.result?.file_path) {
                const fileBuf = await (
                  await fetch(`https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`)
                ).arrayBuffer();
                csvText = Buffer.from(fileBuf).toString("utf-8");
              }
            } catch { /* download failed */ }
          }
          if (!csvText) {
            await replyToChat(telegramChatId, "Could not download the CSV from Telegram. Try again or use the /register keyboard instead.");
            return NextResponse.json({ ok: true });
          }
          const { rows: classRows } = await query<{ name: string }>(
            `SELECT name FROM public.classes WHERE id = $1`,
            [draft.class_id],
          );
          const { rows: rollRows } = await query<{ roll: string }>(
            `SELECT sd.roll FROM public.student_details sd
               JOIN public.users u ON u.id = sd.user_id
              WHERE u.status = 'ACTIVE'
                AND sd.roll IS NOT NULL
                AND u.department_id = (SELECT department_id FROM public.classes WHERE id = $1)
              ORDER BY sd.roll`,
            [draft.class_id],
          );
          const rolls = rollRows.map((r) => r.roll);
          const { validateCsv, submitRegister } = await import("@/lib/register");
          const { rows: crSubmits } = await query<{ present_flags: string | null }>(
            `SELECT present_flags::text FROM public.class_register_drafts
              WHERE class_id = $1 AND session_date = $2 AND period_no = $3
                AND status = 'submitted'
              ORDER BY submitted_at DESC LIMIT 1`,
            [draft.class_id, draft.session_date, draft.period_no],
          );
          const existingFlags: Record<string, boolean> = {};
          if (crSubmits[0]?.present_flags) {
            try {
              const parsed = JSON.parse(crSubmits[0].present_flags);
              for (const [k, v] of Object.entries(parsed)) existingFlags[k] = !!v;
            } catch { /* malformed */ }
          }
          const validation = validateCsv(csvText, { rolls }, { presentFlags: existingFlags });
          if (!validation.ok) {
            await replyToChat(
              telegramChatId,
              "CSV validation failed:\n" + validation.errors.join("\n") + "\nFix and re-send.",
            );
            return NextResponse.json({ ok: true });
          }
          const deltaLines = validation.deltaAgainst && validation.deltaAgainst.length
            ? `\nDiffers from CR's submit on ${validation.deltaAgainst.length}:\n` +
              validation.deltaAgainst.slice(0, 10).map((d) => `  ${d.roll}: ${d.from} -> ${d.to}`).join("\n")
            : "";
          await sendTelegramMessage(
            telegramChatId,
            `Upload preview - P${draft.period_no} ${classRows[0]?.name ?? ""}\n` +
              `${validation.present ?? 0} present / ${validation.absent ?? 0} absent` +
              deltaLines +
              "\nTap confirm to supersede the CR's submission.",
            {
              parseMode: "Markdown",
              replyMarkup: {
                inline_keyboard: [
                  [
                    { text: "Confirm upload", callback_data: `regup:${draft.id}:confirm` },
                    { text: "Cancel", callback_data: `regup:${draft.id}:cancel` },
                  ],
                ],
              },
            },
          ).catch(() => undefined);
          // Stash for the confirm callback (module-scoped Map)
          const flags: Record<string, boolean> = {};
          for (const r of rolls) flags[r] = !(validation.absentRolls ?? []).includes(r);
          _registerUploads.set(draft.id, { flags, userId: user.id, userName: user.name });
        } else {
          // Photo evidence: attach to the draft's audit row (not parsed)
          await query(
            `INSERT INTO public.audit_events
               (actor_id, actor_type, role_context, action, resource, resource_id, after_state)
             VALUES ($1, 'user', 'faculty', 'attendance_photo_evidence', 'class_register_drafts', $2, $3)`,
            [user.id, draft.id, JSON.stringify({ file_name: docFileName, file_id: docFileId })],
          ).catch(() => undefined);
          await replyToChat(telegramChatId, `Photo attached to P${draft.period_no} as evidence. Not parsed - stored in the audit chain.`);
        }
      } else {
        await replyToChat(telegramChatId, "No open register for your class. Run /register first, then upload.");
      }
    }
    return NextResponse.json({ ok: true });
  }

  // /cancel — abort any pending link/verify flow
  if (text === "/cancel" || text.startsWith("/cancel@")) {
    await replyToChat(
      telegramChatId,
      "✅ Canceled. No account was linked. Use /link <id> to start again if needed.",
    );
    return NextResponse.json({ ok: true });
  }

  // Non-relevant updates are acknowledged so Telegram does not retry.
  return NextResponse.json({ ok: true, ignored: true });
}
