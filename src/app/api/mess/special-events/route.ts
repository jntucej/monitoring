import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";
import {
  MEAL_TYPES, MEAL_WINDOW, SPECIAL_CATEGORIES,
  type MealType, type SpecialItemCategory, type SpecialEvent,
} from "@/lib/mess-reviews";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);
const MEAL_SET = new Set(MEAL_TYPES);
const CAT_SET = new Set(SPECIAL_CATEGORIES.map((c) => c.value));

interface EventRow {
  id: string; title: string; event_date: string; meal_type: MealType;
  announcement_at: string; interest_deadline: string;
  serving_start_at: string; serving_end_at: string;
  notes: string | null; status: string; hostel_only: boolean;
  created_at: string; updated_at: string;
}

interface ItemRow {
  id: string; event_id: string; code: string; label: string;
  category: SpecialItemCategory; is_primary: boolean; sort_order: number;
}

function defaultServingWindow(eventDate: string, mealType: MealType): { start: string; end: string } {
  const w = MEAL_WINDOW[mealType];
  const base = new Date(`${eventDate}T00:00:00+05:30`).getTime();
  const start = new Date(base + (w.start[0] * 60 + w.start[1]) * 60_000).toISOString();
  const end = new Date(base + (w.end[0] * 60 + w.end[1]) * 60_000).toISOString();
  return { start, end };
}

async function hydrateEvents(
  rows: EventRow[], userId: string,
): Promise<SpecialEvent[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const { rows: items } = await query<ItemRow>(
    `SELECT id, event_id, code, label, category, is_primary, sort_order
       FROM public.mess_special_items
      WHERE event_id = ANY($1::uuid[]) AND is_active
      ORDER BY sort_order, label`,
    [ids],
  );
  const { rows: mine } = await query<{ event_id: string; item_id: string }>(
    `SELECT event_id, item_id FROM public.mess_special_interests
      WHERE user_id = $1 AND event_id = ANY($2::uuid[])`,
    [userId, ids],
  );
  const { rows: counts } = await query<{ event_id: string; item_id: string; count: number }>(
    `SELECT event_id, item_id, COUNT(*)::int AS count
       FROM public.mess_special_interests
      WHERE event_id = ANY($1::uuid[])
      GROUP BY event_id, item_id`,
    [ids],
  );

  const itemsByEvent = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByEvent.get(it.event_id) ?? [];
    arr.push(it);
    itemsByEvent.set(it.event_id, arr);
  }
  const mineByEvent = new Map<string, string[]>();
  for (const m of mine) {
    const arr = mineByEvent.get(m.event_id) ?? [];
    arr.push(m.item_id);
    mineByEvent.set(m.event_id, arr);
  }
  const countsByEvent = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const obj = countsByEvent.get(c.event_id) ?? {};
    obj[c.item_id] = Number(c.count);
    countsByEvent.set(c.event_id, obj);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    eventDate: r.event_date,
    mealType: r.meal_type,
    announcementAt: r.announcement_at,
    interestDeadline: r.interest_deadline,
    servingStartAt: r.serving_start_at,
    servingEndAt: r.serving_end_at,
    notes: r.notes,
    status: r.status as SpecialEvent["status"],
    hostelOnly: r.hostel_only,
    items: (itemsByEvent.get(r.id) ?? []).map((it) => ({
      id: it.id, code: it.code, label: it.label,
      category: it.category, isPrimary: it.is_primary, sortOrder: it.sort_order,
    })),
    myItemIds: mineByEvent.get(r.id) ?? [],
    counts: countsByEvent.get(r.id) ?? {},
    canGetToken: false, // computed on the client via canIssueToken()
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const isManager = IN_CHARGE.has(auth.role);
  let sql = `SELECT id, title, event_date::text, meal_type, announcement_at,
                    interest_deadline, serving_start_at, serving_end_at,
                    notes, status, hostel_only, created_at, updated_at
               FROM public.mess_special_events`;
  const where: string[] = [];
  if (!isManager) {
    where.push(`status <> 'CANCELLED'`);
    where.push(`announcement_at <= NOW()`);
    where.push(`event_date >= CURRENT_DATE - 1`);
  } else {
    if (new URL(req.url).searchParams.get("upcomingOnly") === "1")
      where.push(`event_date >= CURRENT_DATE - 1`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY event_date DESC LIMIT 100`;
  const { rows } = await query<EventRow>(sql);
  const events = await hydrateEvents(rows, auth.userId);
  return ok({ events });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const body = (await req.json().catch(() => null)) as
    | {
        title?: unknown; eventDate?: unknown; mealType?: unknown;
        announcementAt?: unknown; interestDeadline?: unknown;
        servingStartAt?: unknown; servingEndAt?: unknown;
        notes?: unknown; hostelOnly?: unknown;
        items?: unknown;
      }
    | null;

  const title = String(body?.title ?? "").trim().slice(0, 160);
  const eventDate = String(body?.eventDate ?? "");
  const mealType = String(body?.mealType ?? "LUNCH").toUpperCase() as MealType;
  if (!title) return fail("VALIDATION_ERROR", "title is required", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))
    return fail("VALIDATION_ERROR", "eventDate must be YYYY-MM-DD", 400);
  if (eventDate < getIstDateString())
    return fail("VALIDATION_ERROR", "eventDate cannot be in the past", 400);
  if (!MEAL_SET.has(mealType))
    return fail("VALIDATION_ERROR", "Invalid mealType", 400);

  const itemsIn: unknown[] = Array.isArray(body?.items) ? (body as { items: unknown[] }).items : [];
  if (itemsIn.length === 0)
    return fail("VALIDATION_ERROR", "At least one item is required", 400);

  const cleanItems: { code: string; label: string; category: SpecialItemCategory; isPrimary: boolean; sortOrder: number }[] = [];
  for (let i = 0; i < itemsIn.length; i++) {
    const raw = itemsIn[i] as Record<string, unknown>;
    const code = String(raw?.code ?? "").trim().toUpperCase().slice(0, 20);
    const label = String(raw?.label ?? "").trim().slice(0, 80);
    const category = String(raw?.category ?? "VEG").toUpperCase() as SpecialItemCategory;
    if (!code || !label)
      return fail("VALIDATION_ERROR", `Item ${i + 1}: code and label required`, 400);
    if (!CAT_SET.has(category))
      return fail("VALIDATION_ERROR", `Item ${i + 1}: invalid category`, 400);
    cleanItems.push({ code, label, category, isPrimary: Boolean(raw?.isPrimary), sortOrder: i });
  }

  // Defaults: announce 2 days before @ 09:00 IST, interest deadline 1 day before @ 18:00 IST,
  // serving window from MEAL_WINDOW defaults.
  const win = defaultServingWindow(eventDate, mealType);
  const announcementAt = body?.announcementAt
    ? new Date(String(body.announcementAt)).toISOString()
    : new Date(new Date(`${eventDate}T00:00:00+05:30`).getTime() - 2 * 86_400_000 + 9 * 3_600_000).toISOString();
  const interestDeadline = body?.interestDeadline
    ? new Date(String(body.interestDeadline)).toISOString()
    : new Date(new Date(`${eventDate}T00:00:00+05:30`).getTime() - 86_400_000 + 18 * 3_600_000).toISOString();
  const servingStartAt = body?.servingStartAt
    ? new Date(String(body.servingStartAt)).toISOString()
    : win.start;
  const servingEndAt = body?.servingEndAt
    ? new Date(String(body.servingEndAt)).toISOString()
    : win.end;

  if (new Date(announcementAt).getTime() >= new Date(interestDeadline).getTime())
    return fail("VALIDATION_ERROR", "announcementAt must be before interestDeadline", 400);
  if (new Date(interestDeadline).getTime() >= new Date(servingStartAt).getTime())
    return fail("VALIDATION_ERROR", "interestDeadline must be before servingStartAt", 400);
  if (new Date(servingStartAt).getTime() >= new Date(servingEndAt).getTime())
    return fail("VALIDATION_ERROR", "servingStartAt must be before servingEndAt", 400);

  const hostelOnly = body?.hostelOnly === undefined ? true : Boolean(body.hostelOnly);

  const created = await withTransaction(async (client) => {
    const ev = await client.query<{ id: string }>(
      `INSERT INTO public.mess_special_events
         (title, event_date, meal_type, announcement_at, interest_deadline,
          serving_start_at, serving_end_at, notes, hostel_only, created_by)
       VALUES ($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [title, eventDate, mealType, announcementAt, interestDeadline,
       servingStartAt, servingEndAt,
       body?.notes == null ? null : String(body.notes).slice(0, 500),
       hostelOnly, auth.userId],
    );
    const eventId = ev.rows[0].id;
    for (const it of cleanItems) {
      await client.query(
        `INSERT INTO public.mess_special_items
           (event_id, code, label, category, is_primary, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [eventId, it.code, it.label, it.category, it.isPrimary, it.sortOrder],
      );
    }
    return eventId;
  });

  await addAudit({
    action: "MESS_SPECIAL_EVENT_CREATED",
    userId: auth.userId,
    role: auth.role,
    details: { eventId: created, title, eventDate, mealType, itemCount: cleanItems.length },
  });

  // Best-effort announcement fan-out to every eligible hostel student.
  try {
    const { rows: targets } = await query<{ id: string }>(
      `SELECT u.id
         FROM public.users u
         LEFT JOIN public.student_details sd ON sd.user_id = u.id
        WHERE u.role = 'student' AND u.status = 'ACTIVE'
          AND (sd.student_type IN ('HM','HF')
               OR sd.current_entry_type = 'hosteller'
               OR (sd.hostel_block IS NOT NULL AND sd.hostel_block <> ''))`,
    );
    if (targets.length > 0) {
      const msgTitle = `Special ${mealType}: ${title}`;
      const msg = `On ${eventDate}: ${cleanItems.map((i) => i.label).join(", ")}. Register your interest by ${new Date(interestDeadline).toLocaleString("en-IN")}.`;
      await withTransaction(async (client) => {
        for (const t of targets) {
          await client.query(
            `INSERT INTO public.notifications
               (id, type, priority, title, message, recipient_id, recipient_type, channels, data)
             VALUES (gen_random_uuid(), 'mess_event_announced', 'high',
                     $1, $2, $3, 'user', ARRAY['in_app','push'],
                     jsonb_build_object('eventId', $4, 'eventDate', $5))`,
            [msgTitle, msg, t.id, created, eventDate],
          );
        }
      });
      await addAudit({
        action: "MESS_EVENT_ANNOUNCED",
        userId: auth.userId,
        role: auth.role,
        details: { eventId: created, notified: targets.length },
      });
    }
  } catch { /* best-effort; don't block creation */ }

  const { rows } = await query<EventRow>(
    `SELECT id, title, event_date::text, meal_type, announcement_at,
            interest_deadline, serving_start_at, serving_end_at,
            notes, status, hostel_only, created_at, updated_at
       FROM public.mess_special_events WHERE id = $1`,
    [created],
  );
  const [event] = await hydrateEvents(rows, auth.userId);
  return ok({ event });
}

export const GET = withAuthorization(
  withRateLimit(handleGet, { windowMs: 60_000, maxRequests: 120 }),
  {},
);

export const POST = withAuthorization(
  withRateLimit(handlePost, { windowMs: 60_000, maxRequests: 30 }),
  {},
);
