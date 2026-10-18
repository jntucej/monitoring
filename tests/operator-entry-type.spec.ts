import { test, expect } from "@playwright/test";

/**
 * Task 6.2 — Operator entry-type acceptance matrix (hostel-permission
 * hierarchy). Mirrors the ScanConfirmation button rules driven by
 * `resolveEntryOptions(lastOutReason, currentType)`:
 *
 *   OUT + daily_outing / day_pass  → exactly ONE entry button: [Return to Hostel]
 *   OUT + home_out / null          → exactly TWO entry buttons: [Home In] [Outing In]
 *   OUT + day_scholar_out          → exactly ONE entry button: [Outing In]
 *   IN + day_scholar               → exactly TWO exit buttons: [Day Scholar Out] [Home Out]
 *   IN + hosteller                 → exactly THREE exit buttons: [Daily Outing] [Day Pass] [Home Out]
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

const HAS_ENV = Boolean(OP_LOGIN && OP_PASS);
if (!HAS_ENV) {
  test.fixme(true, "OP_USER / OP_PASS must be set to run operator e2e");
}

// Unique student fixture so the suite is data-isolated.
const RUN_ID = `e2e-${Date.now().toString(36)}`;
const ROLL = `T6${RUN_ID.slice(-6).toUpperCase()}`;

const ENTRY_BUTTONS = ["Return to Hostel", "Home In", "Outing In"];
const EXIT_BUTTONS = ["Daily Outing", "Day Pass", "Home Out", "Day Scholar Out"];
const ALL_ACTION_BUTTONS = [...ENTRY_BUTTONS, ...EXIT_BUTTONS];

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

async function seedStudent(request: any, adminToken: string, status: "IN" | "OUT"): Promise<void> {
  // Seed the operator-bound student + its occupancy. A unique roll keeps the
  // fixture isolated. The test seeds via the app's own endpoints rather than
  // raw SQL.
  const created = await request.post(
    "/api/students",
    {
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      data: {
        name: `T6 ${ROLL}`,
        roll: ROLL,
        role: "student",
        status: "ACTIVE",
        initialCampusStatus: status,
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

/** Drive a scan through the real operator page and read the rendered
 *  ScanConfirmation action buttons + whether a button is disabled. */
async function scanAndReadButtons(
  request: any,
  page: any,
  token: string,
): Promise<{ entry: string[]; exit: string[]; disabled: Set<string> }> {
  await page.context().addInitScript((t) => {
    localStorage.setItem("authToken", t);
  }, token);

  await page.goto(`/gate/${encodeURIComponent(GATE_ID)}?mode=scan`, { waitUntil: "domcontentloaded" });
  // Hand the gate page the scan to verify via the test hook the operator page
  // exposes for exactly this purpose.
  await page.evaluate((r: string) => {
    (window as any).__handleQRScannedForTesting?.(r);
  }, ROLL);

  // Wait for the confirmation card, then harvest the action button labels and
  // their disabled state.
  const card = page.locator("text=Confirm Entry, text=Confirm Exit").first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  const entryLabels: string[] = [];
  const exitLabels: string[] = [];
  const disabled = new Set<string>();
  for (const label of ALL_ACTION_BUTTONS) {
    const btn = page.getByRole("button", { name: new RegExp(`^\\s*${label}\\s*$`), exact: false });
    const count = await btn.count();
    if (count === 0) continue;
    // Pick the first matching button (entry vs exit buttons are uniquely
    // labeled so there is only ever one match per label).
    const first = btn.first();
    const text = (await first.innerText()).split("\n").filter(Boolean).pop() ?? label;
    const isEntry = ENTRY_BUTTONS.includes(label);
    if (isEntry) entryLabels.push(text);
    else exitLabels.push(text);
    if (await first.isDisabled()) disabled.add(label);
  }
  return { entry: entryLabels, exit: exitLabels, disabled };
}

/** Confirm a specific entry button via the real /api/operator/entry-type route. */
async function confirmEntryType(
  request: any,
  token: string,
  entryType: "hosteller" | "day_scholar",
  buttonId?: "return_to_hostel" | "home_in" | "day_scholar_in",
): Promise<void> {
  const res = await request.post("/api/operator/entry-type", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      roll: ROLL,
      entryType,
      gateId: GATE_ID,
      ...(buttonId ? { buttonId } : {}),
    },
  });
  expect(res.status()).toBe(200);
}

/** Record an IN scan as a given entry type via the real /api/gate/scan route. */
async function scanIn(request: any, token: string, entryType: "hosteller" | "day_scholar"): Promise<void> {
  const res = await request.post("/api/gate/scan", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      roll: ROLL,
      direction: "IN",
      entryType,
      gateId: GATE_ID,
      operatorId: "op-test",
      clientEventId: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
  });
  expect([200, 201]).toContain(res.status());
}

/** Record an OUT scan with a given reason via the real /api/gate/scan route. */
async function scanOut(request: any, token: string, reason: string): Promise<void> {
  const res = await request.post("/api/gate/scan", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      roll: ROLL,
      direction: "OUT",
      reason,
      gateId: GATE_ID,
      operatorId: "op-test",
      clientEventId: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
  });
  expect([200, 201]).toContain(res.status());
}

/**
 * Seed an APPROVED gate pass for the fixture student so a home_out / day_pass
 * OUT scan (which requires an approved pass) can be recorded. Two API calls:
 * create the pass, then approve it. Best-effort — the UI assertions that
 * follow only need the OUT occupancy state to be correct.
 */
async function seedApprovedPass(request: any, adminToken: string, opToken: string, reason: string): Promise<void> {
  const created = await request.post("/api/passes", {
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    data: {
      roll: ROLL,
      reason,
      from: new Date().toISOString(),
      to: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      description: `T6 fixture approved pass ${reason}`,
    },
  });
  if (![200, 201].includes(created.status())) {
    // A collision / 4xx is tolerable for setup; the OUT scan below may still
    // proceed if a pass already exists.
    return;
  }
  const body = await created.json().catch(() => ({}));
  const passId = body.data?.id;
  if (!passId) return;
  const approved = await request.post(`/api/passes/${encodeURIComponent(passId)}/action`, {
    headers: { Authorization: `Bearer ${opToken}`, "Content-Type": "application/json" },
    data: { action: "approve", comment: "fixture approval" },
  });
  expect([200, 201]).toContain(approved.status());
}

test.describe("Operator entry-type acceptance matrix", () => {
  test.beforeAll(async ({ request }) => {
    const adminLogin = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (adminLogin && adminPass) {
      await seedStudent(request, await operatorToken(request, adminLogin, adminPass), "OUT");
    }
  });

  test.afterAll(async ({ request }) => {
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

  test("OUT student, last reason daily_outing → exactly ONE entry button: [Return to Hostel]", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      // Bring the student OUT with a daily_outing reason so the most recent OUT
      // scan's reason is daily_outing.
      await scanOut(request, token, "daily_outing");
      const { entry, exit, disabled } = await scanAndReadButtons(request, page, token);
      expect(entry).toEqual(["Return to Hostel"]);
      expect(exit).toEqual([]);
      // No type choice: a single pinned button.
      expect(disabled.has("Return to Hostel")).toBe(false);
    } finally {
      await logout(request, token);
    }
  });

  test("OUT student, last reason home_out → exactly TWO entry buttons: [Home In] + [Outing In]", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    const adminToken = process.env.ADMIN_USER && process.env.ADMIN_PASS
      ? await operatorToken(request, process.env.ADMIN_USER, process.env.ADMIN_PASS)
      : "";
    try {
      // A home_out OUT scan requires an approved gate pass; seed one first so
      // the fixture student can be driven into the OUT (home_out) state.
      if (adminToken) {
        await seedApprovedPass(request, adminToken, token, "home_out");
      }
      // Bring the student OUT with a home_out reason.
      await scanOut(request, token, "home_out");
      const { entry, exit } = await scanAndReadButtons(request, page, token);
      // Two entry buttons; ordering is Home In then Outing In (type choice open).
      expect(entry.sort()).toEqual(["Home In", "Outing In"].sort());
      expect(entry.length).toBe(2);
      expect(exit).toEqual([]);
    } finally {
      await logout(request, token);
    }
  });

  test("day_scholar IN → exactly TWO exit buttons: [Day Scholar Out] + [Home Out]", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      // Enter as a day scholar so the IN occupancy records day_scholar.
      await confirmEntryType(request, token, "day_scholar", "day_scholar_in");
      await scanIn(request, token, "day_scholar");
      const { entry, exit } = await scanAndReadButtons(request, page, token);
      expect(entry).toEqual([]);
      expect(exit.sort()).toEqual(["Day Scholar Out", "Home Out"].sort());
      expect(exit.length).toBe(2);
    } finally {
      await logout(request, token);
    }
  });

  test("Home Out tap on a day scholar without an approved pass → button is disabled", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    try {
      await confirmEntryType(request, token, "day_scholar", "day_scholar_in");
      await scanIn(request, token, "day_scholar");
      const { disabled } = await scanAndReadButtons(request, page, token);
      // No approved home_out pass in the fixture student's window → the Home Out
      // exit button must be disabled (Pass Required / No Pass).
      expect(disabled.has("Home Out")).toBe(true);
      // Day Scholar Out needs no pass and stays enabled.
      expect(disabled.has("Day Scholar Out")).toBe(false);
    } finally {
      await logout(request, token);
    }
  });

  test("choose 'Home In' on a home_out return → type badge flips to HOSTELLER", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    const adminToken = process.env.ADMIN_USER && process.env.ADMIN_PASS
      ? await operatorToken(request, process.env.ADMIN_USER, process.env.ADMIN_PASS)
      : "";
    try {
      // Drive the fixture OUT with a home_out reason (pass-seeded), then re-scan:
      // the entry menu offers Home In + Outing In. Pick Home In → hosteller.
      if (adminToken) {
        await seedApprovedPass(request, adminToken, token, "home_out");
      }
      await scanOut(request, token, "home_out");
      await confirmEntryType(request, token, "hosteller", "home_in");
      await scanIn(request, token, "hosteller");
      // Badge: the confirmation card shows the HOSTELLER badge.
      await expect(page.getByText("Hosteller", { exact: false })).toBeVisible({ timeout: 15_000 });
      // IN hosteller shows THREE exit buttons (Daily Outing, Day Pass, Home Out).
      const { exit } = await scanAndReadButtons(request, page, token);
      expect(exit.sort()).toEqual(["Daily Outing", "Day Pass", "Home Out"].sort());
      expect(exit.length).toBe(3);
    } finally {
      await logout(request, token);
    }
  });

  test("choose 'Outing In' / 'Day Scholar In' on a home_out return → type badge flips to DAY SCHOLAR", async ({ request, page }) => {
    const token = await operatorToken(request, OP_LOGIN!, OP_PASS!);
    const adminToken = process.env.ADMIN_USER && process.env.ADMIN_PASS
      ? await operatorToken(request, process.env.ADMIN_USER, process.env.ADMIN_PASS)
      : "";
    try {
      // Drive the fixture OUT with a home_out reason (pass-seeded), then re-scan:
      // the entry menu offers Home In + Outing In. Pick Outing In → day scholar.
      if (adminToken) {
        await seedApprovedPass(request, adminToken, token, "home_out");
      }
      await scanOut(request, token, "home_out");
      await confirmEntryType(request, token, "day_scholar", "day_scholar_in");
      await scanIn(request, token, "day_scholar");
      // Badge: the confirmation card shows the DAY SCHOLAR badge.
      await expect(page.getByText("Day Scholar", { exact: false })).toBeVisible({ timeout: 15_000 });
      // IN day scholar shows TWO exit buttons (Day Scholar Out, Home Out).
      const { exit } = await scanAndReadButtons(request, page, token);
      expect(exit.sort()).toEqual(["Day Scholar Out", "Home Out"].sort());
      expect(exit.length).toBe(2);
    } finally {
      await logout(request, token);
    }
  });
});
