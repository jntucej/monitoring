/**
 * Notification bus — thin scope resolver + fan-out over the EXISTING
 * notification-service (`sendNotification`). We do NOT build a parallel store:
 * `notifications` is the single store; this module just answers "who is in
 * scope X" and tags the row with the new `event_type` / `scope` /
 * `actor_role` discriminators added by 20270131000006.
 *
 * Scope grammar (matches the spec): 'global' | 'dept:<id>' | 'hostel:<block>'
 * | 'class:<id>' | 'mess'. Resolution reads the users / class-membership
 * tables; a future `scope_members` materialized view can replace these queries
 * without changing the API surface.
 */
import { getDbClient } from "@/lib/db";
import { query } from "@/lib/postgres";
import { sendNotification } from "@/lib/notification-service";
import type { NotificationChannel } from "@/lib/notification-types";
import { errMsg } from "@/lib/err-msg";

export interface PublishInput {
  /** Discriminator, e.g. 'timetable.published', 'mess.menu.published', 'announcement'. */
  eventType: string;
  scope: string;
  payload: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: "low" | "normal" | "high" | "urgent";
  /** Title/body overrides; when omitted the notification-service template wins. */
  title?: string;
  message?: string;
  actorRole?: string;
  actorId?: string;
}

interface ScopeMember {
  userId: string;
  recipientType: "person" | "role" | "department" | "all";
}

/**
 * Resolve the concrete recipients for a scope. Returns user-level rows for
 * dept/hostel/class/mess (per-user delivery, so quiet-hours apply per
 * person) and a single 'role'/'all' row for global (the existing store
 * already fans 'all' to everyone).
 */
export async function resolveScopeMembers(scope: string): Promise<ScopeMember[]> {
  switch (scope) {
    case "global":
      return [{ userId: "all", recipientType: "all" }];

    case "mess":
      // Mess residents = users flagged eligible (mess_eligibility) OR hostel
      // residents. Reuse the eligibility table if present, else the mess
      // preference table.
      const { rows } = await query<{ user_id: string }>(
        `SELECT DISTINCT user_id FROM public.mess_eligibility WHERE active = true`
      );
      return rows.map((r) => ({ userId: r.user_id, recipientType: "person" as const }));

    default: {
      const [kind, ref] = scope.split(":");
      if (!ref) return [];
      if (kind === "user") {
        // A single-user scope (e.g. notify the leave requester directly).
        return [{ userId: ref, recipientType: "person" as const }];
      }
      switch (kind) {
        case "dept": {
          const { rows } = await query<{ user_id: string }>(
            `SELECT id AS user_id FROM public.users
              WHERE active = true AND department_id = $1`,
            [ref]
          );
          return rows.map((r) => ({ userId: r.user_id, recipientType: "person" as const }));
        }
        case "hostel": {
          const { rows } = await query<{ user_id: string }>(
            `SELECT id AS user_id FROM public.users
              WHERE active = true AND hostel_block_id = $1`,
            [ref]
          );
          return rows.map((r) => ({ userId: r.user_id, recipientType: "person" as const }));
        }
        case "class": {
          // Students in the class + the class's faculty (via faculty_assignments).
          const students = await query<{ user_id: string }>(
            `SELECT cm.student_id AS user_id FROM public.class_members cm
              WHERE cm.class_id = $1 AND cm.active = true`,
            [ref]
          );
          const faculty = await query<{ user_id: string }>(
            `SELECT fa.faculty_id AS user_id FROM public.faculty_assignments fa
              WHERE fa.class_id = $1 AND fa.active = true`,
            [ref]
          );
          return [
            ...students.rows.map((r) => ({ userId: r.user_id, recipientType: "person" as const })),
            ...faculty.rows.map((r) => ({ userId: r.user_id, recipientType: "person" as const })),
          ];
        }
        default:
          return [];
      }
    }
  }
}

/**
 * Publish an event to a scope: resolve members, insert one `notifications`
 * row per member (tagged event_type/scope/actor_role), and tag the new
 * discriminator columns. Per-member sendNotification already applies
 * quiet-hours + channel prefs.
 */
export async function publishNotification(input: PublishInput): Promise<number> {
  const members = await resolveScopeMembers(input.scope);
  if (members.length === 0) return 0;

  const type = input.eventType as Parameters<typeof sendNotification>[0];
  const channels = input.channels;
  let delivered = 0;

  for (const m of members) {
    try {
      const created = await sendNotification(
        type,
        m.userId,
        m.recipientType,
        input.payload,
        channels
      );
      if (created) {
        delivered++;
        // Tag the new discriminator columns so the "bus" is queryable by
        // event_type / scope without a parallel store.
        await query(
          `UPDATE public.notifications
              SET event_type = $1, scope = $2, actor_role = $3
            WHERE id = $4`,
          [input.eventType, input.scope, input.actorRole ?? null, created.id]
        );
      }
    } catch (e) {
      console.error(`[notify] publish failed for ${m.userId}`, errMsg(e));
    }
  }
  return delivered;
}
