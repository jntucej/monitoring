-- database/migrations/20261229000200_idempotency_composite_pk.sql
BEGIN;

DO $$
DECLARE pk_cols TEXT;
BEGIN
  SELECT string_agg(a.attname, ',') INTO pk_cols
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
   WHERE i.indrelid = 'idempotency_keys'::regclass AND i.indisprimary;
  IF pk_cols = 'key' THEN
    ALTER TABLE public.idempotency_keys DROP CONSTRAINT idempotency_keys_pkey;
    ALTER TABLE public.idempotency_keys
      ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (key, user_id, endpoint);
  END IF;
END $$;

ALTER TABLE public.idempotency_keys
  ALTER COLUMN response_body DROP NOT NULL;

COMMIT;
