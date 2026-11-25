/**
 * tests/unit/mess-v2-guards.test.ts — Hard guards for Mess v2:
 *   1. No write from src/lib/mess/** touches movement_logs / gate_events / gate_devices.
 *   2. Rotating QR: two calls to buildQr 31s apart produce different totp values.
 *   3. Tamper: mutate one byte of the counter field → verifyQr returns 'tampered'.
 *   4. Wrong session: verifyQr with mismatched sessionId → 'wrong_session'.
 *   5. Scanner auto-dismiss timers: green=1800ms, red=3000ms, amber=4000ms.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { buildQr, currentTotp, verifyQr } from "../../src/lib/mess/totp";
import { DISMISS_MS } from "../../src/components/mess/MessScanner";

const TEST_SECRET = "test-mess-v2-secret";
const DAILY_HEX = "0123456789abcdef0123456789abcdef01234567";

beforeAll(() => {
  process.env.MESS_TOKEN_SECRET = TEST_SECRET;
});

describe("Mess v2 hard guards (pure)", () => {
  it("1. No SQL in src/lib/mess/** writes to movement_logs, gate_events, or gate_devices", () => {
    const messDir = join(process.cwd(), "src/lib/mess");
    const files = readdirSync(messDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(join(messDir, f), "utf8");
      expect(src).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b[\s\S]{0,80}\b(movement_logs|gate_events|gate_devices)\b/i);
    }
  });

  it("2. Rotating QR: two calls 31s apart produce different totp values", () => {
    const sessionStart = 1_700_000_000_000;
    const t1 = currentTotp(DAILY_HEX, sessionStart, sessionStart + 5_000);
    const t2 = currentTotp(DAILY_HEX, sessionStart, sessionStart + 36_000);
    expect(t1).not.toBe(t2);
    const qr1 = buildQr("stu-1", "ses-1", 1, t1);
    const qr2 = buildQr("stu-1", "ses-1", 1, t2);
    expect(qr1).not.toBe(qr2);
  });

  it("3. Tamper: mutating one byte of counter field → reason='tampered'", () => {
    const sessionStart = 1_700_000_000_000;
    const now = sessionStart + 10_000;
    const totp = currentTotp(DAILY_HEX, sessionStart, now);
    const qr = buildQr("stu-1", "ses-1", 1, totp);
    const parts = qr.split("|");
    parts[3] = "2"; // mutate counter 1 → 2
    const res = verifyQr(parts.join("|"), "ses-1", sessionStart, DAILY_HEX, now);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("tampered");
  });

  it("4. Wrong session: mismatched sessionId → reason='wrong_session'", () => {
    const sessionStart = 1_700_000_000_000;
    const now = sessionStart + 10_000;
    const totp = currentTotp(DAILY_HEX, sessionStart, now);
    const qr = buildQr("stu-1", "ses-other", 1, totp);
    const res = verifyQr(qr, "ses-active", sessionStart, DAILY_HEX, now);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("wrong_session");
  });

  it("5. Scanner auto-dismiss timers match spec (1.8s / 3.0s / 4.0s)", () => {
    expect(DISMISS_MS.green).toBe(1800);
    expect(DISMISS_MS.red).toBe(3000);
    expect(DISMISS_MS.amber).toBe(4000);
  });
});
