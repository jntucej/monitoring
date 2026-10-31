import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface QueueCountRow {
  total: number;
  pending: number;
  sent: number;
  failed: number;
}

interface CountRow {
  count: number;
}

interface NotificationItem {
  id: string;
  channel?: string;
  recipient?: string;
  title?: string;
  status?: string;
  created_at?: string;
  [k: string]: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let counts = {
        preferences: 0,
        email_queue: 0,
        email_pending: 0,
        email_sent: 0,
        email_failed: 0,
        sms_queue: 0,
        sms_pending: 0,
        sms_sent: 0,
        sms_failed: 0,
        push_queue: 0,
        push_pending: 0,
        push_sent: 0,
        push_failed: 0,
      };

      let items: NotificationItem[] = [];

      try {
        const [
          prefsRes,
          emailRes,
          smsRes,
          pushRes,
          recentQueueRes,
          notificationsRes,
        ] = await Promise.all([
          query<CountRow>(
            `SELECT COUNT(*)::int AS count FROM public.notification_preferences`
          ),
          query<QueueCountRow>(`
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
            FROM public.notification_email_queue
          `),
          query<QueueCountRow>(`
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
            FROM public.notification_sms_queue
          `),
          query<QueueCountRow>(`
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
              COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
            FROM public.notification_push_queue
          `),
          query<NotificationItem>(`
            SELECT * FROM (
              SELECT
                id::text AS id,
                'email' AS channel,
                email AS recipient,
                subject AS title,
                status,
                created_at::text AS created_at
              FROM public.notification_email_queue
              UNION ALL
              SELECT
                id::text AS id,
                'sms' AS channel,
                phone_number AS recipient,
                message AS title,
                status,
                created_at::text AS created_at
              FROM public.notification_sms_queue
              UNION ALL
              SELECT
                id::text AS id,
                'push' AS channel,
                user_id AS recipient,
                title,
                status,
                created_at::text AS created_at
              FROM public.notification_push_queue
            ) q
            ORDER BY created_at DESC
            LIMIT 20
          `),
          query<NotificationItem>(`
            SELECT
              id,
              array_to_string(channels, ',') AS channel,
              recipient_id AS recipient,
              title,
              CASE WHEN read THEN 'read' ELSE 'unread' END AS status,
              created_at::text AS created_at
            FROM public.notifications
            ORDER BY created_at DESC
            LIMIT 20
          `),
        ]);

        counts = {
          preferences: Number(prefsRes.rows[0]?.count ?? 0),
          email_queue: Number(emailRes.rows[0]?.total ?? 0),
          email_pending: Number(emailRes.rows[0]?.pending ?? 0),
          email_sent: Number(emailRes.rows[0]?.sent ?? 0),
          email_failed: Number(emailRes.rows[0]?.failed ?? 0),
          sms_queue: Number(smsRes.rows[0]?.total ?? 0),
          sms_pending: Number(smsRes.rows[0]?.pending ?? 0),
          sms_sent: Number(smsRes.rows[0]?.sent ?? 0),
          sms_failed: Number(smsRes.rows[0]?.failed ?? 0),
          push_queue: Number(pushRes.rows[0]?.total ?? 0),
          push_pending: Number(pushRes.rows[0]?.pending ?? 0),
          push_sent: Number(pushRes.rows[0]?.sent ?? 0),
          push_failed: Number(pushRes.rows[0]?.failed ?? 0),
        };

        // Prefer queue items; if queues are empty, fall back to recent notifications
        items =
          recentQueueRes.rows.length > 0
            ? recentQueueRes.rows
            : notificationsRes.rows;
      } catch {
        counts = {
          preferences: 0,
          email_queue: 0,
          email_pending: 0,
          email_sent: 0,
          email_failed: 0,
          sms_queue: 0,
          sms_pending: 0,
          sms_sent: 0,
          sms_failed: 0,
          push_queue: 0,
          push_pending: 0,
          push_sent: 0,
          push_failed: 0,
        };
        items = [];
      }

      return ok({ counts, items });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60000, maxRequests: 60 }
);
