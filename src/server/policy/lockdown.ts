import { LockedError } from "@/server/http/errors";

export interface ActiveLockdown {
  id: string;
  scopes: string[];
  message: string | null;
}

/**
 * Throws LockedError if the campus (or the specific gate) is under lockdown.
 * A lockdown with empty scopes or scope "all" blocks every gate.
 * A lockdown with explicit gate IDs blocks only those gates.
 */
export function assertNotLockedOut(
  lockdown: ActiveLockdown | null,
  gateId: string,
): void {
  if (!lockdown) return;

  const global = lockdown.scopes.length === 0 || lockdown.scopes.includes("all");
  const gateScoped = lockdown.scopes.includes(gateId);

  if (global || gateScoped) {
    throw new LockedError(lockdown.message ?? "Campus lockdown is active");
  }
}
