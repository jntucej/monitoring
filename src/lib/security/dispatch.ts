import { query } from "@/lib/postgres";
import { publishNotification } from "@/lib/notifications/bus";
import { publishSecurityEvent } from "./sse";

export interface SosRow {
  id: string;
  student_id: string;
  category: string;
  priority: "normal" | "urgent" | "critical";
  status: string;
  student_lat: number | null;
  student_lng: number | null;
  nearest_loc_id: string | null;
  chosen_loc_id: string | null;
}

export async function logSosEvent(
  sosId: string,
  actorId: string | null,
  actorRole: string | null,
  kind: string,
  payload: Record<string, unknown> = {},
) {
  await query(
    `INSERT INTO public.sos_events (sos_id, actor_id, actor_role, kind, payload)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)`,
    [sosId, actorId, actorRole, kind, JSON.stringify(payload)],
  );
}

export async function escalateSos(
  sosId: string,
  level: "supervisor" | "admin" | "guardian",
  reason: string,
) {
  await query(
    `UPDATE public.sos_requests SET status = 'escalated' WHERE id = $1::uuid AND status IN ('open','dispatched')`,
    [sosId],
  );
  await logSosEvent(sosId, null, "system", "escalated", { level, reason });

  const priority = level === "supervisor" ? "high" : "urgent";
  await publishNotification({
    eventType: `sos.escalated.${level}`,
    scope: "global",
    title: `SOS Escalated (${level.toUpperCase()})`,
    message: reason,
    payload: { sos_id: sosId, level, reason },
    priority,
    channels: ["in_app"],
  }).catch(() => {});

  publishSecurityEvent("sos_escalated", { sos_id: sosId, level, reason });
}

export async function dispatchSos(sos: SosRow): Promise<{ offered: number; escalated: boolean }> {
  const { rows: candidates } = await query<{
    assignment_id: string;
    operator_id: string;
    post_id: string;
    post_kind: string;
    distance_m: number | null;
  }>(
    `WITH sos AS (
       SELECT COALESCE(chosen_loc_id, nearest_loc_id) AS loc_id,
              student_lat, student_lng, priority
         FROM public.sos_requests WHERE id = $1::uuid
     ),
     sos_geo AS (
       SELECT COALESCE(cl.lat, s.student_lat) AS lat,
              COALESCE(cl.lng, s.student_lng) AS lng,
              s.priority
         FROM sos s LEFT JOIN public.campus_locations cl ON cl.id = s.loc_id
     ),
     candidates AS (
       SELECT spa.id AS assignment_id,
              spa.operator_id,
              spa.post_id,
              sp.kind AS post_kind,
              CASE
                WHEN gll.lat IS NOT NULL AND sg.lat IS NOT NULL THEN
                  earth_distance(
                    ll_to_earth(gll.lat::float8, gll.lng::float8),
                    ll_to_earth(sg.lat::float8, sg.lng::float8)
                  )::int
                ELSE NULL
              END AS distance_m
         FROM public.security_shifts sh
         JOIN public.shift_post_assignments spa ON spa.shift_id = sh.id
         JOIN public.security_posts sp ON sp.id = spa.post_id
         CROSS JOIN sos_geo sg
         LEFT JOIN LATERAL (
           SELECT lat, lng
             FROM public.guard_live_location g
            WHERE g.operator_id = spa.operator_id
              AND g.shift_id = sh.id
              AND g.recorded_at > NOW() - INTERVAL '5 minutes'
            ORDER BY g.recorded_at DESC
            LIMIT 1
         ) gll ON true
        WHERE sh.status IN ('published', 'active')
          AND NOW() BETWEEN sh.starts_at AND sh.ends_at
          AND spa.status = 'checked_in'
          AND sp.kind IN ('gate', 'patrol', 'sos_only')
          AND NOT EXISTS (
            SELECT 1 FROM public.sos_dispatch d
             WHERE d.operator_id = spa.operator_id
               AND d.status IN ('offered', 'accepted', 'en_route', 'on_scene')
               AND d.sos_id <> $1::uuid
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.sos_dispatch d2
             WHERE d2.sos_id = $1::uuid AND d2.operator_id = spa.operator_id
          )
     )
     SELECT * FROM candidates
      ORDER BY (distance_m IS NULL), distance_m ASC
      LIMIT 5`,
    [sos.id],
  );

  if (candidates.length === 0) {
    await escalateSos(sos.id, "supervisor", "No active guard on shift to dispatch");
    return { offered: 0, escalated: true };
  }

  for (const c of candidates) {
    await query(
      `INSERT INTO public.sos_dispatch (sos_id, operator_id, post_id, distance_m, status)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'offered')`,
      [sos.id, c.operator_id, c.post_id, c.distance_m],
    );
    await publishNotification({
      eventType: "sos.offered",
      scope: `user:${c.operator_id}`,
      title: `SOS (${sos.priority.toUpperCase()}): ${sos.category}`,
      message: c.distance_m != null ? `${c.distance_m}m away — tap to accept` : "Tap to accept SOS",
      payload: { sos_id: sos.id, category: sos.category, priority: sos.priority, distance_m: c.distance_m },
      priority: sos.priority === "critical" ? "urgent" : "high",
      channels: ["in_app"],
    }).catch(() => {});
  }

  await logSosEvent(sos.id, null, "system", "assigned", {
    candidate_count: candidates.length,
  });

  // Critical priority skips the 30s wait and escalates to supervisor in parallel
  if (sos.priority === "critical") {
    await escalateSos(sos.id, "supervisor", "Critical SOS — parallel supervisor alert");
  }

  publishSecurityEvent("sos_dispatched", { sos_id: sos.id, offered: candidates.length });
  return { offered: candidates.length, escalated: sos.priority === "critical" };
}

export async function acceptDispatch(
  sosId: string,
  dispatchId: string,
  operatorId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { rows: check } = await query<{ operator_id: string; status: string }>(
    `SELECT operator_id, status FROM public.sos_dispatch WHERE id = $1::uuid AND sos_id = $2::uuid LIMIT 1`,
    [dispatchId, sosId],
  );
  if (!check[0]) return { ok: false, status: 404, error: "dispatch_not_found" };
  if (check[0].operator_id !== operatorId) {
    return { ok: false, status: 403, error: "not_assigned_operator" };
  }

  // Atomic lease: only one guard can accept
  const { rows: won } = await query<{ id: string }>(
    `UPDATE public.sos_dispatch
        SET status = 'accepted', ack_at = NOW()
      WHERE id = $1::uuid
        AND sos_id = $2::uuid
        AND operator_id = $3::uuid
        AND status = 'offered'
        AND NOT EXISTS (
          SELECT 1 FROM public.sos_dispatch d2
           WHERE d2.sos_id = $2::uuid AND d2.status IN ('accepted', 'en_route', 'on_scene')
        )
      RETURNING id`,
    [dispatchId, sosId, operatorId],
  );

  if (!won[0]) {
    return { ok: false, status: 409, error: "already_taken" };
  }

  // Expire other offered rows for this SOS
  await query(
    `UPDATE public.sos_dispatch SET status = 'expired'
      WHERE sos_id = $1::uuid AND id <> $2::uuid AND status = 'offered'`,
    [sosId, dispatchId],
  );

  const { rows: sosRows } = await query<{ student_id: string }>(
    `UPDATE public.sos_requests SET status = 'dispatched' WHERE id = $1::uuid RETURNING student_id`,
    [sosId],
  );

  // Pause gate assignment if guard is on a gate post
  await query(
    `UPDATE public.shift_post_assignments
        SET notes = COALESCE(notes, '') || ' | paused_for_sos @ ' || NOW()::text
      WHERE operator_id = $1::uuid AND status = 'checked_in'`,
    [operatorId],
  ).catch(() => {});

  await logSosEvent(sosId, operatorId, "operator", "acked", { dispatch_id: dispatchId });

  if (sosRows[0]) {
    await publishNotification({
      eventType: "sos.accepted",
      scope: `user:${sosRows[0].student_id}`,
      title: "Security guard accepted your SOS",
      message: "A guard is preparing to head to your location.",
      payload: { sos_id: sosId, operator_id: operatorId },
      priority: "high",
      channels: ["in_app"],
    }).catch(() => {});
  }

  publishSecurityEvent("sos_accepted", { sos_id: sosId, dispatch_id: dispatchId, operator_id: operatorId });
  return { ok: true };
}

export async function transitionDispatch(
  sosId: string,
  dispatchId: string,
  operatorId: string,
  nextState: "en_route" | "on_scene" | "cleared",
  notes?: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { rows } = await query<{ operator_id: string; status: string }>(
    `SELECT operator_id, status FROM public.sos_dispatch WHERE id = $1::uuid AND sos_id = $2::uuid LIMIT 1`,
    [dispatchId, sosId],
  );
  const d = rows[0];
  if (!d) return { ok: false, status: 404, error: "dispatch_not_found" };
  if (d.operator_id !== operatorId) return { ok: false, status: 403, error: "not_assigned_operator" };

  const requiredPrev: Record<"en_route" | "on_scene" | "cleared", string> = {
    en_route: "accepted",
    on_scene: "en_route",
    cleared: "on_scene",
  };
  if (d.status !== requiredPrev[nextState]) {
    return {
      ok: false,
      status: 409,
      error: `invalid_transition: expected ${requiredPrev[nextState]}, got ${d.status}`,
    };
  }

  const tsCol =
    nextState === "en_route"
      ? "en_route_at"
      : nextState === "on_scene"
        ? "on_scene_at"
        : "cleared_at";

  await query(
    `UPDATE public.sos_dispatch SET status = $2, ${tsCol} = NOW() WHERE id = $1::uuid`,
    [dispatchId, nextState],
  );

  const sosStatus = nextState === "cleared" ? "resolved" : nextState;
  const { rows: sosRows } = await query<{ student_id: string }>(
    nextState === "cleared"
      ? `UPDATE public.sos_requests SET status = 'resolved', resolved_at = NOW() WHERE id = $1::uuid RETURNING student_id`
      : `UPDATE public.sos_requests SET status = $2 WHERE id = $1::uuid RETURNING student_id`,
    nextState === "cleared" ? [sosId] : [sosId, sosStatus],
  );

  await logSosEvent(sosId, operatorId, "operator", nextState, {
    dispatch_id: dispatchId,
    notes: notes ?? null,
  });

  if (sosRows[0]) {
    await publishNotification({
      eventType: `sos.${nextState}`,
      scope: `user:${sosRows[0].student_id}`,
      title: `SOS update: ${nextState.replace("_", " ")}`,
      message: notes || `Guard status is now ${nextState.replace("_", " ")}.`,
      payload: { sos_id: sosId, status: sosStatus },
      priority: "high",
      channels: ["in_app"],
    }).catch(() => {});
  }

  publishSecurityEvent(`sos_${nextState}`, { sos_id: sosId, dispatch_id: dispatchId, operator_id: operatorId });
  return { ok: true };
}
