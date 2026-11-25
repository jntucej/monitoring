import { query } from "@/lib/postgres";

export async function getUserScopes(userId: string): Promise<string[]> {
  const { rows } = await query<{
    department: string | null;
    semester: string | null;
    section: string | null;
    hostel_block: string | null;
  }>(
    `SELECT sd.department, sd.semester, sd.section,
            COALESCE(sd.hostel_block, u.hostel_block) AS hostel_block
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.id = $1::uuid LIMIT 1`,
    [userId],
  );
  const r = rows[0];
  const scopes = ["global", `user:${userId}`];
  if (r?.department) scopes.push(`dept:${r.department}`);
  if (r?.department && r?.semester && r?.section) {
    scopes.push(`class:${r.department}-${r.semester}-${r.section}`);
  }
  if (r?.hostel_block) scopes.push(`hostel:${r.hostel_block}`);
  return scopes;
}

export async function listFeedForUser(
  userId: string,
  opts: { filter?: "all" | "unread" | "expiring"; kind?: string } = {},
) {
  const scopes = await getUserScopes(userId);
  const { rows } = await query(
    `SELECT cf.*,
            r.seen_at,
            r.dismissed_at,
            (r.seen_at IS NULL) AS unread,
            (cf.expires_at IS NOT NULL AND cf.expires_at < NOW() + INTERVAL '1 day') AS expiring_soon
       FROM public.campus_feed_items cf
       LEFT JOIN public.campus_feed_receipts r
         ON r.feed_id = cf.id AND r.user_id = $1::uuid
      WHERE cf.status = 'active'
        AND (cf.expires_at IS NULL OR cf.expires_at > NOW())
        AND cf.target_scope = ANY($2::text[])
        AND r.dismissed_at IS NULL
        AND ($3::text IS NULL OR cf.kind = $3)
        AND ($4::text <> 'unread' OR r.seen_at IS NULL)
        AND ($4::text <> 'expiring' OR (cf.expires_at IS NOT NULL AND cf.expires_at < NOW() + INTERVAL '1 day'))
      ORDER BY (cf.priority = 'urgent') DESC, cf.posted_at DESC
      LIMIT 50`,
    [userId, scopes, opts.kind ?? null, opts.filter ?? "all"],
  );
  return rows;
}

export async function summarizeFeedForUser(userId: string) {
  const items = await listFeedForUser(userId);
  const unread = items.filter((i: { unread: boolean }) => i.unread).length;
  const expiringSoon = items.filter((i: { expiring_soon: boolean }) => i.expiring_soon).length;
  const pinned = items.filter((i: { priority: string }) => i.priority === "urgent").length;
  return { total: items.length, unread, expiring_soon: expiringSoon, pinned, items: items.slice(0, 5) };
}

export async function markFeedSeen(userId: string, feedId: string) {
  await query(
    `INSERT INTO public.campus_feed_receipts (feed_id, user_id, seen_at)
     VALUES ($1::uuid, $2::uuid, NOW())
     ON CONFLICT (feed_id, user_id) DO UPDATE
       SET seen_at = COALESCE(public.campus_feed_receipts.seen_at, NOW())`,
    [feedId, userId],
  );
}

export async function dismissFeedItem(userId: string, feedId: string) {
  await query(
    `INSERT INTO public.campus_feed_receipts (feed_id, user_id, seen_at, dismissed_at)
     VALUES ($1::uuid, $2::uuid, NOW(), NOW())
     ON CONFLICT (feed_id, user_id) DO UPDATE
       SET dismissed_at = NOW(),
           seen_at = COALESCE(public.campus_feed_receipts.seen_at, NOW())`,
    [feedId, userId],
  );
}

/**
 * Heuristic PDF announcement parser: extracts expiry date, target scope, and priority
 * from title + extracted text, and creates a draft campus_feed_items row.
 */
export function parsePdfAnnouncementHeuristics(input: {
  title: string;
  text: string;
  kind?: "announcement" | "event" | "alert" | "circular" | "emergency";
}) {
  const combined = `${input.title}\n${input.text}`;

  // 1. Detect expiry date ("valid until 31 Dec 2025", "expires on 2026-12-31", "last date 15 Nov 2026")
  let expiresAt: string | null = null;
  const dateMatch = combined.match(
    /(?:valid\s+until|expires?\s+on|last\s+date(?:\s+is)?)\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  if (dateMatch?.[1]) {
    const raw = dateMatch[1].trim();
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : `${raw} UTC`);
    if (!Number.isNaN(parsed.getTime())) {
      expiresAt = parsed.toISOString();
    }
  }

  // 2. Detect scope hints ("CSE", "ECE", "EEE", "MECH", "CIVIL", "hostel")
  let targetScope = "global";
  const deptMatch = combined.match(/\b(CSE|ECE|EEE|MECH|CIVIL|IT|AIML)\b/i);
  if (deptMatch?.[1]) {
    targetScope = `dept:${deptMatch[1].toUpperCase()}`;
  } else if (/\bhostel\b/i.test(combined)) {
    targetScope = "mess";
  }

  // 3. Detect priority
  const priority = /\b(urgent|emergency|immediately)\b/i.test(combined) ? "urgent" : "normal";

  return {
    kind: input.kind ?? "circular",
    title: input.title,
    target_scope: targetScope,
    priority,
    expires_at: expiresAt,
    status: "draft" as const,
  };
}

export async function ingestPdfAnnouncement(input: {
  title: string;
  text: string;
  pdfUrl: string;
  postedBy: string;
  postedByRole: string;
  kind?: "announcement" | "event" | "alert" | "circular" | "emergency";
}) {
  const parsed = parsePdfAnnouncementHeuristics(input);
  const { rows } = await query(
    `INSERT INTO public.campus_feed_items
       (kind, title, body_md, attachments, target_scope, priority, posted_by, posted_by_role, expires_at, status)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::uuid, $8, $9::timestamptz, 'draft')
     RETURNING *`,
    [
      parsed.kind,
      parsed.title,
      input.text.slice(0, 4000),
      JSON.stringify([{ type: "pdf", url: input.pdfUrl, title: parsed.title }]),
      parsed.target_scope,
      parsed.priority,
      input.postedBy,
      input.postedByRole,
      parsed.expires_at,
    ],
  );
  return rows[0];
}
