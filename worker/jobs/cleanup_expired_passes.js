import { query } from '../db.js';

/**
 * Scheduled Job: Cleanup Expired Passes and Sessions.
 * Automatically marks expired gate passes as REJECTED/EXPIRED,
 * invalidates expired sessions, and cleans up single-use challenges.
 */
export default async function cleanupExpiredPasses() {
  console.log('[Worker Job] Starting expired passes & session cleanup...');

  try {
    // 1. Expire outdated gate_passes
    const gatePassRes = await query(
      `UPDATE gate_passes 
       SET final_status = 'REJECTED', 
           admin_comment = COALESCE(admin_comment, 'Automatically expired by background worker')
       WHERE final_status = 'PENDING' 
         AND to_datetime < NOW()`
    );
    console.log(`[Worker Job] Expired ${gatePassRes.rowCount || 0} pending gate passes.`);

    // 2. Expire outdated public.passes
    const passRes = await query(
      `UPDATE passes 
       SET status = 'expired', updated_at = NOW()
       WHERE status IN ('pending', 'approved', 'active') 
         AND valid_to < NOW()`
    );
    console.log(`[Worker Job] Expired ${passRes.rowCount || 0} active/pending passes.`);

    // 3. Invalidate expired user sessions
    const sessionRes = await query(
      `UPDATE sessions 
       SET revoked_at = NOW() 
       WHERE expires_at < NOW() 
         AND revoked_at IS NULL`
    );
    console.log(`[Worker Job] Revoked ${sessionRes.rowCount || 0} expired user sessions.`);

    // 4. Delete expired WebAuthn challenges
    const challengeRes = await query(
      `DELETE FROM webauthn_challenges 
       WHERE expires_at < NOW()`
    );
    console.log(`[Worker Job] Purged ${challengeRes.rowCount || 0} expired WebAuthn challenges.`);

    // 5. Delete expired password reset tokens
    const tokenRes = await query(
      `DELETE FROM password_reset_tokens 
       WHERE expires_at < NOW() OR used_at IS NOT NULL`
    );
    console.log(`[Worker Job] Purged ${tokenRes.rowCount || 0} stale password reset tokens.`);

    console.log('[Worker Job] Expired passes and sessions cleanup completed successfully.');
  } catch (err) {
    console.error('[Worker Job Error] Cleanup expired passes failed:', err.message);
  }
}

