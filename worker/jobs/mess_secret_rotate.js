// worker/jobs/mess_secret_rotate.js
// Pre-generates daily TOTP secrets for active mess-eligible students.
import { createCipheriv, createHmac, randomBytes } from "crypto";
import { getWorkerDbPool } from "../db.js";

function encryptSecret(plainHex, serverSecret) {
  const key = createHmac("sha256", serverSecret).update("mess-totp-aes-key").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plainHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export async function runMessSecretRotate() {
  const serverSecret = process.env.MESS_TOKEN_SECRET || process.env.AUTH_JWT_SECRET;
  if (!serverSecret) return { skipped: true, reason: "no_secret" };

  const pool = getWorkerDbPool();
  const { rows: students } = await pool.query(
    `SELECT user_id FROM public.mess_eligibility WHERE active = true`,
  );
  if (students.length === 0) return { rotated: 0 };

  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  for (const s of students) {
    const enc = encryptSecret(randomBytes(20).toString("hex"), serverSecret);
    const res = await pool.query(
      `INSERT INTO public.mess_totp_secrets (student_id, secret_day, secret_enc)
       VALUES ($1::uuid, $2::date, $3)
       ON CONFLICT (student_id, secret_day) DO NOTHING`,
      [s.user_id, today, enc],
    );
    inserted += res.rowCount ?? 0;
  }
  return { rotated: inserted };
}
