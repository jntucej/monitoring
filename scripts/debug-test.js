import { createClient } from '@supabase/supabase-js';

async function debug() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }
  // ... rest of debug logic
  console.log("Debug would test here");
}

debug();