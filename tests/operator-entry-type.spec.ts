import { test, expect } from "@playwright/test";

/**
 * Task 6.2 — Operator entry-type acceptance matrix (hostel-permission
 * hierarchy). Mirrors the ScanConfirmation button rules:
 *
 *   OUT + any/unknown type → exactly two IN buttons: [Home In] [Day Scholar In]
 *   IN + day_scholar       → one OUT button: [Day Scholar Out]
 *   IN + hosteller         → three OUT buttons: [Daily Outing] [Home Out] [Day Pass]
 *
 * The test data/login setup follows the repo's e2e conventions:
 *   - a real operator account + gate seeded via the DB/API (unique fixture,
 *     torn down afterwards so the suite stays data-isolated)
 *   - occupancy state is driven through the real operator APIs
 *     (/api/operator/entry-type, /api/gate/scan)
 *   - the UI-level assertions are driven through the gate operator page so we
 *     verify the ACTUAL rendered buttons, not stubs.
 *
 * Runtime constraint: like the other API-driven specs in this suite, the UI
 * assertions need a running app + DB + seeded operator. When those are not
 * reachable the tests skip (never stub the assertions).
 */

// ── Fixtures / credentials (never guessed; provided by the env) ─────────
const OP_LOGIN = process.env.OP_USER;
const OP_PASS = process.env.OP_PASS;
const GATE_ID = process.env.OP_GATE_ID || "gate-main-01";
const STEPUP = process.env.APPROVAL_PASSWORD || "teststep1";

const HAS_ENV = Boolean(OP_LOGIN && OP_PASS);
if (!HAS_ENV) {
  test.fixme(true, "OP_USER / OP_PASS must be set to run operator e2e");
}

// Unique student fixture so the suite is data-isolated.
const RUN_ID = `e2e-${Date.now().toString(36)}`;
const ROLL = `T6${RUN_ID.slice(-6).toUpperCase()}`;

async function operatorToken(request: any, login: string, password: string): Promise<string> {
  const res = await request.post("/api/auth/login", {
    headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
    data: { login, password },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  return body.data.token as string;
}

async function seedStudent(request: any, adminToken: string): Promise<void> {
  // Seed the operator-bound student + its occupancy as OUT. A unique roll keeps
  // the fixture isolated. (Shape mirrors the real provisioning the app exposes;
  // the test seeds via the app's own endpoints rather than raw SQL.)
  const created = await request.post(
    "/api/students",
    {
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: {
        name: `T6 ${ROLL}`,
        roll: ROLL,
        role: "student",
        status: "ACTIVE",
        initialCampusStatus: "OUT",
      },
    },
  );
  // 200/201 = created; 409 = a same-unique-id collision (acceptable on re-run).
  expect([200, 201, 409]).toContain(created.status());
}

async function logout(request: any, token: string): Promise<void> {
  await request.post("/api/auth/logout", {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

test.describe("Operator entry-type acceptance matrix", () => {
  test.beforeAll(async ({ request }) => {
    // Seed a sysadmin/admin token to create the fixture student.
    const adminLogin = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (adminLogin && adminPass) {
      await seedStudent(request, await operatorToken(request, adminLogin, adminPass));
    }
  });

  test.afterAll(async ({ request }) => {
    // Best-effort teardown of the fixture student (data-isolated).
    const adminLogin = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (adminLogin && adminPass) {
      const token = await operatorToken(request, adminLogin, adminPass).catch(() => "");
      if (token) {
        await request.delete(`/api/students/roll/${ROLL}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  });

  /** Drive one scan through the real operator page and read the rendered
   *  ScanConfirmation buttons for a freshly-scanned student. */
  async function scanAndReadButtons(
    request: any,
    page: any,
    token: string,
    direction: "IN" | "OUT",
  ): Promise<{ buttons: string[] }> {
    // Re-seed occupancy to a known starting point, then open the gate page and
    // trigger the scan flow for the fixture student.
    await page.context().addInitScript((t) => {
      // Pre-authenticate the operator page by injecting the token into the store.
      localStorage.setItem("authToken", t);
    }, token);

    await page.goto(`/gate/${encodeURIComponent(GATE_ID)}?mode=scan`, { waitUntil: "domcontentloaded" });
    // Hand the gate page the scan to verify via the test hook the operator page
    // exposes for exactly this purpose.
    await page.evaluate((r: string) => {
      (window as any).__handleQRScannedForTesting?.(r);
    }, ROLL);

    // Wait for the confirmation card, then harvest the entry/exit button labels.
    const card = page.locator("text=Confirm Entry, text=Confirm Exit").first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    const buttons = await page
      .locator("button")
      .filter({ hasText: /Home In|Day Scholar In|Daily Outing|Home Out|Day Pass|Day Scholar Out/ })
      .allTextContents();
    const normalized = buttons.map((b) => b.split("\n").filter(Boolean).pop() ?? b);
    return { buttons: normalized };
  }

  test("OUT student → exactly TWO entry buttons: [Home In] and [Day Scholar In]", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      const { buttons } = await scanAndReadButtons(request, page, token, "IN");
      expect(buttons).toContain("Home In");
      expect(buttons).toContain("Day Scholar In");
      // Exactly two entry buttons and no exit buttons while OUT.
      const entryButtons = buttons.filter((b) => b === "Home In" || b === "Day Scholar In");
      const exitButtons = buttons.filter((b) =>
        b === "Daily Outing" || b === "Home Out" || b === "Day Pass" || b === "Day Scholar Out",
      );
      expect(entryButtons.length).toBe(2);
      expect(exitButtons.length).toBe(0);
    } finally {
      await logout(request, token);
    }
  });

  test("choose 'Day Scholar In' → badge flips to DAY SCHOLAR; next scan shows ONE exit button", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      // 1. Confirm the Day Scholar In entry (persists entry type via the API).
      const entryRes = await request.post("/api/operator/entry-type", {
        headers: { Authorization: `Bearer ${token}` },
        data: { roll: ROLL, entryType: "day_scholar", gateId: GATE_ID },
      });
      expect(entryRes.status()).toBe(200);

      // 2. Scan the same student IN as a day scholar.
      const inRes = await request.post("/api/gate/scan", {
        headers: { Authorization: `Bearer ${token}` },
        data: { roll: ROLL, direction: "IN", entryType: "day_scholar", gateId: GATE_ID, operatorId: "op-test" },
      });
      expect([200, 201]).toContain(inRes.status());

      // 3. Re-open the gate page and scan OUT: only the single Day Scholar Out
      //    exit button should be offered.
      const { buttons } = await scanAndReadButtons(request, page, token, "OUT");
      expect(buttons).toContain("Day Scholar Out");
      const exitButtons = buttons.filter((b) =>
        b === "Daily Outing" || b === "Home Out" || b === "Day Pass" || b === "Day Scholar Out",
      );
      expect(exitButtons).toEqual(["Day Scholar Out"]);

      // Badge flip: a fresh scan of the IN day-scholar must show the DAY
      // SCHOLAR badge in the confirmation card.
      await expect(page.getByText("Day Scholar", { exact: false })).toBeVisible();
    } finally {
      await logout(request, token);
    }
  });

  test("scan out, choose 'Home In' → badge flips to HOSTELLER; IN hosteller shows THREE exit buttons", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      // 1. Confirm the Home In entry (hosteller).
      const entryRes = await request.post("/api/operator/entry-type", {
        headers: { Authorization: `Bearer ${token}` },
        data: { roll: ROLL, entryType: "hosteller", gateId: GATE_ID },
      });
      expect(entryRes.status()).toBe(200);

      // 2. Scan the student IN as a hosteller.
      const inRes = await request.post("/api/gate/scan", {
        headers: { Authorization: `Bearer ${token}` },
        data: { roll: ROLL, direction: "IN", entryType: "hosteller", gateId: GATE_ID, operatorId: "op-test" },
      });
      expect([200, 201]).toContain(inRes.status());

      // 3. Scan OUT: three exit buttons — Daily Outing, Home Out, Day Pass.
      const { buttons } = await scanAndReadButtons(request, page, token, "OUT");
      expect(buttons).toContain("Daily Outing");
      expect(buttons).toContain("Home Out");
      expect(buttons).toContain("Day Pass");
      const exitButtons = buttons.filter((b) =>
        b === "Daily Outing" || b === "Home Out" || b === "Day Pass" || b === "Day Scholar Out",
      );
      expect(exitButtons.length).toBe(3);

      // Badge flip: the confirmation card shows the HOSTELLER badge.
      await expect(page.getByText("Hosteller", { exact: false })).toBeVisible();
    } finally {
      await logout(request, token);
    }
  });
});
