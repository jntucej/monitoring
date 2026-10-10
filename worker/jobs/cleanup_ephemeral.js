/**
 * Deletes expired rows from every short-lived table.
 *
 * Runs every 15 minutes. All deletes are bounded by an index and use
 * the `expires_at` / `*_at` column.
 */
export default async function cleanupEphemeral() {
  const { query } = await import('../db.js');
  const { logger } = await import('../logger.mjs');

  const results = {};

  // 1. login_attempts — remove entries not locked and older than 24h
  {
    const { rowCount } = await query(`
      DELETE FROM public.login_attempts
      WHERE locked_until IS NULL
        AND last_attempt_at < NOW() - INTERVAL '24 hours'
    `);
    results.login_attempts = rowCount;
  }

  // 2. sso_authorization_states — 15 min TTL by design
  {
    const { rowCount } = await query(`
      DELETE FROM public.sso_authorization_states
      WHERE expires_at < NOW() - INTERVAL '1 hour'
    `);
    results.sso_states = rowCount;
  }

  // 3. mfa_login_challenges — 5 min TTL
  {
    const { rowCount } = await query(`
      DELETE FROM public.mfa_login_challenges
      WHERE expires_at < NOW() - INTERVAL '1 hour'
    `);
    results.mfa_challenges = rowCount;
  }

  // 4. webauthn_challenges — 2 min TTL
  {
    const { rowCount } = await query(`
      DELETE FROM public.webauthn_challenges
      WHERE expires_at < NOW() - INTERVAL '1 hour'
    `);
    results.webauthn_challenges = rowCount;
  }

  // 5. password_reset_tokens — 1 hour TTL, keep used rows for 24h for audit
  {
    const { rowCount } = await query(`
      DELETE FROM public.password_reset_tokens
      WHERE (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '24 hours')
         OR (used_at IS NULL AND expires_at < NOW() - INTERVAL '24 hours')
    `);
    results.pwd_reset = rowCount;
  }

  // 6. mobile_enrollment_codes — 15 min TTL
  {
    const { rowCount } = await query(`
      DELETE FROM public.mobile_enrollment_codes
      WHERE expires_at < NOW() - INTERVAL '1 day'
    `);
    results.mobile_enroll = rowCount;
  }

  // 7. scan_nonces — 5 min replay window; keep 1 hour for safety margin
  {
    const { rowCount } = await query(`
      DELETE FROM public.scan_nonces
      WHERE seen_at < NOW() - INTERVAL '1 hour'
    `);
    results.scan_nonces = rowCount;
  }

  // 8. revoked_tokens — JWT TTL maxes at 24h; keep 25h
  {
    const { rowCount } = await query(`
      DELETE FROM public.revoked_tokens
      WHERE expires_at < NOW() - INTERVAL '1 hour'
    `);
    results.revoked_tokens = rowCount;
  }

  logger.info(results, 'cleanup.ephemeral.complete');
  return { recordsAffected: Object.values(results).reduce((a, b) => a + (b ?? 0), 0) };
}
