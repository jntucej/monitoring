-- 20270122000001_preference_layers.sql
--
-- 4-layer preference stack: user taste on top of role/persona/system.
--
-- user_preference_overrides: a user's stored taste (Layer 3). Generic
-- key-value so the whole registry can persist without a schema change per key.
-- The column-based personalization_prefs (quiet hours, density, digest) stays
-- as-is; this table is the catch-all for registry keys.
--
-- policy_overrides: the Layer-0 safety rail (rank "required"). Admin-managed;
-- a value here beats a user's stored value for a required key.

CREATE TABLE IF NOT EXISTS public.user_preference_overrides (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  prefs       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- key → value
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_overrides (
  key         TEXT PRIMARY KEY,
  value_json  JSONB NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  updated_by  UUID REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.user_preference_overrides TO gate_app, admin, authenticated;
GRANT SELECT ON public.policy_overrides TO gate_app, admin, authenticated;
