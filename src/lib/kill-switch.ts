// src/lib/kill-switch.ts
// Batch I5: application-layer automation kill switches.
//
// Reads the automation_controls table (one row per autonomous subsystem)
// with a short in-memory cache so a hot path (e.g. every LLM call) does
// not hit Postgres on each request.
//
// Fail-open on DB errors: if Postgres is down the app should keep
// working rather than take the LLM / SMS / email paths offline. A dead
// DB is itself a SEV-2 that the Prometheus postgres_health alert catches.
//
// Fail-open on unknown switch name: a new switch added by a migration
// that this build does not know about should not block the subsystem.

import { query } from "@/lib/postgres";

const cache = new Map<string, { enabled: boolean; at: number }>();
const TTL_MS = 15_000;

export async function isAutomationEnabled(name: string): Promise<boolean> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.enabled;

  let enabled = true;
  try {
    const { rows } = await query<{ enabled: boolean }>(
      "SELECT enabled FROM public.automation_controls WHERE name = $1",
      [name],
    );
    // Unknown name → assume on (fail-open for forward compatibility).
    enabled = rows[0]?.enabled ?? true;
  } catch {
    // DB unreachable → keep the last-known value if we have one, else on.
    enabled = hit?.enabled ?? true;
  }
  cache.set(name, { enabled, at: Date.now() });
  return enabled;
}

export class KillSwitchDisabledError extends Error {
  constructor(
    public readonly name: string,
  ) {
    super(`automation '${name}' is disabled (kill switch)`);
    this.name = "KillSwitchDisabledError";
  }
}

/**
 * Blocks the caller when the named switch is off.
 * Throws KillSwitchDisabledError — callers should catch it and return a
 * 503 (or equivalent), not a 500.
 */
export async function requireEnabled(name: string): Promise<void> {
  if (!(await isAutomationEnabled(name))) {
    throw new KillSwitchDisabledError(name);
  }
}

/**
 * Test / dev helper: purge one entry (or all) so the next read hits PG.
 */
export function invalidateKillSwitchCache(name?: string): void {
  if (name) cache.delete(name);
  else cache.clear();
}
