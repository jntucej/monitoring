/**
 * 2 Backfill Daily Gate Stats movement_logs history.

 * Populates `daily_stats` table (one row per date + gate) aggregating
 * existing scan history. Historical days preserved; today's row built
 * too. Safe run multiple times rows upserted by (date, gate_id).

 * Usage: node scripts/backfill-daily-stats.js

 * Requires SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL (in env
 * .env.local), matching other scripts folder.
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let env = {};
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  envText.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL environment .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function backfill() {
  console.log('🔄 Backfilling daily_stats movement_logs...');

  // Aggregate in-memory: "date|gate_id": entries, exits, gate_name
  const agg = new Map();
  const add = (date, gateId, gateName, direction) => {
    const key = `${date}|${gateId}`;
    const cur = agg.get(key);
    if (!cur) {
      agg.set(key, { entries: 0, exits: 0, gate_name: gateName });
    }
    if (direction === 'entry') {
      agg.get(key).entries++;
    } else {
      agg.get(key).exits++;
    }
  };

  // Fetch scan history
  const { data: scans, error } = await supabase
    .from('movement_logs')
    .select('created_at, gate_id, gate_name, direction');

  if (error) {
    console.error('Error fetching movement_logs:', error);
    return;
  }

  for (const scan of scans) {
    const date = scan.created_at.split('T')[0];
    add(date, scan.gate_id, scan.gate_name, scan.direction);
  }

  // Upsert to daily_stats
  const values = Array.from(agg.entries()).map(([key, val]) => {
    const [date, gate_id] = key.split('|');
    return {
      date,
      gate_id,
      entries: val.entries,
      exits: val.exits,
      gate_name: val.gate_name,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from('daily_stats')
    .upsert(values, { onConflict: 'date, gate_id' });

  if (upsertError) {
    console.error('Error upserting daily_stats:', upsertError);
  } else {
    console.log(`✅ Upserted ${values.length} rows into daily_stats`);
  }
}

backfill();