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

async function seedBackendEvents() {
  console.log("🚀 Generating test backend events in Supabase for SysAdmin & Admin testing...\n");

  const { data: gates } = await supabase.from('gates').select('id, gate_code, name');
  const { data: users } = await supabase.from('users').select('id, name, role, unique_id');

  const sampleGate = gates?.[0] || null;
  const sampleSysAdmin = users?.find(u => u.role === 'sysadmin') || users?.[0] || null;
  const sampleStudent = users?.find(u => u.role === 'student') || users?.[0] || null;

  console.log("📦 Seeding audit logs...");
  const auditEntries = [
    {
      action: 'SYSTEM_CONFIG_CHANGED',
      user_id: sampleSysAdmin?.id || null,
      user_name: sampleSysAdmin?.name || 'System Admin',
      user_role: 'sysadmin',
      details: { setting: 'MFA_ENFORCEMENT', newValue: true, reason: 'Security policy compliance' },
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      action: 'ROLE_CHANGED',
      user_id: sampleSysAdmin?.id || null,
      user_name: sampleSysAdmin?.name || 'System Admin',
      user_role: 'sysadmin',
      details: { targetUser: sampleStudent?.name || 'John Doe', oldRole: 'student', newRole: 'faculty' },
      ip_address: '192.168.1.105',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      action: 'BACKUP_CREATED',
      user_id: sampleSysAdmin?.id || null,
      user_name: sampleSysAdmin?.name || 'System Admin',
      user_role: 'sysadmin',
      details: { backupId: 'bak-manual-20260827', sizeBytes: 4829104, tables: ['users', 'gates', 'audit_logs'] },
      ip_address: '127.0.0.1',
      user_agent: 'Node-Fetch/Internal',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    }
  ];

  const { error: auditErr, data: insertedAudits } = await supabase.from('audit_logs').insert(auditEntries).select();
  if (auditErr) console.error("  ❌ Error inserting audit logs:", auditErr.message);
  else console.log(`  ✅ Successfully inserted ${insertedAudits?.length || auditEntries.length} audit events.`);

  console.log("🚨 Seeding system alerts...");
  const alertEntries = [
    {
      severity: 'critical',
      title: 'Unregistered RFID Card Scan',
      message: `Multiple unregistered card attempts registered at ${sampleGate?.name || 'Main Campus Gate'}`,
      gate_id: sampleGate?.id || null,
      user_unique_id: 'CARD-UNKNOWN-9921',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      resolved: false,
    },
    {
      severity: 'high',
      title: 'Curfew Violation Detected',
      message: `Student ${sampleStudent?.name || 'Roll 22CS104'} detected entering past curfew cutoff (23:00)`,
      gate_id: sampleGate?.id || null,
      user_unique_id: sampleStudent?.unique_id || '22CS104',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      resolved: false,
    }
  ];

  const { error: alertErr, data: insertedAlerts } = await supabase.from('alerts').insert(alertEntries).select();
  if (alertErr) console.error("  ❌ Error inserting alerts:", alertErr.message);
  else console.log(`  ✅ Successfully inserted ${insertedAlerts?.length || alertEntries.length} system alerts.`);

  console.log("⚙️ Seeding scheduled job runs...");
  const { data: jobs } = await supabase.from('scheduled_jobs').select('id');
  if (jobs && jobs.length > 0) {
    const jobRuns = jobs.map(j => ({
      job_id: j.id,
      status: 'SUCCESS',
      start_time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      end_time: new Date(Date.now() - 1000 * 60 * 60 * 4 + 15000).toISOString(),
    }));
    const { error: runsErr, data: insertedRuns } = await supabase.from('job_runs').insert(jobRuns).select();
    if (runsErr) console.error("  ❌ Error inserting job runs:", runsErr.message);
    else console.log(`  ✅ Successfully inserted ${insertedRuns?.length || jobRuns.length} scheduled job runs.`);
  }

  console.log("\n🎉 All test backend events generated successfully in Supabase!");
}

seedBackendEvents().catch(console.error);
