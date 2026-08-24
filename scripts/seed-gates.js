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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment or .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedGates() {
  const gates = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      gate_code: "GATE-01",
      name: "Main Campus Gate",
      location: "Main Entrance",
      type: "MAIN",
      is_active: true,
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      gate_code: "GATE-02",
      name: "Hostel Gate 1",
      location: "Boys Hostel Block A",
      type: "HOSTEL",
      is_active: true,
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      gate_code: "GATE-03",
      name: "Library Gate",
      location: "Academic Block 2",
      type: "LIBRARY",
      is_active: true,
    }
  ];

  console.log("Seeding gates into Supabase...");
  for (const g of gates) {
    const { data, error } = await supabase.from('gates').upsert(g).select();
    if (error) {
      console.error(`Error seeding gate ${g.name}:`, error.message);
    } else {
      console.log(`✅ Seeded gate: ${g.name} (${g.id})`);
    }
  }
}

seedGates().catch(console.error);

