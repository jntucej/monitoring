import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { issueToken } from "@/lib/mess-event-token";

/**
 * POST /api/cron/mess-event-tokens
 *
 * For special events whose interest deadline has passed and whose serving
 * window has started (or will start within 60 minutes), mint a single-use
 * QR + manual-code token for every interested hostel student that does not
 * already have one. Best-effort: a failure for one student does not block
 * the rest.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "CRON_SECRET is not configured on server" } },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (secretHeader !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized cron request" } },
      { status: 401 },
    );
  }

  try {
    const { rows: events } = await query<{
      id: string; title: string; serving_end_at: string;
      interest_deadline: string; serving_start_at: string;
    }>(
      `SELECT id, title, serving_end_at, interest_deadline, serving_start_at
         FROM public.mess_special_events
        WHERE status IN ('SCHEDULED','OPEN')
          AND interest_deadline <= NOW()
          AND serving_end_at >= NOW()
          AND serving_start_at <= NOW() + INTERVAL '60 minutes'`,
    );

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const ev of events) {
      const { rows: interested } = await query<{ user_id: string }>(
        `SELECT DISTINCT i.user_id
           FROM public.mess_special_interests i
           JOIN public.users u ON u.id = i.user_id
           LEFT JOIN public.student_details sd ON sd.user_id = u.id
          WHERE i.event_id = $1
            AND (sd.student_type IN ('HM','HF')
                 OR sd.current_entry_type = 'hosteller'
                 OR (sd.hostel_block IS NOT NULL AND sd.hostel_block <> ''))
            AND NOT EXISTS (
              SELECT 1 FROM public.mess_event_tokens t
               WHERE t.user_id = i.user_id AND t.event_id = $1
            )`,
        [ev.id],
      );

      for (const row of interested) {
        try {
          const { token, created } = await issueToken({
            userId: row.user_id,
            eventId: ev.id,
            expiresAt: new Date(ev.serving_end_at),
          });
          if (created) {
            generated++;
            await addAudit({
              action: "MESS_TOKEN_GENERATED",
              userId: row.user_id,
              role: "student",
              details: { eventId: ev.id, jti: token.jti, source: "cron" },
            });
          } else {
            skipped++;
          }
        } catch (e) {
          errors.push(`${ev.id}/${row.user_id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      events: events.length,
      errors,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : "cron failed" } },
      { status: 500 },
    );
  }
}
