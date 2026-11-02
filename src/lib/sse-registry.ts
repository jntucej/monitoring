import type { ReadableStreamDefaultController } from "stream/web";

/**
 * Long-run resilience: per-replica cap on open SSE stream controllers.
 *
 * Without a cap, orphaned streams (kiosk tablet waking from sleep, browser
 * tab leaks, the old 45s churn) accumulate ReadableStream controllers in
 * process memory and the web container OOMs. The cap makes the overflow a
 * bounded, observable 503 (SSE_CAPACITY_EXCEEDED) instead of a silent hang.
 *
 * The cap is intentionally generous (200 per replica): a campus with 100
 * active dashboards × a few concurrent streams each stays well under it;
 * a leak that pushes past it is a real alert, not normal load.
 */
const MAX_PER_REPLICA = parseInt(process.env.SSE_MAX_PER_REPLICA || "200", 10);

/** stream key → set of live controllers (one per subscriber, not per user). */
const active = new Map<string, Set<ReadableStreamDefaultController>>();

export class SseCapacityError extends Error {
  constructor() {
    super("SSE capacity exceeded — retry shortly");
    this.name = "SseCapacityError";
  }
}

/**
 * Register a controller for a stream key (e.g. "gate-stream"). Throws
 * SseCapacityError when the replica-wide cap is reached — the route catches
 * it and returns 503 so the client backs off and retries.
 */
export function registerSse(key: string, controller: ReadableStreamDefaultController): void {
  let total = 0;
  for (const set of active.values()) total += set.size;
  if (total >= MAX_PER_REPLICA) throw new SseCapacityError();
  let set = active.get(key);
  if (!set) {
    set = new Set();
    active.set(key, set);
  }
  set.add(controller);
}

/**
 * Unregister on every cleanup path: client abort (req.signal), natural
 * close, and error. Call in the controller's `cancel`/`close` hooks and in
 * the abort listener so a closed tab cannot pin its controller in memory.
 */
export function unregisterSse(key: string, controller: ReadableStreamDefaultController): void {
  const set = active.get(key);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) active.delete(key);
}

/** Snapshot for /api/sysadmin/health, Prometheus gauge, and operator dashboards. */
export function sseMetrics(): { total_streams: number; active_keys: number; capacity: number } {
  let total = 0;
  for (const set of active.values()) total += set.size;
  return { total_streams: total, active_keys: active.size, capacity: MAX_PER_REPLICA };
}

// Test/ops hook: drop all registrations (used by a sysadmin "reset streams"
// admin action and by tests). Intentionally not part of the normal path.
export function _sseRegistryResetForTests(): void {
  active.clear();
}
