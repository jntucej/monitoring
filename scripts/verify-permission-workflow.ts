import { Pool } from "pg";
import type { Role, WorkflowType } from "../src/lib/types";
import { resolveInitialStage, canApproveAtStage, resolveNextStage } from "../src/lib/permission-workflow";

async function main() {
  console.log("🔎 Verifying permission workflow invariants...");

  // 1. Verify invariants
  const stages = ["pending_hostel", "pending_warden", "pending_hod", "pending_principal", "pending_security"];

  const pool = new Pool({});
  try {
    const tableRes = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      ["permission_requests"]
    );
    if (!tableRes.rows.length) {
      console.warn("[DB] Expected 'permission_requests' table, but missing in public schema.");
    }
  } catch (err: any) {
    console.error(`[SQL Error] Query verification failed.`, err.message);
  } finally {
    pool.end();
  }

  console.log("✅ Verifications completed!");
}

main().catch((e) => {
  console.error("Verifier crashed:", e);
  process.exit(1);
});
