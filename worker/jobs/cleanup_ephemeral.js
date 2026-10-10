/**
 * Deletes expired rows from every short-lived table.
 *
 * Runs every 15 minutes. All deletes are bounded by an index and use
 * the `expires_at` / `*_at` column.
 */
export default async function cleanupEphemeral() {
  const { query } = await import('../db.js');

  const results = {};

  const safeRun = async (key, sql) => {
    try {
      const res = await query(sql);
      results[key] = res?.rowCount || 0;
    } catch (err) {
      // If table does not exist or relation is locked, do not crash worker
      results[key] = 0;
    }
  };

  // 1. login_attempts — remove entries not locked and older than 24h
  await safeRun('login_attempts', `
    DELETE FROM public.login_attempts
    WHERE locked_until IS NULL
      AND last_attempt_at < NOW() - INTERVAL '24 hours'
  `);

  // 2. sso_authorization_states — 15 min TTL by design
  await safeRun('sso_states', `
    DELETE FROM public.sso_authorization_states
    WHERE expires_at < NOW() - INTERVAL '1 hour'
  `);

  // 3. mfa_login_challenges — 5 min TTL
  await safeRun('mfa_challenges', `
    DELETE FROM public.mfa_login_challenges
    WHERE expires_at < NOW() - INTERVAL '1 hour'
  `);

  // 4. webauthn_challenges — 2 min TTL
  await safeRun('webauthn_challenges', `
    DELETE FROM public.webauthn_challenges
    WHERE expires_at < NOW() - INTERVAL '1 hour'
  `);

  // 5. password_reset_tokens — 1 hour TTL, keep used rows for 24h for audit
  await safeRun('pwd_reset', `
    DELETE FROM public.password_reset_tokens
    WHERE (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours')
       OR (used_at IS NULL AND expires_at < NOW() - INTERVAL '24 hours')
  `);

  // 6. mobile_enrollment_codes — 15 min TTL
  await safeRun('mobile_enroll', `
    DELETE FROM public.mobile_enrollment_codes
    WHERE expires_at < NOW() - INTERVAL '1 day'
  `);

  // 7. scan_nonces — 5 min replay window; keep 1 hour for safety margin
  await safeRun('scan_nonces', `
    DELETE FROM public.scan_nonces
    WHERE seen_at < NOW() - INTERVAL '1 hour'
  `);

  // 8. revoked_tokens — JWT TTL maxes at 24h; keep 25h
  await safeRun('revoked_tokens', `
    DELETE FROM public.revoked_tokens
    WHERE expires_at < NOW() - INTERVAL '1 hour'
  `);

  console.log('[Worker] cleanup_ephemeral complete:', results);
  return { recordsAffected: Object.values(results).reduce((a, b) => a + (b ?? 0), 0) };
}
