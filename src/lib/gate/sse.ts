/**
 * Gate Records — SSE emission.
 *
 * The existing `/api/gate/stream` route polls the DB every 3 s and records
 * status changes in the shared `gate-stream` ring buffer. `emitGateEvent`
 * pushes a one-off `gate_event` record into that same ring so the next
 * poll cycle (or a reconnect replay) surfaces it to connected clients.
 *
 * This is a *fire-and-forget* call — it must not block or fail the primary
 * event write. The ring buffer is in-process; if this replica has no open
 * stream the event is simply recorded for any later replay.
 */
import { recordSseEvent } from "@/lib/sse-ring-buffer";
import { errMsg } from "@/lib/err-msg";

const RING_KEY = "gate-stream"; // same key the /api/gate/stream route uses

export interface EmitGateEventInput {
  gateId: string;
  event: {
    id: string;
    eventType: string;
    occurredAt: string;
    outcome: string;
  };
  derived: Record<string, unknown>;
  outcome: string;
}

/**
 * Push a newly-recorded gate event into the shared ring buffer. The next
 * `/api/gate/stream` poll (≤3 s) or a reconnecting client's replay will
 * surface it. Safe to call on every event write — the ring is bounded and
 * the record is a single in-memory push.
 */
export async function emitGateEvent(
  gateId: string,
  event: EmitGateEventInput["event"],
  derived: Record<string, unknown>,
  outcome: string
): Promise<void> {
  try {
    recordSseEvent(
      RING_KEY,
      {
        event: "gate_event",
        gateId,
        eventType: event.eventType,
        eventId: event.id,
        occurredAt: event.occurredAt,
        outcome,
        derived,
        timestamp: new Date().toISOString(),
      },
      "gate_event"
    );
  } catch (e) {
    // SSE fan-out is best-effort; never let it fail the write path.
    console.error("[gate] SSE emit failed", errMsg(e));
  }
}
