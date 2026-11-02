// Worker Job: Backfill Business Invariant Violations
//
// Backfills the legacy rows that violate the NOT VALID constraints added in
// 20270104000001_business_invariants.sql, so `VALIDATE CONSTRAINT` can be
// run and the constraints become real (immediate-enforcement) guards.
//
// Run manually: node worker/jobs/backfill_invariants.js
//
// Violations addressed:
//   1. permissions: workflow_type='hostel' AND hostel_scope IS NULL
//      -> default to the env BACKFILL_HOSTEL_SCOPE (default 'boys').
//   2. student_details: current_entry_type='hosteller' but block/room NULL
//      -> the constraint is correct: a hosteller MUST have a room. These
//         rows are import data errors; reset to 'day_student' (honest state:
//         no room assigned) so mess-billing and allocation queries keep
//         working.

import { getWorkerDbPool } from '../db.js';

export default async function backfillInvariants() {
  const pool = getWorkerDbPool();
  const hostelScope = process.env.BACKFILL_HOSTEL_SCOPE || 'boys';

  console.log('[backfill] Fixing permissions with hostel workflow but NULL scope...');
  const permRes = await pool.query(
    `UPDATE public.permissions
        SET hostel_scope = $1
      WHERE workflow_type = 'hostel'
        AND hostel_scope IS NULL`,
    [hostelScope]
  );
  console.log(`[backfill] permissions fixed: ${permRes.rowCount}`);

  console.log('[backfill] Fixing hostellers with missing room/block...');
  const stdRes = await pool.query(
    `UPDATE public.student_details
       SET current_entry_type = 'day_student'
     WHERE current_entry_type = 'hosteller'
       AND (hostel_block IS NULL OR room_number IS NULL)`
  );
  console.log(`[backfill] student_details fixed: ${stdRes.rowCount}`);

  // Now validate all four constraints.
  console.log('[backfill] Validating constraints...');
  const constraints = [
    'permissions_hostel_scope_required',
    'permissions_from_before_to',
    'hosteller_requires_room',
    'email_queue_attempts_bounded',
  ];
  for (const conname of constraints) {
    try {
      await pool.query(
        `ALTER TABLE ${conname.startsWith('permissions_') ? 'public.permissions'
          : conname.startsWith('hosteller_') ? 'public.student_details'
          : 'public.notification_email_queue'}
         VALIDATE CONSTRAINT ${conname}`
      );
      console.log(`[backfill] validated ${conname}`);
    } catch (err) {
      console.error(`[backfill] VALIDATE failed for ${conname}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

// Direct-run support
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillInvariants().catch((err) => {
    console.error('[backfill] fatal:', err);
    process.exit(1);
  });
}
