/**
 * Backfill Daily Gate Stats from movement_logs history.
 *
 * Populates the `daily_stats` table (one row per date + gate) by aggregating
 * existing scan history. Historical days are preserved; today's row is built
 * too. Safe to run multiple times — rows are upserted by (date, gate_id).
 *
 * Usage:
 *   node scripts/backfill-daily-stats.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL (in env or
 * .env.local), matching the other scripts in this folder.
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let env = {};
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  envText.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in environment or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function backfill() {
  console.log('🔄 Backfilling daily_stats from movement_logs...');

  // Aggregate in-memory: { "date|gate_id": { entries, exits, gate_name } }
  const agg = new Map();
  const add = (date, gateId, gateName, direction) => {
    const key = `${date}|${gateId}`;
    const cur = agg.get(key) || { date, gateId, gateName, entries: 0, exits: 0 };
    if (direction === 'IN') cur.entries += 1;
    else cur.exits += 1;
    agg.set(key, cur);
  };

  // Page through movement_logs (service client bypasses RLS).
  const PAGE = 1000;
  let from = 0;
  let total = 0;
  for (;;) {
    const { data, error, count } = await supabase
      .from('movement_logs')
      .select('timestamp, gate_id, gate_name, direction', { count: 'exact' })
      .order('timestamp', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Error reading movement_logs:', error);
      process.exit(1);
    }
    total = count || 0;
    const rows = data || [];
    for (const r of rows) {
      const date = (r.timestamp || '').slice(0, 10);
      if (date) add(date, r.gate_id, r.gate_name, r.direction);
    }
    from += rows.length;
    if (rows.length === 0 || from >= total) break;
  }

  const rowsToUpsert = Array.from(agg.values()).map((r) => ({
    date: r.date,
    gate_id: r.gateId,
    gate_code: r.gateName,
    entries: r.entries,
    exits: r.exits,
    updated_at: new Date().toISOString(),
  }));

  console.log(`Aggregated ${rowsToUpsert.length} daily rows from ${total} movement logs.`);

  // Upsert in batches (daily_stats PK = date + gate_id).
  const upsertBatch = [];
  for (const row of rowsToUpsert) {
    upsertBatch.push(row);
    if (upsertBatch.length >= 500) {
      const { error } = await supabase.from('daily_stats').upsert(upsertBatch, { onConflict: 'date,gate_id' });
      if (error) {
        console.error('Upsert error:', error);
        process.exit(1);
      }
      upsertBatch.length = 0;
    }
  }
  if (upsertBatch.length > 0) {
    const { error } = await supabase.from('daily_stats').upsert(upsertBatch, { onConflict: 'date,gate_id' });
    if (error) {
      console.error('Upsert error:', error);
      process.exit(1);
    }
  }

  console.log('✅ daily_stats backfilled successfully.');
}

backfill().catch(console.error);