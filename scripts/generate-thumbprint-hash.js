/**
 * generate-thumbprint-hash.js
 *
 * Generates a VALID bcrypt hash for a mock thumbprint signature so you can
 * seed `users.thumbprint_hash` directly in the Supabase SQL editor (the CLI
 * can't be used here because there's no access token / DB password on disk).
 *
 * Usage:
 *   node scripts/generate-thumbprint-hash.js <signature> [--uniqueId <id>]
 *
 * Example:
 *   node scripts/generate-thumbprint-hash.js "test-sig-25JJ5A1203" --uniqueId "25JJ5A1203"
 *
 * Prints a ready-to-run SQL UPDATE statement. Copy the output into the
 * Supabase SQL editor and run it.
 */
const bcrypt = require("bcryptjs");

const [, , signature, flag, uniqueId] = process.argv;

if (!signature) {
  console.error("Usage: node scripts/generate-thumbprint-hash.js <signature> [--uniqueId <id>]");
  process.exit(1);
}

const hash = bcrypt.hashSync(signature, 10);
console.log(`Signature : ${signature}`);
console.log(`Hash      : ${hash}`);
console.log("");

if (flag === "--uniqueId" && uniqueId) {
  console.log("-- Run this in the Supabase SQL editor: --");
  console.log(
    `UPDATE users\nSET thumbprint_hash = '${hash}', thumbprint_verified_at = NOW()\nWHERE unique_id = '${uniqueId}';`
  );
} else {
  console.log(`UPDATE users SET thumbprint_hash = '${hash}', thumbprint_verified_at = NOW() WHERE id = '<USER_UUID>';`);
}