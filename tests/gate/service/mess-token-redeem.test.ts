/**
 * tests/gate/service/mess-token-redeem.test.ts — atomic single-use redeem
 * race test (spec hard guard: two parallel POSTs with the same QR → exactly
 * one 200, one 409).
 *
 * We mock the postgres `query` helper to simulate the row-level race:
 *   - the token lookup returns an active token,
 *   - the first redeem UPDATE returns rowCount=1 (wins),
 *   - the second returns rowCount=0 (lost the race → 'duplicate').
 * Both share the same verified QR.
 */
import { jest } from "@jest/globals";

// Mock the postgres module BEFORE importing the token module.
jest.mock("@/lib/postgres", () => {
  let redeemCallCount = 0;
  return {
    query: jest.fn(async (sql: string, _params: unknown[]) => {
      // issueToken's INSERT … RETURNING id → a token row.
      if (sql.includes("INSERT INTO public.mess_tokens")) {
        return { rows: [{ id: "tok-1" }] };
      }
      if (sql.includes("UPDATE public.mess_tokens")) {
        // First redeem wins (rowCount 1); the rest lose the race (0).
        redeemCallCount++;
        return { rows: [], rowCount: redeemCallCount === 1 ? 1 : 0 };
      }
      if (sql.includes("SELECT id") && sql.includes("mess_tokens")) {
        return { rows: [{ id: "tok-1", status_state: "active", expires_at: null }] };
      }
      if (sql.includes("INSERT INTO public.mess_scan_log")) {
        return { rows: [] };
      }
      return { rows: [] };
    }),
  };
});

// Import AFTER the mock is registered.
async function loadToken() {
  return await import("@/lib/mess/token");
}

describe("mess token atomic redeem", () => {
  beforeEach(() => {
    // Each test gets a fresh QR (issueToken needs the HMAC secret).
    process.env.MESS_TOKEN_SECRET = "unit-test-secret";
  });

  it("two concurrent redeems of the same QR → exactly one 'ok', one 'duplicate'", async () => {
    const { issueToken, redeemToken } = await loadToken();
    const t = await issueToken({
      studentId: "stu-9",
      messDayId: "day-9",
      mealType: "lunch",
      mealDate: "2027-01-30",
    });

    // Fire both "concurrently" (sequentially, but the mock models the race).
    const r1 = await redeemToken(t.qr, "dev-1", "redeemer-1");
    const r2 = await redeemToken(t.qr, "dev-2", "redeemer-2");

    const results = [r1.result, r2.result].sort();
    expect(results).toEqual(["duplicate", "ok"]);
  });
});
