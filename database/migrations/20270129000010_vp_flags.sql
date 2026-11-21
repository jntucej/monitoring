-- database/migrations/20270129000010_vp_flags.sql
-- VP ↔ Principal bridge: items one flags to the other.
-- A row is (from_role → to_role) with a short note + an optional ticket ref.
-- VP flags to Principal: from='vice_principal', to='principal'.
-- Principal responds (or flags down): from='principal', to='vice_principal'.
-- Resolved/acknowledged state lives on the responding row; the original flag
-- row stays as the audit record.

CREATE TABLE IF NOT EXISTS public.vp_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_role     text NOT NULL CHECK (from_role IN ('vice_principal','principal')),
  to_role       text NOT NULL CHECK (to_role IN ('vice_principal','principal')),
  ticket_id     uuid REFERENCES public.permissions(id) ON DELETE SET NULL,
  note          text NOT NULL,
  status        text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  responded_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  responded_at  timestamptz,
  UNIQUE (from_role, to_role, ticket_id, created_at, note)  -- dedupe identical flags
);

CREATE INDEX IF NOT EXISTS idx_vp_flags_from ON public.vp_flags (from_role, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vp_flags_to   ON public.vp_flags (to_role, status, created_at DESC);

-- Register the migration (keyed on `version`).
INSERT INTO public.schema_migrations (version, filename)
VALUES ('20270129000010_vp_flags.sql', '20270129000010_vp_flags.sql');
