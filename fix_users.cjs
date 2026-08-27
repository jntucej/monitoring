const fs = require('fs');
const env = fs.readFileSync('/Users/akarsh/Desktop/CLG/GATE MONITOR/gate-monitor/.env.local', 'utf8');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.match(/^NEXT_PUBLIC_SUPABASE_URL=['"]?(.*?)['"]?$/m)?.[1];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.match(/^SUPABASE_SERVICE_ROLE_KEY=['"]?(.*?)['"]?$/m)?.[1];

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixAll() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: publicUsers } = await supabase.from('users').select('id, email, unique_id');

  let fixedAny = false;
  for (const au of authUsers.users) {
      const pUser = publicUsers.find(pu => pu.email === au.email);
      if (pUser && pUser.id !== au.id) {
          console.log(`Fixing ${au.email} (setting Public ID to ${au.id})...`);
          const { error } = await supabase.from('users').update({ id: au.id }).eq('email', au.email);
          if (error) console.error(`Failed to update ${au.email}:`, error);
          else {
            console.log(`Successfully aligned ${au.email}`);
            fixedAny = true;
          }
      }
  }
  if (!fixedAny) console.log('All users are perfectly aligned now.');
}
fixAll();
