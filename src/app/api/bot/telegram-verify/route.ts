// src/app/api/bot/telegram-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { query, tgQuery, withTransaction, tgTransaction } from "@/lib/postgres";
import { rateLimitByKey } from "@/lib/rate-limit";
import { sendTelegramMessage } from "@/lib/telegram";
import { hash, compare } from "@/server/lib/crypto";
import { assertCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  try {
    const body = await req.json().catch(() => ({}));
    const { userUniqueId, verifyCode } = body as {
      userUniqueId?: string;
      verifyCode?: string;
    };

    if (!userUniqueId || typeof userUniqueId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "userUniqueId is required" } },
        { status: 400 }
      );
    }

    const roll = userUniqueId.trim().toUpperCase();

    // 1. Look up student in main DB (gate_monitor)
    const { rows: userRows } = await query<{
      id: string;
      unique_id: string;
      name: string;
      role: string;
      telegram_chat_id: string | number | null;
      telegram_user_id: string | number | null;
    }>(
      `SELECT id, unique_id, name, role, telegram_chat_id, telegram_user_id
         FROM public.users
        WHERE UPPER(unique_id) = $1
        LIMIT 1`,
      [roll]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Account not found" } },
        { status: 404 }
      );
    }

    const student = userRows[0];

    // 2. Rate-limiting: max 5 attempts per student per 15 min
    const rlKey = `telegram_verify:${roll}`;
    const rl = await rateLimitByKey(rlKey, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (rl.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many verification attempts. Please wait 15 minutes before trying again.",
          },
        },
        { status: 429 }
      );
    }

    // 3. Flow A: If verifyCode is provided, VERIFY mode
    if (verifyCode && typeof verifyCode === "string") {
      const codeTrimmed = verifyCode.trim();

      // Look up active unused codes in telegram_bot DB
      const { rows: codeRows } = await tgQuery<{
        id: string;
        code_hash: string;
        expires_at: string;
      }>(
        `SELECT id, code_hash, expires_at
           FROM public.telegram_verify_codes
          WHERE user_unique_id = $1
            AND used_at IS NULL
            AND expires_at > NOW()
          ORDER BY created_at DESC`,
        [roll]
      );

      let matchedRowId: string | null = null;
      for (const row of codeRows) {
        const matches = await compare(codeTrimmed, row.code_hash).catch(() => false);
        if (matches) {
          matchedRowId = row.id;
          break;
        }
      }

      if (!matchedRowId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_CODE",
              message: "Invalid or expired verification code",
            },
          },
          { status: 400 }
        );
      }

      // Mark code as used
      await tgQuery(
        `UPDATE public.telegram_verify_codes
            SET used_at = NOW()
          WHERE id = $1`,
        [matchedRowId]
      );

      // Mark verified in main DB
      await query(
        `UPDATE public.users
            SET telegram_verified_at = NOW(),
                telegram_verification_failed_at = NULL
          WHERE UPPER(unique_id) = $1`,
        [roll]
      );

      // If there's an existing profile or chat ID, update bot profile
      if (student.telegram_chat_id) {
        await tgQuery(
          `INSERT INTO public.telegram_user_profiles
             (user_unique_id, telegram_chat_id, telegram_user_id, bot_subscribed, updated_at)
           VALUES ($1, $2, $3, true, NOW())
           ON CONFLICT (user_unique_id)
           DO UPDATE SET
             telegram_chat_id = EXCLUDED.telegram_chat_id,
             telegram_user_id = EXCLUDED.telegram_user_id,
             bot_subscribed = true,
             updated_at = NOW()`,
          [roll, student.telegram_chat_id, student.telegram_user_id]
        );

        await sendTelegramMessage(
          student.telegram_chat_id,
          `✅ Your Telegram account has been successfully verified for student roll number: ${roll}.`
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          userUniqueId: roll,
          name: student.name,
        },
      });
    }

    // 4. Flow B: Generate and issue 6-digit verification code
    const rawCode = String(crypto.randomInt(100000, 999999));
    const codeHash = await hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await tgQuery(
      `INSERT INTO public.telegram_verify_codes
         (user_unique_id, code_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [roll, codeHash, expiresAt.toISOString()]
    );

    let sentViaTelegram = false;
    if (student.telegram_chat_id) {
      sentViaTelegram = await sendTelegramMessage(
        student.telegram_chat_id,
        `🔑 Gate Monitor Verification Code: ${rawCode}\n\nThis code is valid for 15 minutes. Use /verify ${rawCode} in this chat or enter it on the portal to confirm your account.`
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userUniqueId: roll,
        name: student.name,
        sentViaTelegram,
        code: sentViaTelegram ? undefined : rawCode,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("[telegram-verify API Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal error",
        },
      },
      { status: 500 }
    );
  }
}
