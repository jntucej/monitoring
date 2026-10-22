import db from "../db.js";

export default async function cleanupEphemeral() {
  const results = [];
  const safeRun = async (key, sql) => {
    try {
      const r = await db.query(sql);
      results.push({ key, deleted: r.rowCount ?? 0 });
    } catch (err) {
      results.push({ key, error: String(err.message ?? err) });
    }
  };

  await safeRun(
    "scan_nonces",
    `DELETE FROM scan_nonces WHERE expires_at < NOW() - INTERVAL '1 hour'`,
  );
  await safeRun(
    "idempotency_keys",
    `DELETE FROM idempotency_keys WHERE expires_at < NOW()`,
  );
  await safeRun(
    "mfa_login_challenges",
    `DELETE FROM mfa_login_challenges WHERE expires_at < NOW()`,
  );
  await safeRun(
    "password_reset_tokens",
    `DELETE FROM password_reset_tokens
      WHERE used_at IS NOT NULL
         OR expires_at < NOW() - INTERVAL '7 days'`,
  );
  await safeRun(
    "enrollment_codes",
    `DELETE FROM enrollment_codes
      WHERE used_at IS NOT NULL
         OR expires_at < NOW() - INTERVAL '7 days'`,
  );
  return { success: true, data: { results } };
}
