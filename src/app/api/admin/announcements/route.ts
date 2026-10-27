import { NextRequest } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { ok, fail } from "@/server/http/response";
import { addAudit } from "@/lib/db";
import { assertLength, LIMITS } from "@/lib/validation";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";
import type { NextResponse } from "next/server";

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "request body must be JSON", 400);
  }
  if (!body || typeof body !== "object") return fail("INVALID_BODY", "body must be an object", 400);
  const payload = body as Record<string, unknown>;

  try {
    assertLength(String(payload.title ?? ""), LIMITS.ANNOUNCEMENT_TITLE, "title");
    assertLength(String(payload.message ?? payload.body ?? ""), LIMITS.ANNOUNCEMENT_MESSAGE, "message");
  } catch (e) {
    return fail("VALIDATION_FAILED", e instanceof Error ? e.message : "invalid input", 400);
  }

  const title = String(payload.title ?? "");
  const message = String(payload.message ?? payload.body ?? "");
  const audience = typeof payload.audience === "string" ? payload.audience : "all";
  const priority = typeof payload.priority === "string" ? payload.priority : "medium";
  const publishNow = payload.publishNow === true;
  const publishAt = typeof payload.publishAt === "string" ? payload.publishAt : null;

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

  const supabase = getSupabaseServiceClient();
  const { error: dbError } = await supabase.from("announcements").insert(row);
  if (dbError) return fail("DB_ERROR", dbError.message, 500);

  const action = scheduledAt ? "ANNOUNCEMENT_SCHEDULED" : "ANNOUNCEMENT_CREATED";
  try {
    await addAudit({
      action,
      userId: auth.userId,
      role: auth.role,
      details: { id, title, audience, priority, scheduled_at: scheduledAt, published: isPublished },
    });
  } catch {}

  return ok(row, 201);
}

export const POST = withAdminMutation(handlePost, { rateLimit: RATE_LIMITS.mutation });
