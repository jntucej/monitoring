// C1 fix: a read-then-check-then-insert guard is TOCTOU — two concurrent
// scans of the same person both read the same current_status, both pass
// the guard, both insert. Wrap the check + insert in a single transaction
// holding a row-level lock on the occupancy row so the guard is atomic.

import { withTransaction } from "@/lib/postgres";
import { ConflictError } from "@/server/http/errors";
import type { CreateScanResult } from "@/server/repositories/scans/create";

/**
 * Atomically guard a same-direction scan.
 *
 * Acquires a lock on the caller's occupancy row (row-level FOR UPDATE when
 * a row exists; campus_occupancy's PK on user_id means no insert race),
 * then re-checks `current_status` while still holding the lock. If a
 * concurrent scan changed the status between our outer read and our lock
 * acquisition, we re-read from the locked row and decide based on the
 * fresh value.
 *
 * The caller passes `insert` (which creates the movement_log row via the
 * process_gate_scan RPC) so the lock stays held across the insert. On a
 * same-direction conflict a ConflictError is thrown — same behaviour as
 * the pre-fix read-only check, just now race-safe.
 *
 * Note: we intentionally lock the OCCUPANCY row, not the movement_log row
 * (which doesn't exist yet). Two concurrent scans of the same person
 * serialize on this lock; the second re-reads from the locked row and
 * observes the first scan's status flip.
 */
export async function withSameDirectionGuard(
  userId: string,
  direction: "IN" | "OUT",
  overrideRoles: ReadonlySet<string>,
  operatorRole: string,
  currentUserId: string,
  insert: () => Promise<CreateScanResult>,
): Promise<CreateScanResult> {
  return withTransaction(
    async (client) => {
      // FOR UPDATE on the occupancy row. If the row does not exist we
      // take no lock (there is nothing to guard); the insert below
      // creates it in a way that is already race-safe (the
      // idx_movement_logs_dedup partial-unique index inside
      // process_gate_scan catches a same-person same-minute double).
      const locked = await client.query<{ current_status: "IN" | "OUT" }>(
        `SELECT current_status FROM public.campus_occupancy
          WHERE user_id = $1
          FOR UPDATE`,
        [userId],
      );
      const row = locked.rows[0];

      if (row && !overrideRoles.has(operatorRole)) {
        if (row.current_status === direction) {
          throw new ConflictError(
            `Last known direction for this person is ${row.current_status}; ` +
              `same-direction scans are not accepted. Use a correction to override.`,
          );
        }
      }

      // The check passed while we hold the lock. Insert the movement log
      // (which also updates the occupancy row via trigger / service code).
      return await insert();
    },
    { currentUserId },
  );
}
