import { getSupabaseServiceClient, supabase as browserClient } from './src/lib/supabaseClient';

const supabase = typeof window === 'undefined' ? getSupabaseServiceClient() : browserClient;

async function run() {
  const { data } = await supabase.from('users').select('*').limit(1);
  console.log('Result using conditional client:', data?.length);
}
run();
