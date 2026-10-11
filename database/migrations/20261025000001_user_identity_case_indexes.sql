
-- Add case-insensitive indexes for user identity fields
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON public.users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_login_identifier_lower_key 
  ON public.users (LOWER(login_identifier)) WHERE login_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_unique_id_lower_key ON public.users (LOWER(unique_id));
