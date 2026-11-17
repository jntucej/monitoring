-- 20270117000001_birthday_notifications.sql
-- One-time-per-year birthday celebration: cron finds users whose
-- month-day equals today, inserts a notification for each (in_app),
-- and records them in birthday_celebrated so the celebration fires
-- at most once per calendar year per user.

BEGIN;

CREATE TABLE IF NOT EXISTS public.birthday_celebrated (
  user_id UUID NOT NULL REFERENCES public.users(id),
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

GRANT SELECT, INSERT ON public.birthday_celebrated TO gate_app, admin, authenticated;

COMMIT;
