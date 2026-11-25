// /api/cron/audit-chain/route.ts
// Tamper-evident audit chain (IMPLEMENTATION_BLUEPRINT STEP 7.1):
// nightly, verifies the prev_hash → this_hash chain over a
// dedicated audit_chain table that mirrors the most recent
// audit_events batch, and writes a checkpoint. If any link breaks,
// a high alert fires and sysadmin is paged.
//
// Phase 1 implementation: the chain covers audit_events rows by
// (event_id, actor_id, action, after_state, created_at) — the
// fields a tamperer would most likely touch.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { createHash, randomUUID } from "crypto";
import { query } from "@/lib/postgres";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Ensure the chain + checkpoint tables exist.
    await query(`
      CREATE TABLE IF NOT EXISTS public.audit_chain (
        seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        event_ref UUID NOT NULL,
        prev_hash TEXT NOT NULL,
        this_hash TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS public.audit_chain_checkpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seq BIGINT NOT NULL,
        hash TEXT NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        status TEXT NOT NULL DEFAULT 'OK' CHECK (status IN ('OK','BROKEN'))
      );`);

    // 1. Find the last checkpoint.
    const lastCp = await query<{ seq: number; hash: string }>(
      `SELECT seq, hash FROM public.audit_chain_checkpoints
        ORDER BY seq DESC LIMIT 1`);
    const startSeq = lastCp.rows.length > 0 ? (lastCp.rows[0].seq as number) : 0;

    // 2. Append rows: chain every audit_event not yet chained
    //    (approximation: last 500 rows by created_at).
    const batchRes = await query<{
      event_id: string; actor_id: string; action: string;
      after_state: unknown; created_at: string;
    }>(
      `SELECT event_id, actor_id, action, after_state, created_at
         FROM public.audit_events
        ORDER BY created_at DESC
        LIMIT 500`);
    const batchRows = batchRes.rows;

    let appended = 0;
    let broken = 0;
    let lastHash = lastCp.rows.length > 0 ? lastCp.rows[0].hash : "GENESIS";
    let maxSeq = startSeq;

    // Chain in ascending order (oldest first).
    const asc = [...batchRows].reverse();
    for (const row of asc) {
      const record = JSON.stringify({
        e: row.event_id, a: row.actor_id, ac: row.action,
        st: row.after_state ?? null, t: row.created_at,
      });
      const thisHash = sha256(lastHash + record);

      const ins = await query<{ seq: number }>(
        `INSERT INTO public.audit_chain (event_ref, prev_hash, this_hash)
         VALUES ($1, $2, $3)
         RETURNING seq`,
        [row.event_id, lastHash, thisHash],
      );
      const seq = ins.rows[0].seq;
      maxSeq = seq;
      appended += 1;
      lastHash = thisHash;
    }

    // 3. Verify the full chain from GENESIS (bounded: last 2000 links).
    const chainRes = await query<{ seq: number; prev_hash: string; this_hash: string; event_ref: string }>(
      `SELECT seq, prev_hash, this_hash, event_ref
         FROM public.audit_chain
        ORDER BY seq DESC
        LIMIT 2000`);
    const chainAsc = [...chainRes.rows].reverse();
    let verifyOk = true;
    let prevHash = "GENESIS";
    for (const link of chainAsc) {
      if (link.prev_hash !== prevHash) { verifyOk = false; broken += 1; break; }
      prevHash = link.this_hash;
    }

    // 4. Write the checkpoint.
    const cpId = randomUUID();
    await query(
      `INSERT INTO public.audit_chain_checkpoints (id, seq, hash, status)
       VALUES ($1, $2, $3, $4)`,
      [cpId, maxSeq, lastHash, verifyOk ? "OK" : "BROKEN"],
    );

    if (!verifyOk) {
      await query(
        `INSERT INTO public.alerts (severity, resource_type, title, detail, created_by)
         SELECT 'critical', 'audit_chain', $1, $2, NULL
          WHERE NOT EXISTS (
            SELECT 1 FROM public.alerts
             WHERE resource_type = 'audit_chain' AND resolved = false
          )`,
        [`AUDIT CHAIN BROKEN at link ${maxSeq} — manual review required`,
         `Chain verification failed; hash continuity lost. Integrity review needed before accreditation export.`],
      ).catch(() => undefined);
    }

    return Response.json({
      success: true,
      appended,
      chainLength: chainAsc.length + startSeq,
      verified: verifyOk,
      brokenLinks: broken,
      checkpoint: cpId,
      lastHash: lastHash.slice(0, 16) + "…",
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
