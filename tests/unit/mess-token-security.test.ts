/**
 * tests/unit/mess-token-security.test.ts — anti-tamper guarantees for the
 * HMAC mess-token flow (src/lib/mess/token.ts).
 *
 * These are the spec's hard guards:
 *   - verifyToken rejects a token after ONE byte of the tuple is mutated.
 *   - verifyToken rejects a truncated variant.
 *   - verifyToken rejects a wrong-nonce / forged-hash replay.
 *
 * verifyToken is pure crypto (no DB), so it runs in the fast vitest suite.
 * The DB-backed issueToken/redeemToken race is covered by the jest node test
 * (tests/gate/service/mess-token-redeem.test.ts) with a mocked query.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "crypto";
import { verifyToken } from "../../src/lib/mess/token";

const TEST_SECRET = "test-mess-secret-do-not-use-in-prod";

/** Build a valid signed QR for a tuple, using the same algorithm as issueToken. */
function signedQr(
  studentId: string,
  messDayId: string,
  mealType: string,
  mealDate: string,
  nonce: string
): string {
  const tuple = `${studentId}|${messDayId}|${mealType}|${mealDate}|${nonce}`;
  const hash = createHmac("sha256", TEST_SECRET).update(tuple).digest("hex");
  return `${tuple}|${hash}`;
}

beforeAll(() => {
  process.env.MESS_TOKEN_SECRET = TEST_SECRET;
});

describe("mess token HMAC (verifyToken)", () => {
  it("verifies a correctly-signed QR (round-trip)", () => {
    const qr = signedQr("stu-1", "day-1", "lunch", "2027-01-30", "nonce-1");
    const v = verifyToken(qr);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.studentId).toBe("stu-1");
      expect(v.messDayId).toBe("day-1");
      expect(v.mealType).toBe("lunch");
      expect(v.nonce).toBe("nonce-1");
    }
  });

  it("rejects a token after one byte of the tuple is mutated", () => {
    const qr = signedQr("stu-2", "day-2", "dinner", "2027-01-30", "nonce-2");
    const parts = qr.split("|");
    parts[2] = parts[2].replace("d", "X"); // dinner → Xinner
    const v = verifyToken(parts.join("|"));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("hmac_fail");
  });

  it("rejects a truncated variant", () => {
    const v = verifyToken("stu-3|day-3|lunch|2027-01-30|nonce-3");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("malformed");
  });

  it("rejects a forged hash (wrong-nonce replay the server didn't sign)", () => {
    const v = verifyToken(
      "stu-4|day-4|lunch|2027-01-30|deadbeef|0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("hmac_fail");
  });

  it("rejects a wrong part count", () => {
    expect(verifyToken("only|three|parts").ok).toBe(false);
    expect(verifyToken("").ok).toBe(false);
  });
});
