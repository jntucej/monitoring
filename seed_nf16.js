const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgres://postgres:bdb7c264e1c2725edc1b@127.0.0.1:5432/gate_monitor'
});

async function run() {
  try {
    const passwordHash = await bcrypt.hash('junaid', 10);
    const userId = 'nf16';
    
    // Upsert user
    const res = await pool.query(`
      INSERT INTO users (id, unique_id, name, email, role, password_hash, status)
      VALUES ($1, $1, 'System Admin', 'nf16@ucej.in', 'sysadmin', $2, 'active')
      ON CONFLICT (id) DO UPDATE SET 
        role = 'sysadmin', 
        password_hash = $2, 
        status = 'active';
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
