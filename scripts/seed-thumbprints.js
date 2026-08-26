/**
 * seed-thumbprints.js
 *
 * Registers deterministic mock thumbprints (bcrypt hashes) for test users so
 * the operator flow can be tested end-to-end WITHOUT a fingerprint scanner.
 *
 * The operator scanner and admin UI capture the signature `sig:<user-id UUID>`,
 * so the stored hash must be bcrypt("sig:<uuid>") to produce a VERIFY match.
 *
 * Usage:
 *   node scripts/seed-thumbprints.js --uniqueIds OP-001,25JJ5A1203
 *   node scripts/seed-thumbprints.js --all
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * automatically. Exit code 1 if the thumbprint_hash column is missing (i.e.
 * migration 0004 has not been applied yet).
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

/** Minimal .env loader (avoids depending on node --env-file support). */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  }
}

loadEnvFile(path.join(__dirname, "..", ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const idsArg = args.find((a) => a.startsWith("--uniqueIds="));
  const uniqueIds = idsArg
    ? idsArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (!all && uniqueIds.length === 0) {
    console.error("Pass --uniqueIds=a,b,c or --all");
    process.exit(1);
  }

  const { data: users, error } = await client
    .from("users")
    .select("id, unique_id, thumbprint_hash")
    .order("unique_id");

  if (error) {
    console.error("Could not read users. Is migration 0004 applied?", error.message);
    process.exit(1);
  }

  const targets = all ? users : users.filter((u) => uniqueIds.includes(u.unique_id));
  if (targets.length === 0) {
    console.error("No matching users found.");
    process.exit(1);
  }

  let done = 0;
  for (const u of targets) {
    const signature = `sig:${u.id}`;
    const hash = bcrypt.hashSync(signature, 10);
    const { error: upErr } = await client
      .from("users")
      .update({ thumbprint_hash: hash, thumbprint_verified_at: new Date().toISOString() })
      .eq("id", u.id);

    if (upErr) {
      console.error(`  x ${u.unique_id} (${u.id}): ${upErr.message}`);
    } else {
      console.log(`  ✓ ${u.unique_id} (${u.id}) — hash of "sig:<uuid>" stored`);
      done++;
    }
  }
  console.log(`\nRegistered ${done}/${targets.length} thumbprint(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});