import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { query } from "@/lib/postgres";

function getQrSecret(): string {
  const s = process.env.MESS_TOKEN_SECRET || process.env.AUTH_JWT_SECRET;
  if (!s) throw new Error("AUTH_JWT_SECRET / MESS_TOKEN_SECRET not configured");
  return s;
}

export async function getOrCreateSalt(day: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  await query(
    `INSERT INTO public.student_qr_salts (salt_day, salt)
     VALUES ($1::date, $2)
     ON CONFLICT (salt_day) DO NOTHING`,
    [day, salt],
  );
  const { rows } = await query<{ salt: string }>(
    `SELECT salt FROM public.student_qr_salts WHERE salt_day = $1::date LIMIT 1`,
    [day],
  );
  return rows[0].salt;
}

export function signIdentityRoll(roll: string, salt: string): string {
  return createHmac("sha256", getQrSecret())
    .update(`${roll}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

export async function buildIdentityQr(studentId: string): Promise<{
  qr: string;
  roll: string;
  salt_day: string;
} | null> {
  const { rows } = await query<{ unique_id: string }>(
    `SELECT unique_id FROM public.users WHERE id = $1::uuid LIMIT 1`,
    [studentId],
  );
  const roll = rows[0]?.unique_id;
  if (!roll) return null;

  const today = new Date().toISOString().slice(0, 10);
  const salt = await getOrCreateSalt(today);
  const sig = signIdentityRoll(roll, salt);
  return {
    qr: `ID|${roll}|${sig}`,
    roll,
    salt_day: today,
  };
}

export async function verifyIdentityQr(
  qr: string,
  nowMs: number = Date.now(),
): Promise<
  | { ok: true; studentId: string; roll: string }
  | { ok: false; reason: "malformed" | "not_found" | "invalid" | "expired_salt" }
> {
  const parts = qr.trim().split("|");
  if (parts.length !== 3 || parts[0] !== "ID") {
    return { ok: false, reason: "malformed" };
  }
  const [, roll, givenSig] = parts;
  if (!roll || !givenSig) return { ok: false, reason: "malformed" };

  const { rows: uRows } = await query<{ id: string }>(
    `SELECT id FROM public.users WHERE unique_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [roll],
  );
  if (!uRows[0]) return { ok: false, reason: "not_found" };

  const today = new Date(nowMs).toISOString().slice(0, 10);
  const yesterday = new Date(nowMs - 86_400_000).toISOString().slice(0, 10);

  const { rows: salts } = await query<{ salt_day: string; salt: string }>(
    `SELECT salt_day::text, salt FROM public.student_qr_salts
      WHERE salt_day IN ($1::date, $2::date)
      ORDER BY salt_day DESC`,
    [today, yesterday],
  );

  for (const s of salts) {
    const expected = signIdentityRoll(roll, s.salt);
    const a = Buffer.from(givenSig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { ok: true, studentId: uRows[0].id, roll };
    }
  }

  return { ok: false, reason: salts.length === 0 ? "expired_salt" : "invalid" };
}
