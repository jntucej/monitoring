// src/app/api/class-messages/route.ts
// POST — faculty/HOD/admin publishes a class notice.
//   mode='direct' → instant fan-out (handled by the release routine).
//   mode='relay'  → held for the named coordinator; auto_release_at set
//   (4h normal / 1h urgent per D4).
// GET  — student sees notices for their classes; faculty sees their own.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { getActiveCoordinators } from "@/lib/class-coordinator";
import { releaseClassMessage } from "@/lib/class-message-release";

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["faculty", "hod", "vice_principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Only faculty/HOD/VP/admin may publish class notices", 403);
  }
  const body = await req.json().catch(() => null);
  if (!body?.body || !Array.isArray(body.classIds) || body.classIds.length === 0) {
    return fail("VALIDATION_ERROR", "body and non-empty classIds are required", 400);
  }
  const mode: "direct" | "relay" = body.mode === "relay" ? "relay" : "direct";
  const urgency: "normal" | "urgent" = body.urgency === "urgent" ? "urgent" : "normal";
  const bodyHash = JSON.stringify(String(body.body).slice(0, 2000));

  // Relay mode requires a named active coordinator for at least one target class.
  let relayRole: string | null = null;
  if (mode === "relay") {
    const found = await findCoordinatorForClasses(body.classIds as string[]);
    if (!found) {
      return fail("VALIDATION_ERROR", "Relay mode requires an active class coordinator in at least one target class", 400);
    }
    relayRole = found.role;
  }

  // auto_release_at: D4 — 4h normal / 1h urgent.
  const releaseHours = urgency === "urgent" ? 1 : 4;
  const autoReleaseAt = new Date(Date.now() + releaseHours * 3600_000).toISOString();

  const { rows: ins } = await query<{ id: string }>(
    `INSERT INTO public.class_messages
       (author_id, class_ids, mode, urgency, body, body_hash, requires_ack,
        auto_release_at, relay_role)
     VALUES ($1, $2::uuid[], $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [auth.userId, JSON.stringify(body.classIds), mode, urgency,
     String(body.body), bodyHash, Boolean(body.requiresAck),
     mode === "direct" ? null : autoReleaseAt, relayRole],
  );
  const id = ins[0].id;

  // Direct mode: release + fan out immediately.
  if (mode === "direct") {
    await releaseClassMessage(id, auth.userId, "human");
  }

  return ok({ id, mode, released: mode === "direct", autoReleaseAt: mode === "direct" ? null : autoReleaseAt });
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role === "student") {
    // Student: notices for their department's classes (released only).
    // Department lives on student_details (users.department_id is empty).
    const { rows: me } = await query<{ dept: string | null }>(
      `SELECT department AS dept FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`, [auth.userId]);
    const dept = me[0]?.dept;
    if (!dept) return ok([]);
    const { rows } = await query(
      `SELECT m.id, m.body, m.urgency, m.mode, m.sent_at, m.released_at, m.requires_ack, m.supersede_of
         FROM public.class_messages m
         JOIN public.classes c ON c.id = ANY(m.class_ids)
        WHERE c.department_id = $1 AND m.released_at IS NOT NULL
        ORDER BY m.sent_at DESC LIMIT 50`,
      [dept],
    );
    return ok(rows);
  }
  // Faculty: their own notices.
  const { rows } = await query(
    `SELECT id, body, urgency, mode, released_at, auto_release_at, sent_at
       FROM public.class_messages WHERE author_id = $1
      ORDER BY sent_at DESC LIMIT 50`,
    [auth.userId],
  );
  return ok(rows);
}

async function findCoordinatorForClasses(classIds: string[]) {
  for (const raw of classIds) {
    // raw may be a class uuid or a department code.
    const { rows: cls } = await query<{ name: string }>(
      `SELECT name FROM public.classes
         WHERE ($1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                AND id = $1::uuid) OR department_id = $1
         LIMIT 1`, [raw]);
    const scopeToken = cls[0]?.name ?? raw;
    const coords = await getActiveCoordinators(scopeToken);
    if (coords.length > 0) return { role: coords[0].appointmentType === "icr" ? "icr" : "cr" };
  }
  return null;
}

export const POST = withAuthorization(implPost, {});
export const GET = withAuthorization(implGet, {});
