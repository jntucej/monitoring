// src/lib/dispatch-action.ts
// The ONLY place a mutation leaves the client.
// Every action in the system funnels through here:
//   permission check → idempotency dedupe → POST → audit → return
// No role component may call fetch for a mutation directly.

import type { ActionEnvelope, ActionResult } from "./action-envelope";

const seen = new Map<string, Promise<ActionResult>>();

export async function dispatchAction(
  envelope: ActionEnvelope,
): Promise<ActionResult> {
  // Idempotency: if this key is already in flight, return the same promise.
  const existing = seen.get(envelope.idempotencyKey);
  if (existing) return existing;

  const promise = (async (): Promise<ActionResult> => {
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
      const body: ActionResult = await res.json().catch(() => ({
        status: res.ok ? "ok" : "denied",
        error: res.status === 429 ? "Rate limited" : `HTTP ${res.status}`,
      }));
      return body;
    } catch (err) {
      return {
        status: "denied",
        error: err instanceof Error ? err.message : "Network error",
      };
    } finally {
      // Keep the entry for a short window to catch double-taps;
      // release after success or 30 s.
      setTimeout(() => seen.delete(envelope.idempotencyKey), 30_000);
    }
  })();

  seen.set(envelope.idempotencyKey, promise);
  return promise;
}
