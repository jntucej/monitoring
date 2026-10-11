const { createUser, hashPin } = require("@/lib/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function run() {
  const seedPassword = process.env.SYSADMIN_SEED_PASSWORD || crypto.randomBytes(16).toString("hex");
  const seedPin = process.env.SYSADMIN_SEED_PIN || crypto.randomInt(100000, 999999).toString();

  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const pinHash = await bcrypt.hash(seedPin, 10);
  
  // Update sysadmin@college.edu or create it if missing
  const { db } = require("@/lib/postgres");
  await db.from("users").upsert({
      id: "80eb29e3-7e71-48cb-a44c-6e0caa7f83f5",
      email: "sysadmin@college.edu",
      role: "sysadmin",
      status: "ACTIVE",
      name: "System Admin",
      password_hash: passwordHash,
      initial_pin_hash: pinHash,
      unique_id: "SYSADMIN",
      pin_must_change: true
  }, { onConflict: 'id' });
  console.log("Sysadmin seeded/updated (pin_must_change=true).");
}
run();
