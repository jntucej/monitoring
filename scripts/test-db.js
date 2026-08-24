const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function runTest() {
  console.log("=== Testing Supabase Connection & Schema ===");
  
  const tables = ['gates', 'users', 'student_details', 'employee_details', 'movement_logs', 'gate_passes', 'alerts', 'notifications'];
  let passed = 0;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact' });
    if (error) {
      console.error(`[FAIL] Table [${table}]:`, error.message);
    } else {
      console.log(`[PASS] Table [${table}]: Accessible (${data?.[0]?.count ?? 0} rows)`);
      passed++;
    }
  }

  console.log(`\nResults: ${passed}/${tables.length} tables verified.`);
}

runTest();
