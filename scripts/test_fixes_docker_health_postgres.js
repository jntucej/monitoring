const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Running Validation Tests for Postgres 17, 127.0.0.1 DB Host, and Health Checks...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

test('Fix 1: docker-compose files use Postgres 17 image (supabase/postgres:17.6.1.136)', () => {
  const files = [
    'docker-compose.yml',
    'docker-compose.base.yml'
  ];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      assert(content.includes('supabase/postgres:17') || content.includes('postgres:17'), `${f} must use Postgres 17`);
    }
  }
});

test('Fix 2: Database default host and URLs use 127.0.0.1 instead of localhost', () => {
  const pgTs = fs.readFileSync('src/lib/postgres.ts', 'utf8');
  assert(pgTs.includes('process.env.POSTGRES_HOST || "127.0.0.1"'), 'src/lib/postgres.ts must default POSTGRES_HOST to 127.0.0.1');

  const workerDb = fs.readFileSync('worker/db.js', 'utf8');
  assert(workerDb.includes("process.env.POSTGRES_HOST || '127.0.0.1'"), 'worker/db.js must default POSTGRES_HOST to 127.0.0.1');

  const testDb = fs.readFileSync('scripts/test-db.js', 'utf8');
  assert(testDb.includes('process.env.POSTGRES_HOST || "127.0.0.1"'), 'scripts/test-db.js must default POSTGRES_HOST to 127.0.0.1');
});

test('Fix 3: Health check uses 127.0.0.1 and start_period in docker compose', () => {
  const compose = fs.readFileSync('docker-compose.yml', 'utf8');
  assert(compose.includes('http://127.0.0.1:3000/api/health'), 'docker-compose.yml healthcheck must use 127.0.0.1');
  assert(compose.includes('start_period: 30s'), 'docker-compose.yml must specify start_period for web healthcheck');
});

test('Fix 4: config_college_info seed is present in schema.sql', () => {
  const schema = fs.readFileSync('database/schema.sql', 'utf8');
  assert(schema.includes('INSERT INTO public.config_college_info'), 'database/schema.sql must seed config_college_info');
  assert(schema.includes('JNTU College of Engineering Jagtial'), 'database/schema.sql must include college name in seed');
});

test('Fix 5: src/app/layout.tsx handles missing or empty college config safely', () => {
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert(layout.includes('if (data && !error && data.short_name)'), 'layout.tsx must check data.short_name safely');
});

test('Fix 6: src/lib/health.ts handles self-hosted database and queries via active client', () => {
  const health = fs.readFileSync('src/lib/health.ts', 'utf8');
  assert(health.includes('isSelfHosted'), 'src/lib/health.ts must recognize self-hosted database env');
  assert(!health.includes('supabase.from('), 'src/lib/health.ts must query through getClient() instead of raw supabase');
});

console.log(`\n🎉 Test Results: ${passed}/${total} passed!`);
process.exit(passed === total ? 0 : 1);
