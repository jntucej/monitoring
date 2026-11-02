-- Long-run resilience: enforce business invariants at the schema so the
-- impossible state cannot exist, not just be unlikely.
--
-- All constraints are added NOT VALID (so legacy rows never block the
-- deploy); a follow-up VALIDATE CONSTRAINT step is safe once the
-- data-cleanup job has handled any offending legacy rows.

BEGIN;

-- permissions: hostel workflow requires a valid scope (no NULL leak).
ALTER TABLE public.permissions
  ADD CONSTRAINT permissions_hostel_scope_required
  CHECK (workflow_type <> 'hostel' OR hostel_scope IN ('boys', 'girls'))
  NOT VALID;

-- permissions: from_date must not be after to_date when both present.
ALTER TABLE public.permissions
  ADD CONSTRAINT permissions_from_before_to
  CHECK (from_date IS NULL OR to_date IS NULL OR from_date <= to_date)
  NOT VALID;

-- student_details: a hosteller must have a block and room — the mess
-- billing query and hostel allocation panel both assume this.
ALTER TABLE public.student_details
  ADD CONSTRAINT hosteller_requires_room
  CHECK (
    current_entry_type <> 'hosteller'
    OR (hostel_block IS NOT NULL AND room_number IS NOT NULL)
  )
  NOT VALID;

-- notification_email_queue: bound retry attempts so a poison message
-- cannot loop forever and hold a worker slot.
ALTER TABLE public.notification_email_queue
  ADD CONSTRAINT email_queue_attempts_bounded
  CHECK (attempts <= 10)
  NOT VALID;

COMMIT;

-- Validate now; if legacy rows violate a constraint the statement will
-- fail and the operator backfills before re-running VALIDATE.
-- (Run manually after the data cleanup, not in this migration.)
-- ALTER TABLE public.permissions VALIDATE CONSTRAINT permissions_hostel_scope_required;
-- ALTER TABLE public.permissions VALIDATE CONSTRAINT permissions_from_before_to;
-- ALTER TABLE public.student_details VALIDATE CONSTRAINT hosteller_requires_room;
-- ALTER TABLE public.notification_email_queue VALIDATE CONSTRAINT email_queue_attempts_bounded;
