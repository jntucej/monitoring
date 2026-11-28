/**
 * broadcastLockdownEvent — immediate fan-out when a lockdown rule is
 * created, approved, or lifted.
 *
 * Two mechanisms, both safe and idempotent:
 *   1. Record an event into the `lockdown-stream` ring buffer so any
 *      reconnecting SSE client (Last-Event-ID) replays it within ~10s.
 *   2. The live `/api/admin/lockdown/stream` route polls the rule set every
 *      2s, so even a brand-new client sees the new state within ≤2s.
 *
 * This is fire-and-forget: it never throws and never blocks the write
 * path. Audit + SMS/Telegram fan-out are separate concerns (outbound-alert
 * queue) and are NOT wired here to avoid coupling the lockdown write to
 * external side effects.
 */
import { recordSseEvent } from "./sse-ring-buffer";
import type { LockdownRule } from "@/server/policy/lockdown";

const LOCKDOWN_RING = "lockdown-stream";

export async function broadcastLockdownEvent(
  rule: Pick<
    LockdownRule,
    | "id"
    | "scope_type"
    | "direction"
    | "status"
    | "public_message"
    | "expires_at"
  >,
  action: "created" | "approved" | "lifted" | "expired",
): Promise<void> {
  try {
    const id = recordSseEvent(
      LOCKDOWN_RING,
      {
        action,
        rule: {
          id: rule.id,
          scope_type: rule.scope_type,
          direction: rule.direction,
          status: rule.status,
          public_message: rule.public_message,
          expires_at: rule.expires_at,
        },
        timestamp: new Date().toISOString(),
      },
      "lockdown",
    );
    // The live stream route's 2s poll will also surface this; recording here
    // just guarantees a reconnect within the window replays the exact event.
    void id;
  } catch {
    // Fire-and-forget: a ring-buffer failure must not block the write path.
  }
}
