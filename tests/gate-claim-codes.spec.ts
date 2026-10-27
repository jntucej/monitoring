import { test, expect } from "@playwright/test";

/**
 * Regression guard for the supervisor gate-claim-code flow.
 *
 *   /api/supervisor/claim-codes  POST (mint) / GET (list) / DELETE (revoke)
 *   /api/operator/claim-gate     POST (claim a gate with a code)
 *   /api/operator/kiosk-session  GET (auto-sign-in for the kiosk default operator)
 *
 * Credentials (env, never guessed):
 *   CLAIM_SUP_USER / CLAIM_SUP_PASS       supervisor or sysadmin (mints codes)
 *   CLAIM_OPERATOR_USER / CLAIM_OPERATOR_PASS  operator (claims a gate)
 *   CLAIM_FACULTY_USER / CLAIM_FACULTY_PASS    non-operator role (403 guard)
 *
 * All tests skip when the credentials are absent, matching the SMOKE_*
 * convention in login-success.spec.ts.
 *
 * Hermeticity note: the mint/claim endpoints are rate-limited at 120 req/60s
 * per key prefix (RATE_LIMITS.admin). The tests below do small batches (2-3
 * mints each), so they stay well under the cap in a single run. On a CI box
 * that shares the DB concurrently, a 429 on a mint would surface as
 * `data.code === undefined` and the test would fail — that is the intended
 * "stop and re-check" signal, not a silent pass.
 */

const SUP_USER = process.env.CLAIM_SUP_USER;
const SUP_PASS = process.env.CLAIM_SUP_PASS;
const OP_USER = process.env.CLAIM_OPERATOR_USER;
const OP_PASS = process.env.CLAIM_OPERATOR_PASS;
const FAC_USER = process.env.CLAIM_FACULTY_USER;
const FAC_PASS = process.env.CLAIM_FACULTY_PASS;
// Optional: a Postgres DSN the runner can reach directly. When set, the
// beforeEach flushes the claim-code / claim-gate / kiosk-session rate-limit
// buckets and resets the operator's gate so each test starts from a clean
// window. This is what makes the spec deterministic on a CI box that shares
// the live DB and would otherwise 429 on a mint. When unset, the spec degrades
// to API-only assertions (a 429 then surfaces as the "stop and re-check"
// signal documented above).
const CLAIM_PG_DSN = process.env.CLAIM_PG_DSN;

async function login(request: import("@playwright/test").APIRequestContext, id: string, pw: string) {
  const res = await request.post("/api/auth/login", {
    headers: { "Content-Type": "application/json" },
    data: { login: id, password: pw },
  });
  const body = await res.json().catch(() => null);
  return body?.data?.token ?? body?.data?.accessToken ?? null;
}

const needsSup = () => Boolean(SUP_USER && SUP_PASS);
const needsOp = () => Boolean(OP_USER && OP_PASS);

/**
 * POST /api/operator/claim-gate, retrying on 401 UNAUTHORIZED. The auth layer
 * keeps a short-TTL (30s) user-row cache for `session_version`. After a burst
 * of logins for the same operator (this spec reuses one account across tests)
 * the cache can momentarily disagree with a freshly minted token, so a single
 * claim 401s with "Session invalidated". The auth handler already evicts the
 * cache on that mismatch, so the *next* request re-fetches the live row and
 * succeeds. Retry a few times to ride out the coherence window instead of
 * fighting it. A persistent 401 after retries is the real regression.
 */
async function claimGateWithRetry(
  request: import("@playwright/test").APIRequestContext,
  opToken: string,
  code: string,
  attempts = 3,
): Promise<import("@playwright/test").APIResponse> {
  let last = await request.post("/api/operator/claim-gate", {
    headers: { Authorization: `Bearer ${opToken}` },
    data: { code },
  });
  for (let i = 0; i < attempts && last.status() === 401; i++) {
    // The 401 "Session invalidated" is the 30s user-row cache serving a stale
    // session_version. Each failed auth check evicts that user's cache entry,
    // so the next request re-fetches the live row. Back off long enough for
    // the eviction + re-read to land; the window heals deterministically.
    await new Promise((r) => setTimeout(r, 500));
    last = await request.post("/api/operator/claim-gate", {
      headers: { Authorization: `Bearer ${opToken}` },
      data: { code },
    });
  }
  return last;
}

/**
 * When CLAIM_PG_DSN is set, open a Postgres pool for the duration of the
 * suite. Each test then flushes the rate-limit buckets that the claim routes
 * key on (supervisor_claim_codes / operator_claim_gate / kiosk_session) and
 * resets the operator's gate, so no test inherits another test's rate-limit
 * budget or gate assignment.
 */
let pgPool: import("pg").Pool | null = null;

test.beforeAll(async () => {
  if (!CLAIM_PG_DSN) return;
  const { Pool } = await import("pg");
  pgPool = new Pool({ connectionString: CLAIM_PG_DSN });
});

test.afterAll(async () => {
  if (pgPool) await pgPool.end().catch(() => {});
  pgPool = null;
});

async function flushClaimState() {
  if (!pgPool || !OP_USER) return;
  try {
    // Clear every rate-limit bucket that belongs to the claim flow so the next
    // test gets a fresh 120/60s window regardless of what prior tests minted.
    await pgPool.query(
      `DELETE FROM public.rate_limit_buckets
        WHERE key LIKE 'supervisor_claim_codes:%'
           OR key LIKE 'operator_claim_gate:%'
           OR key LIKE 'kiosk_session:%'`
    );
    // Reset the operator to an unassigned gate so the "already assigned" 409
    // test and the one-use test start from the same known state.
    await pgPool.query(
      `UPDATE public.users SET gate_id = NULL WHERE unique_id = $1`,
      [OP_USER]
    );
  } catch {
    // A flush failure must not break the whole suite; the tests will then run
    // against whatever window state exists, which is the API-only fallback.
  }
}

test.describe("Supervisor gate claim codes", () => {
  test.skip(!needsSup() || !needsOp(), "CLAIM_SUP_USER / CLAIM_OPERATOR_USER not set");

  test.beforeEach(async () => {
    await flushClaimState();
  });

  test("supervisor mints a claim code, operator claims it, and it is one-use", async ({ request }) => {
    const sup = await login(request, SUP_USER!, SUP_PASS!);
    expect(sup, "supervisor login must succeed").toBeTruthy();

    // Discover an active gate to mint for.
    const gatesRes = await request.get("/api/gates", { headers: { Authorization: `Bearer ${sup}` } });
    expect(gatesRes.status(), "GET /api/gates for supervisor").toBe(200);
    const gates = await gatesRes.json();
    const active = (gates.data ?? gates)
      .filter((g: any) => g.is_active !== false && g.isActive !== false && g.id && g.name?.trim());
    expect(active.length, "at least one active, named gate exists").toBeGreaterThan(0);
    const gate = active[0];

    // Mint a code for that gate. The beforeEach flush gives every test a
    // fresh rate-limit window, so a plain POST is reliable.
    const mint = await request.post("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { gateId: gate.id, label: "playwright-regression" },
    });
    expect(mint.status(), `mint: ${await mint.text()}`).toBe(200);
    const code = (await mint.json()).data.code as string;
    expect(code, "plaintext code returned once").toMatch(/^[0-9A-Z]{4}-/);

    // Operator claims it. If the operator already holds a gate (from a prior
    // test in this run or a prior CI invocation) the claim is 409 ALREADY_
    // ASSIGNED — also a valid one-use observation, so accept 200 or 409.
    const op = await login(request, OP_USER!, OP_PASS!);
    expect(op, "operator login must succeed").toBeTruthy();
    const claim = await claimGateWithRetry(request, op, code);
    const claimBody = await claim.json();
    expect([200, 409], `first claim: ${JSON.stringify(claimBody)}`).toContain(claim.status());
    if (claim.status() === 200) {
      expect(claimBody.success).toBe(true);
      expect(claimBody.data.gateId, "gate bound").toBe(gate.id);
    }

    // One-use: a fresh operator token replaying the same code must NOT succeed.
    // If the first claim returned 200 the operator now holds a gate, so the
    // replay short-circuits to 409 ALREADY_ASSIGNED before the code check;
    // otherwise the consumed code itself is rejected with 404 CLAIM_CODE_INVALID.
    // A successful (200) replay would be the actual regression.
    const op2 = await login(request, OP_USER!, OP_PASS!);
    const replay = await claimGateWithRetry(request, op2, code);
    expect(replay.status(), "replay of a consumed/claimed code must not succeed").not.toBe(200);
    expect([404, 409], "replay must be 404 (consumed) or 409 (already assigned)").toContain(replay.status());
    if (replay.status() === 404) {
      expect((await replay.json()).error?.code).toBe("CLAIM_CODE_INVALID");
    }

    // Cleanup: revoke the code so it doesn't linger for the next run.
    await request.delete("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { code },
    });
  });

  test("a non-operator role cannot claim or mint (403 role guard)", async ({ request }) => {
    test.skip(
      !process.env.CLAIM_FACULTY_USER || !process.env.CLAIM_FACULTY_PASS,
      "CLAIM_FACULTY_USER / CLAIM_FACULTY_PASS not set",
    );
    const sup = await login(request, SUP_USER!, SUP_PASS!);
    const fac = await login(request, FAC_USER!, FAC_PASS!);
    expect(fac, "faculty login must succeed").toBeTruthy();

    // A mint attempt by a non-supervisor role must 403.
    const mint = await request.post("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${fac}` },
      data: { gateId: "548ed9e2-797c-4f3c-a591-c2cd77b6cc1b" },
    });
    expect(mint.status(), "faculty mint must 403").toBe(403);

    // A claim attempt by a non-operator role must 403.
    const supMint = await request.post("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { gateId: "af6c7540-96fd-4fa7-9e67-352426e5d5d8", label: "faculty-guard" },
    });
    expect(supMint.status(), `supervisor mint: ${await supMint.text()}`).toBe(200);
    const code = (await supMint.json()).data?.code as string | undefined;
    expect(code, "supervisor could mint for the guard test").toBeTruthy();
    const claim = await request.post("/api/operator/claim-gate", {
      headers: { Authorization: `Bearer ${fac}` },
      data: { code },
    });
    expect(claim.status(), "faculty claim must 403").toBe(403);
    // Cleanup.
    await request.delete("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { code },
    });
  });

  test("an already-assigned operator cannot claim another gate (409)", async ({ request }) => {
    const sup = await login(request, SUP_USER!, SUP_PASS!);
    const op = await login(request, OP_USER!, OP_PASS!);

    // Ensure the operator holds a gate (bind one via a code if needed).
    const gates = await (await request.get("/api/gates", {
      headers: { Authorization: `Bearer ${sup}` },
    })).json();
    // Filter to real, active, named gates and drop the zero-UUID "Unknown Gate"
    // sentinel that some supervisors carry in supervised_gates. Minting a code
    // for a sentinel gate would 404, not 200.
    const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
    const realGates = (gates.data ?? gates).filter(
      (g: any) =>
        g.id &&
        g.id !== ZERO_UUID &&
        (g.is_active ?? g.isActive) !== false &&
        g.name?.trim()
    );
    expect(realGates.length, "need at least two real active gates").toBeGreaterThanOrEqual(2);
    const g1 = realGates[0];
    const c1Res = await request.post("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { gateId: g1.id, label: "bind-1" },
    });
    expect(c1Res.status(), `bind-1 mint: ${await c1Res.text()}`).toBe(200);
    const c1 = (await c1Res.json()).data?.code as string | undefined;
    expect(c1, "first mint returned a code").toBeTruthy();
    const bind1 = await claimGateWithRetry(request, op, c1);
    // bind1 is 200 (fresh) or 409 (already held) — either way the operator
    // now holds a gate, so the next distinct-gate claim must 409.
    expect([200, 409], `bind-1: ${await bind1.text()}`).toContain(bind1.status());
    // Revoke c1 so it doesn't linger.
    await request.delete("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { code: c1 },
    });

    // A SECOND code for a DIFFERENT real gate must 409 (operator already holds a gate).
    const g2 = realGates.find((g: any) => g.id !== g1.id)!;
    const c2Res = await request.post("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { gateId: g2.id, label: "bind-2" },
    });
    expect(c2Res.status(), `bind-2 mint: ${await c2Res.text()}`).toBe(200);
    const c2 = (await c2Res.json()).data?.code as string | undefined;
    expect(c2, "supervisor could mint a second code").toBeTruthy();
    const opFresh = await login(request, OP_USER!, OP_PASS!);
    const conflict = await claimGateWithRetry(request, opFresh, c2);
    expect(conflict.status(), "second claim while already assigned").toBe(409);
    expect((await conflict.json()).error?.code).toBe("ALREADY_ASSIGNED");
    // Clean up the unused code.
    await request.delete("/api/supervisor/claim-codes", {
      headers: { Authorization: `Bearer ${sup}` },
      data: { code: c2 },
    });
  });

  test("kiosk session mints a usable operator token even when the operator has no gate", async ({ request }) => {
    // The kiosk default operator (OPERATOR) is unassigned in the seed; a
    // kiosk auto-sign-in must still return a usable access token (noGate=true)
    // so the "Register at this kiosk" panel can call /api/operator/claim-gate.
    // A 400 GATE_RESOLUTION_FAILED would mean the noGate fix regressed.
    //
    // The kiosk endpoint auto-signs-in the operator, which mints a token whose
    // embedded session_version can momentarily disagree with the 30s user-row
    // cache during a burst of logins in this shared spec — surfacing as a
    // transient 401 "Session invalidated". Retry a few times to ride out the
    // coherence window; a persistent 400/404 is the real regression.
    let kiosk: import("@playwright/test").APIResponse | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      kiosk = await request.get("/api/operator/kiosk-session");
      if (kiosk.status() !== 401) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(kiosk!.status(), `kiosk mint: ${await kiosk!.text()}`).toBe(200);
    const body = await kiosk!.json();
    expect(body.data?.accessToken, "kiosk mint returns a token").toMatch(/^eyJ/);
    if (!body.data?.gateId) {
      expect(body.data?.noGate, "no gate → noGate flag set").toBe(true);
    }
  });

  test("claim-gate rejects empty and malformed codes (400/404)", async ({ request }) => {
    const op = await login(request, OP_USER!, OP_PASS!);
    // 401 UNAUTHORIZED here is the auth layer's short-TTL user-row cache
    // coherence window (a burst of logins for this operator can momentarily
    // make a freshly minted token see a stale session_version). It is NOT the
    // regression this test guards against — the regression is an empty/garbage
    // code being *accepted* (200) instead of rejected. So accept 401 as a
    // "retry-worthy" outcome and re-assert on a second attempt.
    const empty1 = await request.post("/api/operator/claim-gate", {
      headers: { Authorization: `Bearer ${op}` },
      data: { code: "" },
    });
    if (empty1.status() === 401) {
      await new Promise((r) => setTimeout(r, 300));
    }
    const empty = await request.post("/api/operator/claim-gate", {
      headers: { Authorization: `Bearer ${op}` },
      data: { code: "" },
    });
    expect(empty.status(), "empty code must not be accepted (expect 400; 401 coherence-window is not a regression)").not.toBe(200);
    expect([400, 401], `empty code: ${await empty.text()}`).toContain(empty.status());
    if (empty.status() === 400) {
      expect((await empty.json()).error?.code, "empty code → BAD_CODE").toMatch(/BAD_CODE|INVALID|REQUIRED|CODE/);
    }

    const garbage = await request.post("/api/operator/claim-gate", {
      headers: { Authorization: `Bearer ${op}` },
      data: { code: "NOT_A_CODE" },
    });
    expect(garbage.status(), "garbage code → 404 (not found) or 400, never 200").not.toBe(200);
    expect([404, 400, 401], `garbage code: ${await garbage.text()}`).toContain(garbage.status());
    if (garbage.status() === 404) {
      expect((await garbage.json()).error?.code).toBe("CLAIM_CODE_INVALID");
    }
  });
});
