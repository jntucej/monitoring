// /api/cron/exam-eligibility-manifest/route.ts
// Phase 1 agent #4 — Exam eligibility precomputation (bounded to OIE /
// exam_branch scope). Runs 24h before each exam (cron + on-demand).
// Builds a signed eligibility manifest from attendance %, fee dues,
// and academic status; the manifest is the offline artifact the exam-day
// gate checks instead of the live DB.
//
// Signature: Ed25519 (Phase 2 promotes to the offline verifier). The
// manifest payload + signature are stored in exam_eligibility_manifests.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { sign as cryptoSign, verify, generateKeyPairSync } from "crypto";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

// Phase 1 uses the exam branch's Ed25519 key pair. In production the
// private key lives in a KMS / env var; the public key is distributed to
// gate verifiers. For this build we generate a keypair on first run and
// store it in exam_eligibility_keys (Phase 2 migrates to KMS).
async function getExamKeyPair() {
  await query(`CREATE TABLE IF NOT EXISTS public.exam_eligibility_keys (
    id SERIAL PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`);
  const { rows } = await query<{ public_key: string }>(
    `SELECT public_key FROM public.exam_eligibility_keys ORDER BY id DESC LIMIT 1`);
  if (rows.length > 0) return { publicKey: rows[0].public_key };
  // Generate a fresh Ed25519 keypair (private side kept in the DB for
  // Phase 1; Phase 2 moves it to a KMS and the gate only gets the public key).
  const { publicKey, privateKey } = generateEd25519();
  await query(
    `INSERT INTO public.exam_eligibility_keys (public_key, private_key) VALUES ($1, $2)`,
    [publicKey, privateKey],
  );
  return { publicKey };
}

function generateEd25519(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Load the eligibility rules (controller-configured).
    const rules = await query<{ min_attendance_pct: string; require_fees_paid: string; require_academic_active: string }>(
      `SELECT min_attendance_pct, require_fees_paid, require_academic_active
         FROM public.config_exam_eligibility_rules WHERE id = 1`);
    const r = rules.rows[0] ?? { min_attendance_pct: "75", require_fees_paid: "t", require_academic_active: "t" };
    const minAtt = Number(r.min_attendance_pct);
    const needFees = r.require_fees_paid === "t";
    const needActive = r.require_academic_active === "t";

    // All active students with their eligibility inputs.
    const { rows: students } = await query<{
      id: string; roll: string | null;
      attendance_pct: number | null;
      fee_due: number;
      academic_status: string | null;
    }>(
      `SELECT u.id, u.unique_id AS roll,
              (SELECT round(100.0 * COUNT(*) FILTER (WHERE ar.status='PRESENT') /
                            NULLIF(COUNT(*),0))
                 FROM public.attendance_records ar
                WHERE ar.person_id = u.id
                  AND ar.date > now() - INTERVAL '6 months') AS attendance_pct,
              COALESCE((SELECT SUM(f.amount - f.paid) FROM public.fee_items f
                         WHERE f.student_id = u.id AND f.status NOT IN ('PAID','WAIVED')), 0)::float AS fee_due,
              sd.academic_status
         FROM public.users u
         LEFT JOIN public.student_details sd ON sd.user_id = u.id
        WHERE u.role = 'student' AND u.status = 'ACTIVE'`,
    );

    const manifest = students.map((s) => ({
      roll: s.roll ?? s.id,
      eligible:
        (s.attendance_pct === null || s.attendance_pct >= minAtt) &&
        (!needFees || s.fee_due <= 0) &&
        (!needActive || s.academic_status === null || s.academic_status === "ACTIVE"),
    }));

    // Sign the manifest (Ed25519, via crypto.sign(null, ...) which selects the
    // algorithm from the key type).
    const payload = JSON.stringify({ manifest, rules: r, generatedAt: new Date().toISOString() });
    const { publicKey } = await getExamKeyPair();
    const privRes = await query<{ private_key: string }>(
      `SELECT private_key FROM public.exam_eligibility_keys WHERE private_key IS NOT NULL ORDER BY id DESC LIMIT 1`);
    const sigKey = Buffer.from(privRes.rows[0]?.private_key ?? publicKey, "base64");
    const signature = cryptoSign(null, Buffer.from(payload), sigKey).toString("base64");

    await query(
      `CREATE TABLE IF NOT EXISTS public.exam_eligibility_manifests (
         exam_id TEXT PRIMARY KEY,
         payload JSONB NOT NULL,
         signature TEXT NOT NULL,
         public_key TEXT NOT NULL,
         generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
       );`);
    await query(
      `INSERT INTO public.exam_eligibility_manifests (exam_id, payload, signature, public_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (exam_id) DO UPDATE
         SET payload = EXCLUDED.payload, signature = EXCLUDED.signature,
             public_key = EXCLUDED.public_key, generated_at = now()`,
      ["CURRENT", payload, signature, publicKey],
    );

    await recordMutationAudit({
      actorId: "00000000-0000-0000-0000-000000000000",
      actorType: "agent",
      roleContext: "oie",
      action: "exam_eligibility_manifest",
      resource: "exam_eligibility_manifests",
      afterState: { candidates: manifest.length, eligible: manifest.filter((m) => m.eligible).length },
    });

    return Response.json({
      success: true,
      candidates: manifest.length,
      eligible: manifest.filter((m) => m.eligible).length,
      rules: { minAttendancePct: minAtt, requireFeesPaid: needFees, requireAcademicActive: needActive },
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
