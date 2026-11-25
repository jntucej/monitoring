-- 20270131000022_activity_feed.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.student_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL,
  category    text NOT NULL CHECK (category IN (
    'academic', 'hostel', 'gate', 'mess', 'security',
    'achievement', 'club', 'financial', 'system'
  )),
  event_type  text NOT NULL,
  title       text NOT NULL,
  body        text,
  entity_type text,
  entity_id   uuid,
  actor_id    uuid,
  actor_role  text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz,
  archived_at timestamptz,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_student
  ON public.student_activity (student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_cat
  ON public.student_activity (student_id, category, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.emit_activity_from_movement() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.student_activity
    (student_id, category, event_type, title, entity_type, entity_id, actor_id, actor_role, occurred_at)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.category = 'hostel' THEN 'hostel' ELSE 'gate' END,
    'gate_' || LOWER(COALESCE(NEW.direction, 'scan')),
    COALESCE(NEW.gate_name, 'Gate') || ' — ' || COALESCE(NEW.direction, 'SCAN'),
    'movement_log',
    NEW.id,
    NEW.operator_id,
    'operator',
    COALESCE(NEW.timestamp, NOW())
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_from_movement ON public.movement_logs;
CREATE TRIGGER trg_activity_from_movement
  AFTER INSERT ON public.movement_logs
  FOR EACH ROW EXECUTE FUNCTION public.emit_activity_from_movement();

COMMIT;
