const { getSupabaseServiceClient } = require('/root/monitoring/src/lib/dbClient');
const db = getSupabaseServiceClient();

async function run() {
  const { data, error } = await db.from('users').select('*').eq('role', 'student');
  console.log('Users found:', data ? data.length : 0);
  console.log('Error:', error);
}
run();
