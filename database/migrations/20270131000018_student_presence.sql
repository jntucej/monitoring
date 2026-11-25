-- 20270131000018_student_presence.sql
BEGIN;

ALTER TABLE public.student_details
  ADD COLUMN IF NOT EXISTS class_representative boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.library_memberships (
  user_id   uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  active    boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_presence (
  student_id      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  state           text NOT NULL DEFAULT 'unknown'
                    CHECK (state IN ('in_hostel', 'on_campus', 'out', 'on_leave', 'unknown')),
  since           timestamptz NOT NULL DEFAULT now(),
  block_id        text,
  last_scan_id    uuid,
  last_scan_at    timestamptz,
  active_leave_id uuid,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presence_state ON public.student_presence (state);

CREATE OR REPLACE FUNCTION public.update_student_presence() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  new_state text;
  new_block text;
  gate_type text;
BEGIN
  IF TG_TABLE_NAME = 'movement_logs' THEN
    SELECT g.type INTO gate_type FROM public.gates g WHERE g.id = NEW.gate_id;
    IF (NEW.category = 'hostel' OR gate_type = 'hostel') AND NEW.direction = 'IN' THEN
      new_state := 'in_hostel';
      SELECT COALESCE(sd.hostel_block, g.location) INTO new_block
        FROM public.users u
        LEFT JOIN public.student_details sd ON sd.user_id = u.id
        LEFT JOIN public.gates g ON g.id = NEW.gate_id
       WHERE u.id = NEW.user_id;
    ELSIF (NEW.category = 'hostel' OR gate_type = 'hostel') AND NEW.direction = 'OUT' THEN
      new_state := 'on_campus';
    ELSIF (NEW.category = 'main' OR gate_type = 'main') AND NEW.direction = 'OUT' THEN
      new_state := 'out';
    ELSIF (NEW.category = 'main' OR gate_type = 'main') AND NEW.direction = 'IN' THEN
      new_state := 'on_campus';
    END IF;

    IF new_state IS NOT NULL THEN
      INSERT INTO public.student_presence
        (student_id, state, since, block_id, last_scan_id, last_scan_at, updated_at)
      VALUES
        (NEW.user_id, new_state, NEW.timestamp, new_block, NEW.id, NEW.timestamp, NOW())
      ON CONFLICT (student_id) DO UPDATE SET
        state        = EXCLUDED.state,
        since        = EXCLUDED.since,
        block_id     = COALESCE(EXCLUDED.block_id, public.student_presence.block_id),
        last_scan_id = EXCLUDED.last_scan_id,
        last_scan_at = EXCLUDED.last_scan_at,
        updated_at   = NOW();
    END IF;
  ELSIF TG_TABLE_NAME = 'permissions' AND NEW.status = 'APPROVED' THEN
    INSERT INTO public.student_presence
      (student_id, state, since, active_leave_id, updated_at)
    VALUES
      (NEW.user_id, 'on_leave', NOW(), NEW.id, NOW())
    ON CONFLICT (student_id) DO UPDATE SET
      state           = 'on_leave',
      since           = NOW(),
      active_leave_id = NEW.id,
      updated_at      = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presence_from_movement ON public.movement_logs;
CREATE TRIGGER trg_presence_from_movement
  AFTER INSERT ON public.movement_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_student_presence();

DROP TRIGGER IF EXISTS trg_presence_from_leave ON public.permissions;
CREATE TRIGGER trg_presence_from_leave
  AFTER INSERT OR UPDATE OF status ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_student_presence();

COMMIT;
