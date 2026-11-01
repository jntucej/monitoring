-- 20270101000020_add_bot_lang_prompted_at.sql
--
-- First-open language prompt for the Campus Assistant (bot).
--
-- `users.bot_lang` / `users.bot_voice_replies` are per-user, server-persisted
-- preferences. The UI (BotPanel) asks a brand-new user for a language choice
-- exactly once on their first bot-panel open, then never again — unless they
-- change it in /profile. This column records that the one-time prompt has
-- already been shown, so a user who closes the panel before choosing (or who
-- gets served by the server-default 'en') is not re-prompted on every open.
--
-- NULL = never prompted. SET = prompted; the user's choice (or the default)
-- is now stable.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bot_lang_prompted_at timestamptz;

COMMENT ON COLUMN public.users.bot_lang_prompted_at IS
  'When the one-time "choose your language" bot prompt was shown. NULL = never. '
  'Used by the bot UI to avoid re-asking users who already saw it.';
