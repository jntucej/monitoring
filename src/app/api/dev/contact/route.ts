import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { addAudit } from "@/lib/db";
import type { Role } from "@/lib/types";
import { assertLength, LIMITS } from "@/lib/validation";

// /api/dev/contact is a developer-debug route. In production it returns 404
// so scanners cannot enumerate it; the auth + rate-limit gates below still
// apply in development.
const PRODUCTION_404 = () =>
  process.env.NODE_ENV === "production"
    ? new NextResponse(null, { status: 404 })
    : null;

function prodGuard(req: NextRequest): Response | null {
  const early = PRODUCTION_404();
  if (early) return early;
  void req;
  return null;
}

/**
 * /api/dev/contact
 *
 * POST (any authenticated user): send a direct message to the developer.
 *   - Message + the sender's identity (name, role, email, user id) are attached
 *     server-side from validated auth headers — the client can never spoof it.
 *   - Stored in public.developer_messages (admin dashboards read from there).
 *   - Forwarded to the developer via the project's Telegram bot
 *     (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) when configured.
 *
 * GET (admin / sysadmin): list incoming developer messages for dashboards.
 */

async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id") || "";
  const actorRole = req.headers.get("x-user-role") || "";
  const actorEmail = req.headers.get("x-user-email") || "";

  try {
    const body = await req.json().catch(() => null);
    let validMessage: string;
    try {
      validMessage = assertLength(
        body?.message,
        LIMITS.FEEDBACK_COMMENT,
        "Message"
      ).slice(0, 2000);
    } catch (valErr: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message:
              valErr instanceof Error ? valErr.message : "Invalid message.",
          },
        },
        { status: 400 }
      );
    }

    const channel = ["web", "scan", "student", "support"].includes(
      body?.channel
    )
      ? (body.channel as string)
      : "web";

    // Server-side identity: name from the users table, role/email from the
    // auth middleware's validated headers.
    let actorName = "";
    try {
      const nameRes = await query(
        `SELECT name FROM users WHERE id = $1 LIMIT 1`,
        [actorId]
      );
      actorName = nameRes.rows[0]?.name || actorEmail || "Unknown user";
    } catch {
      actorName = actorEmail || "Unknown user";
    }

    // Per-user opt-out flag (defaults ON for everyone).
    const flagRes = await query(
      `SELECT dev_contact_enabled FROM users WHERE id = $1 LIMIT 1`,
      [actorId]
    );
    if (flagRes.rows.length > 0 && flagRes.rows[0].dev_contact_enabled === false) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DISABLED",
            message: "Direct developer contact is disabled for this account.",
          },
        },
        { status: 403 }
      );
    }

    const insertRes = await query(
      `INSERT INTO developer_messages (user_id, user_name, user_role, user_email, message, channel)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [actorId, actorName, actorRole, actorEmail, validMessage, channel]
    );

    // Forward to the developer via Telegram when configured. Never fatal.
    let telegramSent = false;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      try {
        const tgText = [
          "📨 *Direct developer message*",
          `• *From:* ${actorName} (${actorRole})`,
          `• *Email:* ${actorEmail || "—"}`,
          `• *Channel:* ${channel}`,
          "",
          validMessage,
        ].join("\n");
        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: tgText,
              parse_mode: "Markdown",
              disable_web_page_preview: true,
            }),
          }
        );
        telegramSent = tgRes.ok;
      } catch {
        telegramSent = false;
      }
    }

    void addAudit({
      action: "DEV_CONTACT_SENT",
      userId: actorId,
      userName: actorName,
      role: actorRole as Role,
      details: { message_id: insertRes.rows[0]?.id, telegram_sent: telegramSent, channel },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: insertRes.rows[0]?.id,
        delivered: telegramSent,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to send developer message.",
        },
      },
      { status: 500 }
    );
  }
}

async function handleGet(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10))
  );
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
  try {
    const where = unreadOnly ? "WHERE read_at IS NULL" : "";
    const res = await query(
      `SELECT id, user_id, user_name, user_role, user_email, message, channel, read_at, created_at
       FROM developer_messages ${where}
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list developer messages.",
        },
      },
      { status: 500 }
    );
  }
}

export const POST = (req: NextRequest) => {
  const early = prodGuard(req);
  if (early) return early;
  return (withRateLimit(
    withAuthorization(handlePost),
    { keyPrefix: "dev_contact", maxRequests: 10, windowMs: 15 * 60 * 1000 }
  ))(req);
};

export const GET = (req: NextRequest) => {
  const early = prodGuard(req);
  if (early) return early;
  return (withAuthorization(
    handleGet,
    { requiredRole: ["sysadmin", "admin"] }
  ))(req);
};
