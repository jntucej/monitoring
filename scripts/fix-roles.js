const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let env = {};
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fixing user roles in database...");
  
  // 1. Ensure ADM-001 has role = 'admin'
  const { data: adm, error: admErr } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('unique_id', 'ADM-001')
    .select('unique_id, name, role, email');
    
  if (admErr) console.error("Error updating ADM-001:", admErr);
  else console.log("✅ ADM-001 updated to Admin:", adm);

  // 2. Ensure SYSADM-001 has role = 'sysadmin'
  const { data: sys, error: sysErr } = await supabase
    .from('users')
    .update({ role: 'sysadmin' })
    .eq('unique_id', 'SYSADM-001')
    .select('unique_id, name, role, email');
    
  if (sysErr) console.error("Error updating SYSADM-001:", sysErr);
  else console.log("✅ SYSADM-001 verified as SysAdmin:", sys);
}

main().catch(console.error);
