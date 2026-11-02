import { NextRequest } from "next/server";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withTransaction, query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { addAudit } from "@/lib/db";
import { RATE_LIMITS } from "@/config/app-constants";
import type { AuthContext } from "@/lib/authContext";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(
  req: NextRequest,
  _ctx: { auth: AuthContext },
): Promise<Response> {
  const id = getIdFromPath(req);
  const res = await query("SELECT * FROM public.announcements WHERE id = $1 LIMIT 1", [id]);
  if (res.rows.length === 0) return fail("NOT_FOUND", "announcement not found", 404);
  return ok(res.rows[0]);
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_announcements", ...RATE_LIMITS.read },
);

async function handlePatch(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const id = getIdFromPath(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("INVALID_JSON", "request body must be JSON", 400);
  }
  if (!body || typeof body !== "object") return fail("INVALID_BODY", "body must be an object", 400);
  const payload = body as Record<string, unknown>;

  const fetchRes = await query("SELECT * FROM public.announcements WHERE id = $1 LIMIT 1", [id]);
  if (fetchRes.rows.length === 0) return fail("NOT_FOUND", "announcement not found", 404);

  const updateFields: Record<string, unknown> = {};
  if (typeof payload.title === "string" && payload.title) updateFields.title = payload.title;
  if (typeof payload.message === "string" && payload.message) updateFields.message = payload.message;
  if (typeof payload.body === "string" && payload.body) updateFields.message = payload.body;
  if (typeof payload.priority === "string" && payload.priority) updateFields.priority = payload.priority;
  if (typeof payload.audience === "string" && payload.audience) updateFields.audience = payload.audience;
  if (typeof payload.publishAt === "string") updateFields.scheduled_at = payload.publishAt;
  if (typeof payload.is_published === "boolean") updateFields.is_published = payload.is_published;
  if (payload.publishNow === true) {
    updateFields.is_published = true;
    updateFields.scheduled_at = null;
  }
  updateFields.updated_at = new Date().toISOString();

  if (Object.keys(updateFields).length === 1) return fail("NO_FIELDS", "no updatable fields provided", 400);

  const setClauses = Object.entries(updateFields)
    .map(([k, v]) => `${k} = $${Number(Object.keys(updateFields).indexOf(k)) + 1}`)
    .join(", ");
  const updateRes = await withTransaction(
    async (tx) => {
      const res = await tx.query(
        `UPDATE public.announcements SET ${setClauses} WHERE id = $${Object.keys(updateFields).length + 1} RETURNING *`,
        [...Object.values(updateFields), id],
      );
      if (res.rowCount === 0) throw new Error("announcement update returned 0 rows (RLS)");
      return res.rows[0];
    },
    { currentRole: auth.role, currentUserId: auth.userId },
  );
  const updated = updateRes;
  if (!updated) return fail("DB_ERROR", "Announcement update returned no row", 500);

  const willPublishNow = payload.publishNow === true || payload.is_published === true;
  const settingFuture = typeof payload.publishAt === "string" && new Date(payload.publishAt) > new Date();
  const action = willPublishNow
    ? "ANNOUNCEMENT_PUBLISHED"
    : settingFuture
      ? "ANNOUNCEMENT_SCHEDULED"
      : "ANNOUNCEMENT_UPDATED";

  try {
    await addAudit({
      action,
      userId: auth.userId,
      role: auth.role,
      details: { id, title: updated?.title, fields: Object.keys(updateFields) },
    });
  } catch {}

  return ok(updated);
}

export const PATCH = withAdminMutation(handlePatch, { rateLimit: RATE_LIMITS.mutation });

async function handleDelete(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const id = getIdFromPath(req);
  await withTransaction(
    async (tx) => {
      const res = await tx.query(
        `DELETE FROM public.announcements WHERE id = $1 RETURNING id`,
        [id],
      );
      if (res.rowCount === 0) throw new Error("announcement delete returned 0 rows (RLS or not found)");
    },
    { currentRole: auth.role, currentUserId: auth.userId },
  );

  try {
    await addAudit({
      action: "ANNOUNCEMENT_UPDATED",
      userId: auth.userId,
      role: auth.role,
      details: { id, deleted: true },
    });
  } catch {}

  return ok({ deletedId: id });
}

export const DELETE = withAdminMutation(handleDelete, { rateLimit: RATE_LIMITS.mutation });
