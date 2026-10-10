const { createUser, hashPin } = require("@/lib/db");
const bcrypt = require("bcryptjs");

async function run() {
  const passwordHash = await bcrypt.hash("junaid", 10);
  const pinHash = await bcrypt.hash("nf16", 10);
  
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
      unique_id: "SYSADMIN"
  }, { onConflict: 'id' });
  console.log("Sysadmin seeded/updated.");
}
run();
