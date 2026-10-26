-- P2 hardening: gates.name was only a soft NOT NULL (no non-empty CHECK),
-- so an empty-string gate name could be created and would surface as a blank
-- gate label across the operator/supervisor UIs. Enforce a non-empty,
-- non-whitespace name at the schema level (defence-in-depth on top of the
-- POST /api/gates validation added in the same pass).
BEGIN;

ALTER TABLE public.gates
  DROP CONSTRAINT IF EXISTS gates_name_check;
ALTER TABLE public.gates
  ADD CONSTRAINT gates_name_check
  CHECK (name IS NOT NULL AND trim(name) <> '');

COMMIT;
