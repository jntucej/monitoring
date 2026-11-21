// /api/cron/mess-reconcile/route.ts
// Phase 1 agent #2 — Mess ledger reconciliation (bounded to
// mess_incharge scope). Runs daily at 05:00 (cron) + on-demand.
// Reconciles yesterday's token issuance vs. consumption vs. enrolled
// boarders; writes a hash-chained audit record and an alert on anomaly.
// Can block the next service window via a high alert (reversible by
// mess_incharge / chief_warden).

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { createHash } from "crypto";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const day = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

    const issued = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM public.mess_tokens t
         JOIN public.mess_days d ON d.id = t.mess_day_id
        WHERE d.meal_date::date = $1 AND t.revoked_at IS NULL`, [day]);
    const consumed = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM public.mess_tokens t
         JOIN public.mess_days d ON d.id = t.mess_day_id
        WHERE d.meal_date::date = $1 AND t.used_at IS NOT NULL`, [day]);
    const boarders = await query<{ n: string }>(
      `SELECT COUNT(DISTINCT t.user_id)::text AS n FROM public.mess_tokens t
         JOIN public.mess_days d ON d.id = t.mess_day_id
        WHERE d.meal_date::date = $1`, [day]);

    const i = Number(issued.rows[0].n || 0);
    const c = Number(consumed.rows[0].n || 0);
    const b = Number(boarders.rows[0].n || 0);

    const anomalies: string[] = [];
    if (b > 0 && i > b) anomalies.push(`OVER_ISSUANCE: ${i} tokens for ${b} boarders`);
    if (i > 0 && Math.abs(c - i) > Math.max(5, Math.floor(i * 0.25))) {
      anomalies.push(`LEDGER_MISMATCH: ${i} issued vs ${c} consumed`);
    }

    // Hash-chained reconciliation record (tamper-evident lineage begins here).
    const prev = await query<{ this_hash: string }>(
      `SELECT this_hash FROM public.mess_reconciliation ORDER BY day DESC LIMIT 1`);
    const prevHash = prev.rows[0]?.this_hash ?? "GENESIS";
    const record = JSON.stringify({ day, issued: i, consumed: c, boarders: b, anomalies });
    const thisHash = createHash("sha256")
      .update(prevHash + record)
      .digest("hex");

    await query(
      `CREATE TABLE IF NOT EXISTS public.mess_reconciliation (
         day DATE PRIMARY KEY,
         issued INT NOT NULL,
         consumed INT NOT NULL,
         boarders INT NOT NULL,
         anomalies TEXT[],
         prev_hash TEXT NOT NULL,
         this_hash TEXT NOT NULL,
         recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
       );`,
    );
    await query(
      `INSERT INTO public.mess_reconciliation (day, issued, consumed, boarders, anomalies, prev_hash, this_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (day) DO NOTHING`,
      [day, i, c, b, anomalies.length ? anomalies : null, prevHash, thisHash]);

    await recordMutationAudit({
      actorId: "00000000-0000-0000-0000-000000000000",
      actorType: "agent",
      roleContext: "mess_incharge",
      entityScope: "MESS_MAIN",
      action: "mess_ledger_reconcile",
      resource: "mess_tokens",
      resourceId: day,
      afterState: { issued: i, consumed: c, boarders: b, anomalies, hash: thisHash },
    });

    if (anomalies.length > 0) {
      await query(
        `INSERT INTO public.alerts (severity, resource_type, title, detail, created_by)
         VALUES ('high', 'mess_ledger', $1, $2, NULL)`,
        [`Mess ledger anomaly ${day}: ${anomalies.join("; ")}`,
         `issued=${i} consumed=${c} boarders=${b}; service window may be blocked`],
      );
    }

    return Response.json({
      success: true,
      day,
      issued: i, consumed: c, boarders: b,
      anomalies,
      hash: thisHash,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
