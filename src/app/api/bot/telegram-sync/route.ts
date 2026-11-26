// src/app/api/bot/telegram-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query, tgQuery, withTransaction } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { withRateLimit } from "@/lib/rate-limit";
import { generateDeepLinkToken, hashDeepLinkToken } from "@/lib/telegram-deep-link";
import { compare } from "@/server/lib/crypto";
import { sendTelegramMessage } from "@/lib/telegram";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (!action) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "action is required" } },
        { status: 400 }
      );
    }

    // ── Action 1: sync ──────────────────────────────────────────────────────────
    if (action === "sync") {
      // Reads all students.email from main DB, attempts to look up their Telegram by phone
      // (if available) or creates a pending profile in telegram_user_profiles
      const { rows: studentRows } = await query<{
        roll: string;
        email: string | null;
        phone: string | null;
        name: string | null;
      }>(
        `SELECT s.roll, s.email, s.phone, s.name
           FROM public.students s
          ORDER BY s.roll ASC`
      );

      let syncedCount = 0;
      let linkedByPhoneCount = 0;

      for (const st of studentRows) {
        const roll = (st.roll || "").trim().toUpperCase();
        if (!roll) continue;

        let linkedChatId: number | null = null;
        let linkedUserId: number | null = null;

        // Try looking up Telegram identity by phone if phone is present
        const phone = (st.phone || "").replace(/[^\d]/g, "");
        if (phone) {
          const { rows: phoneMatches } = await tgQuery<{
            telegram_chat_id: string | number;
            telegram_user_id: string | number;
          }>(
            `SELECT telegram_chat_id, telegram_user_id
               FROM public.telegram_deep_links
              WHERE user_phone IS NOT NULL
                AND regexp_replace(user_phone, '[^0-9]', '', 'g') = $1
                AND telegram_chat_id IS NOT NULL
              ORDER BY created_at DESC
              LIMIT 1`,
            [phone]
          );

          if (phoneMatches.length > 0) {
            linkedChatId = Number(phoneMatches[0].telegram_chat_id);
            linkedUserId = Number(phoneMatches[0].telegram_user_id);
            linkedByPhoneCount++;
          }
        }

        // Upsert into telegram_user_profiles in telegram_bot DB
        await tgQuery(
          `INSERT INTO public.telegram_user_profiles
             (user_unique_id, telegram_chat_id, telegram_user_id, bot_subscribed, updated_at)
           VALUES ($1, $2, $3, false, NOW())
           ON CONFLICT (user_unique_id)
           DO UPDATE SET
             telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, telegram_user_profiles.telegram_chat_id),
             telegram_user_id = COALESCE(EXCLUDED.telegram_user_id, telegram_user_profiles.telegram_user_id),
             updated_at = NOW()`,
          [roll, linkedChatId, linkedUserId]
        );

        syncedCount++;
      }

      return NextResponse.json({
        success: true,
        data: {
          action: "sync",
          totalStudents: studentRows.length,
          syncedCount,
          linkedByPhoneCount,
        },
      });
    }

    // ── Action 2: generate-links ───────────────────────────────────────────────
    if (action === "generate-links") {
      // Creates telegram_deep_links rows for all students without one (in telegram_bot DB), returns count
      const { rows: allStudents } = await query<{
        unique_id: string;
        name: string | null;
        phone: string | null;
      }>(
        `SELECT unique_id, name, phone
           FROM public.users
          WHERE role = 'student'
          ORDER BY unique_id ASC`
      );

      // Check which students already have an active/existing telegram_deep_links row in telegram_bot DB
      const { rows: existingLinks } = await tgQuery<{ user_unique_id: string }>(
        `SELECT DISTINCT user_unique_id
           FROM public.telegram_deep_links
          WHERE user_unique_id IS NOT NULL`
      );

      const existingSet = new Set(
        existingLinks.map((l) => (l.user_unique_id || "").trim().toUpperCase())
      );

      let createdCount = 0;
      const defaultExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      for (const st of allStudents) {
        const roll = (st.unique_id || "").trim().toUpperCase();
        if (!roll || existingSet.has(roll)) continue;

        const token = generateDeepLinkToken();
        const tokenHash = hashDeepLinkToken(token);

        await tgQuery(
          `INSERT INTO public.telegram_deep_links
             (token_hash, user_id, user_unique_id, user_name, user_phone, expires_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [tokenHash, roll, roll, st.name || roll, st.phone || null, defaultExpires.toISOString()]
        );
        createdCount++;
      }

      return NextResponse.json({
        success: true,
        data: {
          action: "generate-links",
          createdCount,
          totalEligible: allStudents.length,
        },
      });
    }

    // ── Action 3: verify ───────────────────────────────────────────────────────
    if (action === "verify") {
      const { userUniqueId, code } = body as {
        userUniqueId?: string;
        code?: string;
      };

      if (!userUniqueId || !code) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "BAD_REQUEST",
              message: "userUniqueId and code are required for verify action",
            },
          },
          { status: 400 }
        );
      }

      const roll = userUniqueId.trim().toUpperCase();
      const codeTrimmed = String(code).trim();

      // Look up student in main DB
      const { rows: userRows } = await query<{
        id: string;
        unique_id: string;
        name: string;
        telegram_chat_id: string | number | null;
        telegram_user_id: string | number | null;
      }>(
        `SELECT id, unique_id, name, telegram_chat_id, telegram_user_id
           FROM public.users
          WHERE UPPER(unique_id) = $1
          LIMIT 1`,
        [roll]
      );

      if (userRows.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
          { status: 404 }
        );
      }

      const student = userRows[0];

      // Look up active unused codes in telegram_bot DB
      const { rows: codeRows } = await tgQuery<{
        id: string;
        code_hash: string;
      }>(
        `SELECT id, code_hash
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

      // Update telegram_user_profiles
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
          `✅ Your Telegram account has been confirmed and verified for ${roll}.`
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          action: "verify",
          verified: true,
          userUniqueId: roll,
          name: student.name,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown action: ${action}` } },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[telegram-sync API Error]", err);
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

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    // 1. Fetch summary statistics
    const { rows: statsRows } = await query<{
      total_students: string;
      linked_count: string;
      verified_count: string;
      unverified_count: string;
    }>(
      `SELECT
         COUNT(*)::text AS total_students,
         COUNT(*) FILTER (WHERE telegram_chat_id IS NOT NULL)::text AS linked_count,
         COUNT(*) FILTER (WHERE telegram_verified_at IS NOT NULL)::text AS verified_count,
         COUNT(*) FILTER (WHERE telegram_verified_at IS NULL)::text AS unverified_count
       FROM public.users
       WHERE role = 'student'`
    );

    // 2. Query students list
    let queryText = `
      SELECT
        u.id,
        u.unique_id,
        u.name,
        u.email,
        u.phone,
        u.telegram_chat_id,
        u.telegram_user_id,
        u.telegram_verified_at,
        u.telegram_last_seen_at
      FROM public.users u
      WHERE u.role = 'student'
    `;
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (LOWER(u.unique_id) LIKE $${params.length} OR LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    queryText += ` ORDER BY u.unique_id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows: studentRows } = await query(queryText, params);

    const stats = statsRows[0] || {
      total_students: "0",
      linked_count: "0",
      verified_count: "0",
      unverified_count: "0",
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: parseInt(stats.total_students, 10),
          linked: parseInt(stats.linked_count, 10),
          verified: parseInt(stats.verified_count, 10),
          unverified: parseInt(stats.unverified_count, 10),
        },
        students: studentRows.map((s: any) => ({
          id: s.id,
          uniqueId: s.unique_id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          telegramChatId: s.telegram_chat_id ? String(s.telegram_chat_id) : null,
          telegramUserId: s.telegram_user_id ? String(s.telegram_user_id) : null,
          telegramVerifiedAt: s.telegram_verified_at,
          telegramLastSeenAt: s.telegram_last_seen_at,
          isLinked: !!s.telegram_chat_id,
          isVerified: !!s.telegram_verified_at,
        })),
      },
    });
  } catch (err: unknown) {
    console.error("[telegram-sync GET Error]", err);
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

export const GET = withApiChain(handleGet, {
  route: "/api/bot/telegram-sync",
  auth: "user",
  requiredRole: ["sysadmin"],
  rateLimit: { keyPrefix: "telegram_sync_get", maxRequests: 60 },
});

export const POST = withApiChain(handlePost, {
  route: "/api/bot/telegram-sync",
  auth: "user",
  csrf: true,
  requiredRole: ["sysadmin"],
  rateLimit: { keyPrefix: "telegram_sync", maxRequests: 30 },
});
