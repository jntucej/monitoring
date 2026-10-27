import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/notification-settings
 *
 * Read-only notification channel + template configuration: active channels,
 * queue depth, preference coverage, and recent notification types. Editing
 * channel config / templates requires sysadmin.
 */

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [
      channelStats,
      queueDepth,
      prefCoverage,
      recentTypes,
    ] = await Promise.all([
      query<{ channel: string; count: number }>(
        `SELECT c.channel AS channel, COUNT(*)::int AS count
            FROM public.notifications n,
                 unnest(n.channels) AS c(channel)
          GROUP BY c.channel
          ORDER BY COUNT(*) DESC`
      ),
      query<{ queue: string; depth: number }>(
        `SELECT 'push' AS queue, COUNT(*)::int AS depth FROM public.notification_push_queue
           UNION ALL
           SELECT 'sms', COUNT(*)::int FROM public.notification_sms_queue
           UNION ALL
           SELECT 'email', COUNT(*)::int FROM public.notification_email_queue`
      ),
      query<{ configured_users: number }>(
        `SELECT COUNT(*)::int AS configured_users FROM public.notification_preferences`
      ),
      query<{ type: string; count: number }>(
        `SELECT type, COUNT(*)::int AS count
           FROM public.notifications
          GROUP BY type
          ORDER BY count DESC
          LIMIT 10`
      ),
    ]);

    const coverage = prefCoverage.rows[0]?.configured_users ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        channels: channelStats.rows.map((c) => ({ channel: c.channel, notifications: c.count })),
        queue_depth: queueDepth.rows.map((q) => ({ queue: q.queue, depth: q.depth })),
        preferences_configured_users: coverage,
        top_types: recentTypes.rows.map((t) => ({ type: t.type, count: t.count })),
        note: "Editing notification channel configuration and templates requires sysadmin access.",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_notification_settings", maxRequests: 60 }
);
