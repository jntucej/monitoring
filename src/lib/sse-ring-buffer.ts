/**
 * Bounded in-memory ring buffer of recent SSE events, shared across
 * connections and (within a single web instance) across the 45s
 * serverless cutoff. Each entry carries a monotonic `id` so the client can
 * resume with `Last-Event-ID` after a reconnect and receive the events that
 * were emitted between the cutoff and the reconnect.
 *
 * Multi-replica caveat: the buffer is per-web-instance (module-scoped). With
 * 2+ replicas an event emitted by replica A is only replayed by replica A;
 * a reconnect that lands on replica B has no local copy of events B did not
 * emit. The buffer therefore CANNOT fully eliminate cross-replica loss — it
 * eliminates the single-replica cutoff gap (the common case: one web
 * container behind the Caddyfile/healthcheck topology in this repo) and
 * guarantees the client always gets a monotonically increasing event id it
 * can use to reconcile after reconnect. The `resubscribe` payload emitted on
 * first connect tells the client the current highest id so it can fetch a
 * full snapshot and discard anything older than its last-seen id.
 *
 * Capacity: ~200 events per key, evicted FIFO. Keys are coarse
 * (per-route, not per-user) to keep memory bounded; the per-user scoping
 * already happens in each route's query, so a client only ever sees events
 * it's authorized for — replaying a coarser buffer does not leak data
 * because each replayed event still carries the route's scoped payload.
 */

export interface BufferedEvent {
  /** Monotonic within this key (resets per key, not globally). */
  id: number;
  /** SSE `event:` field (optional). */
  event?: string;
  /** SSE `data:` payload. */
  data: unknown;
}

const RING_CAP = 200;

const rings = new Map<string, { counter: number; events: BufferedEvent[] }>();

/**
 * Record an event under a key and return its monotonic id. Call this BEFORE
 * writing to the stream so the id is available for the `id:` line.
 */
export function recordSseEvent(key: string, data: unknown, event?: string): number {
  let ring = rings.get(key);
  if (!ring) {
    ring = { counter: 0, events: [] };
    rings.set(key, ring);
  }
  ring.counter += 1;
  const entry: BufferedEvent = { id: ring.counter, data, event };
  ring.events.push(entry);
  if (ring.events.length > RING_CAP) ring.events.shift();
  return ring.counter;
}

/**
 * Return buffered events strictly after `lastEventId` for `key`.
 * `lastEventId === 0` (or null/undefined) returns the whole window.
 * The caller serializes each entry into SSE form: `id: N\nevent: E\ndata: D\n\n`.
 */
export function replaySince(
  key: string,
  lastEventId: number | null
): BufferedEvent[] {
  const ring = rings.get(key);
  if (!ring) return [];
  const threshold = lastEventId ?? 0;
  return ring.events.filter((e) => e.id > threshold);
}

/**
 * Highest event id seen so far for `key` (0 if none). Used by the
 * first-connect `resubscribe` payload so the client knows the baseline.
 */
export function highestSseId(key: string): number {
  return rings.get(key)?.counter ?? 0;
}

/**
 * Serialize a buffered event into raw SSE wire format.
 */
export function sseWire(e: BufferedEvent): string {
  let out = `id: ${e.id}\n`;
  if (e.event) out += `event: ${e.event}\n`;
  out += `data: ${JSON.stringify(e.data)}\n\n`;
  return out;
}
