#!/usr/bin/env bash
# Batch D: one-command fleet-wide session revocation (Meta's "invalidate
# everything" runbook). Bumps users.session_version for everyone (killing
# every live JWT) and revokes every unrevoked session row.
#
# Usage:
#   DATABASE_URL=... REASON="incident drill" scripts/revoke-all-sessions.sh
#   KEEP_SELF=<uuid> ...   — preserve one user's sessions (the caller)
set -euo pipefail
DB_URL="${DATABASE_URL:?DATABASE_URL must be set (or pass it)}"
KEEP_SELF="${KEEP_SELF:-}"
REASON="${REASON:-manual}"

PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -q)

if [ -n "$KEEP_SELF" ]; then
  echo "==> Bumping session_version for all users except $KEEP_SELF"
  "${PSQL[@]}" -v keep="$KEEP_SELF" <<'SQL'
UPDATE public.users
   SET session_version = session_version + 1,
       updated_at = NOW()
 WHERE deleted_at IS NULL
   AND id <> :'keep';
SQL
  echo "==> Revoking all sessions except $KEEP_SELF"
  "${PSQL[@]}" -v keep="$KEEP_SELF" <<'SQL'
UPDATE public.sessions
   SET revoked_at = NOW()
 WHERE revoked_at IS NULL
   AND user_id <> :'keep';
SQL
else
  echo "==> Bumping session_version for all users"
  "${PSQL[@]}" <<'SQL'
UPDATE public.users
   SET session_version = session_version + 1,
       updated_at = NOW()
 WHERE deleted_at IS NULL;
SQL
  echo "==> Revoking all sessions"
  "${PSQL[@]}" <<'SQL'
UPDATE public.sessions
   SET revoked_at = NOW()
 WHERE revoked_at IS NULL;
SQL
fi

echo "==> Writing audit row"
"${PSQL[@]}" -v reason="$REASON" -v keep="${KEEP_SELF:-none}" <<'SQL'
INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
VALUES ('SESSION_FORCE_REVOKED', NULL, 'ops', 'system',
        jsonb_build_object('scope', CASE WHEN :'keep' = 'none' THEN 'all' ELSE 'all-except-self' END,
                           'reason', :'reason',
                           'kept_user', CASE WHEN :'keep' = 'none' THEN NULL ELSE :'keep'::uuid END));
SQL

echo "OK — every JWT is now invalid (session_version bumped) and every session row is revoked."
echo "     Users will be forced to log in again on their next request."
