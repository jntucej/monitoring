const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/gate_monitor'
});

async function run() {
  const seedPassword = process.env.SYSADMIN_SEED_PASSWORD || crypto.randomBytes(16).toString('hex');
  const userId = process.env.SYSADMIN_SEED_ID || 'SYSADMIN';

  try {
    const passwordHash = await bcrypt.hash(seedPassword, 10);
    
    // Upsert user
    const res = await pool.query(`
      INSERT INTO users (id, unique_id, name, email, role, password_hash, status, pin_must_change)
      VALUES (gen_random_uuid(), $1, 'System Admin', 'sysadmin@college.edu', 'sysadmin', $2, 'ACTIVE', true)
      ON CONFLICT (unique_id) DO UPDATE SET 
        role = 'sysadmin', 
        password_hash = $2, 
        status = 'ACTIVE',
        pin_must_change = true;
    `, [userId, passwordHash]);
    
    // Also add an employee detail just in case the system expects it for SysAdmin
    await pool.query(`
      INSERT INTO employee_details (user_id, designation, department)
      VALUES ($1, 'System Administrator', 'IT')
      ON CONFLICT (user_id) DO NOTHING;
    `, [userId]);

    console.log("Successfully seeded SysAdmin 'nf16'.");
  } catch (err) {
    console.error("Error setting up user:", err);
  } finally {
    pool.end();
  }
}

run();
