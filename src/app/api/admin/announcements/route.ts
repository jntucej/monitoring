import { NextRequest } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withTransaction } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { validateBody } from "@/lib/validate-body";
import { AnnouncementSchema } from "@/lib/schemas/admin";
import { addAudit } from "@/lib/db";
import { assertLength, LIMITS } from "@/lib/validation";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";


type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  priority: string | null;
  audience: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

async function handleGet(
  req: NextRequest,
  _ctx: { auth: AuthContext },
): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const audience = searchParams.get("audience");
  const publishedOnly = searchParams.get("publishedOnly") === "true";

  const supabase = getSupabaseServiceClient();
  let query = supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (audience) query = query.eq("audience", audience);
  if (publishedOnly) query = query.eq("is_published", true);

  const { data, error } = await query;
  if (error) return fail("DB_ERROR", error.message, 500);
  return ok({ rows: (data ?? []) as AnnouncementRow[], count: data?.length ?? 0 });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_announcements", ...RATE_LIMITS.read },
);

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  // U5: shared Zod validation owns both the size cap and the field checks
  // in a single streamed read. Malformed JSON → 400; oversize → 413;
  // missing/over-long fields → 400 VALIDATION_ERROR with safe paths.
  const bodyRes = await validateBody(req, AnnouncementSchema, { route: "/api/admin/announcements" });
  if (!bodyRes.ok) return bodyRes.response;
  const payload = bodyRes.data;

  try {
    // Belt-and-suspenders: the schema already bounds title/message, but keep
    // the route's own limit check so a schema change can't silently allow
    // over-long fields.
    assertLength(payload.title, LIMITS.ANNOUNCEMENT_TITLE, "title");
    assertLength(payload.message ?? payload.body ?? "", LIMITS.ANNOUNCEMENT_MESSAGE, "message");
  } catch (e) {
    return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid input", 400);
  }

  const title = payload.title;
  const message = payload.message ?? payload.body ?? "";
  const audience = payload.audience ?? "all";
  const priority = payload.priority ?? "medium";
  const publishNow = payload.publishNow === true;
  const publishAt = payload.publishAt ?? null;

  const isPublished = publishNow || (!publishAt || new Date(publishAt) <= new Date());
  const scheduledAt = !publishNow && publishAt && new Date(publishAt) > new Date() ? publishAt : null;

  const id = `ann-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const row = {
    id,
    title,
    message,
    priority,
    audience,
    is_published: isPublished,
    scheduled_at: scheduledAt,
    expires_at: null,
    created_by: auth.userId,
    created_at: now,
    updated_at: now,
  };

  const inserted = await withTransaction(
    async (tx) => {
      const res = await tx.query(
        `INSERT INTO public.announcements
           (id, title, message, priority, audience, is_published, scheduled_at, expires_at, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9, $10::timestamptz, $11::timestamptz)
         RETURNING *`,
        [row.id, row.title, row.message, row.priority, row.audience,
         row.is_published, row.scheduled_at, row.expires_at, row.created_by,
         row.created_at, row.updated_at],
      );
      if (res.rowCount === 0) throw new Error("announcements insert returned 0 rows (RLS)");
      return res.rows[0];
    },
    { currentRole: auth.role, currentUserId: auth.userId },
  );
  if (!inserted) return fail("DB_ERROR", "Announcement write returned no row", 500);

  const action = scheduledAt ? "ANNOUNCEMENT_SCHEDULED" : "ANNOUNCEMENT_CREATED";
  try {
    await addAudit({
      action,
      userId: auth.userId,
      role: auth.role,
      details: { id, title, audience, priority, scheduled_at: scheduledAt, published: isPublished },
    });
  } catch {}

  return ok(inserted, 201);
}

export const POST = withAdminMutation(handlePost, { rateLimit: RATE_LIMITS.mutation });
