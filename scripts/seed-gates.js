const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let env = {};
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']$/g, '');
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedGates() {
  const gates = [
    { gate_code: "MAIN", name: "Main Campus Gate", location: "Main Entrance", type: "MAIN", is_active: true },
    { gate_code: "HOSTEL", name: "Hostel Gate", location: "Boys Hostel Block A", type: "HOSTEL", is_active: true },
    { gate_code: "BACK", name: "Back Gate", location: "Back Side", type: "BACK", is_active: true },
  ];

  console.log("Cleaning up old duplicates...");
  const { data: allGates } = await supabase.from('gates').select('id, gate_code');
  for (const g of allGates || []) {
    if (['GATE-01', 'GATE-02', 'GATE-03'].includes(g.gate_code)) {
      await supabase.from('gates').delete().eq('id', g.id);
      console.log("  Deleted: " + g.gate_code);
    }
  }

  console.log("Seeding 3 gates...");
  for (const g of gates) {
    const { error } = await supabase.from('gates').upsert(g, { onConflict: 'gate_code' });
    console.log(error ? "ERR: " + g.name + " - " + error.message : "OK: " + g.name);
  }

  const { data: final } = await supabase.from('gates').select('*').order('gate_code');
  console.log("\nFinal:");
  (final || []).forEach(g => console.log("  " + g.gate_code + " | " + g.name + " | " + (g.is_active ? "ONLINE" : "OFFLINE")));
}

seedGates().catch(console.error);
