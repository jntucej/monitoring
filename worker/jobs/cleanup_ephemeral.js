import { getWorkerDbPool } from "../db.js";

// Ephemeral/security-cleanup job: drops expired one-shot tokens so the
// DB doesn't accumulate abandoned nonces, MFA challenges, reset links,
// or enrollment codes. `db.js` has no default export — the original
// `import db from "../db.js"` + `db.query(...)` would have thrown at
// module load and the job would never have run.

const TABLES = [
  {
    key: "scan_nonces",
    table: "scan_nonces",
    where: "expires_at < NOW() - INTERVAL '1 hour'",
  },
  {
    key: "idempotency_keys",
    table: "idempotency_keys",
    where: "expires_at < NOW()",
  },
  {
    key: "mfa_login_challenges",
    table: "mfa_login_challenges",
    where: "expires_at < NOW()",
  },
  {
    key: "password_reset_tokens",
    table: "password_reset_tokens",
    where: "(used_at IS NOT NULL OR expires_at < NOW() - INTERVAL '7 days') AND expires_at IS NOT NULL",
  },
  {
    key: "enrollment_codes",
    table: "enrollment_codes",
    where: "(used_at IS NOT NULL OR expires_at < NOW() - INTERVAL '7 days') AND expires_at IS NOT NULL",
  },
];

export default async function cleanupEphemeral() {
  const pool = getWorkerDbPool();
  const results = [];
  const safeRun = async (entry) => {
    // Guard: some deployments may not have every table (partial schema
    // installs). Skip cleanly instead of failing the whole sweep.
    const exists = await pool.query(
      `SELECT to_regclass($1) IS NOT NULL AS t`,
      [entry.table],
    );
    if (!exists.rows[0]?.t) {
      results.push({ key: entry.key, skipped: "table_missing" });
      return;
    }
    try {
      const r = await pool.query(
        `DELETE FROM ${entry.table} WHERE ${entry.where}`,
      );
      results.push({ key: entry.key, deleted: r.rowCount ?? 0 });
    } catch (err) {
      results.push({ key: entry.key, error: String(err.message ?? err) });
    }
  };

  for (const entry of TABLES) {
    await safeRun(entry);
  }
  return { success: true, data: { results } };
}
