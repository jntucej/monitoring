const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hgdlaghzerrrgkhqpdvz.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnZGxhZ2h6ZXJycmdraHFwZHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NTA0MiwiZXhwIjoyMTAyMzcxMDQyfQ.U6OPFP84AmFIb2MgKHdCRAQo2cXRC5OAheVIm7OOkvk";

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
