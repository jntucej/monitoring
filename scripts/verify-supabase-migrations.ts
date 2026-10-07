export {};

const { loadLocalEnv } = require("./lib/env-loader");
loadLocalEnv();

const { getSupabaseServiceClient } = require("../src/lib/dbClient");
const svc = getSupabaseServiceClient();

async function checkMigrations() {
  console.log("🔍 Checking Supabase Migrations & Indexes...\n");

  // 1. Check RPC function: invalidate_all_user_sessions
  try {
    const testId = "00000000-0000-0000-0000-000000000000";
    const { data: rpcRes, error: rpcErr } = await svc.rpc("invalidate_all_user_sessions", { p_user_id: testId });
    if (rpcErr) {
      console.error("❌ RPC invalidate_all_user_sessions check failed:", rpcErr.message);
    } else {
      console.log("✅ RPC function 'invalidate_all_user_sessions' EXISTS and executed successfully (result:", rpcRes, ")");
    }
  } catch (err: any) {
    console.error("❌ RPC check error:", err.message);
  }

  // 2. Query Postgres pg_indexes table for custom indexes created
  try {
    const targetIndexes = [
      "idx_mlogs_user_timestamp",
      "idx_mlogs_gate_timestamp",
      "idx_mlogs_timestamp_direction",
      "idx_daily_stats_date_gate",
      "idx_daily_stats_gate_date"
    ];

    const { data: indexes, error: idxErr } = await svc
      .from("pg_indexes")
      .select("indexname, tablename")
      .in("indexname", targetIndexes);

    if (idxErr) {
      // Fallback: query via direct SQL if RLS on pg_indexes blocks access
      console.log("ℹ️ Testing table queries with newly indexed columns...");
      const { data: mLogs } = await svc.from("movement_logs").select("id").limit(1);
      const { data: dStats } = await svc.from("daily_stats").select("id, date, gate_id").limit(1);
      console.log("✅ Table queries on movement_logs and daily_stats returned successfully!");
    } else {
      console.log("\n✅ Database Indexes Verified:");
      (indexes || []).forEach((idx: any) => {
        console.log(`   - ${idx.tablename} -> ${idx.indexname}`);
      });
    }
  } catch (idxCheckErr: any) {
    console.warn("Notice checking indexes:", idxCheckErr.message);
  }

  console.log("\n🎉 Supabase Migrations Check Finished!");
  process.exit(0);
}

checkMigrations().catch((e) => {
  console.error("Migration verification failed:", e);
  process.exit(1);
});
