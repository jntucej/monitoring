
import { test, expect, Page, Browser } from "@playwright/test";
const BASE = (globalThis as any).process?.env?.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:80";

const ROLES: Array<{
  role: string; login: string; pass: string;
  home: string;
  nav: { label: string; selector: string }[];
  interactions: { label: string; selector: string; expect: string; expectType?: "text" | "visible" }[];
}> = [
  {
    role: "student", login: "23JJ1A0599", pass: "student123", home: "/student",
    nav: [
      { label: "attendance", selector: 'a[href*="/student/attendance"]' },
      { label: "permissions", selector: 'a[href*="/student/permissions"]' },
      { label: "mess", selector: 'a[href*="/student/mess"]' },
    ],
    interactions: [
      { label: "apply-permissions link", selector: 'a[href="/student/permissions/new"]', expect: "/student/permissions/new", expectType: "text" },
      { label: "attendance tab/section", selector: 'a[href*="attendance"], button:has-text("Attendance")', expect: "attendance", expectType: "text" },
      { label: "mess link", selector: 'a[href="/student/mess"]', expect: "/student/mess", expectType: "text" },
    ],
  },
  {
    role: "hod", login: "HOD", pass: "Hod@123", home: "/hod",
    nav: [
      { label: "today", selector: 'a[href="/hod/home"]' },
      { label: "students", selector: 'a[href="/hod/students"]' },
      { label: "escalated", selector: 'a[href="/hod/approvals/escalated"]' },
    ],
    interactions: [
      { label: "escalated approvals link", selector: 'a[href="/hod/approvals/escalated"]', expect: "/hod/approvals/escalated", expectType: "text" },
      { label: "students link", selector: 'a[href="/hod/students"]', expect: "/hod/students", expectType: "text" },
    ],
  },
  {
    role: "principal", login: "PRINCIPAL", pass: "Principal@123", home: "/principal",
    nav: [
      { label: "today", selector: 'a[href="/principal/home"]' },
      { label: "examinations", selector: 'a[href="/principal/examinations"]' },
      { label: "profile", selector: 'a[href="/principal/profile"]' },
    ],
    interactions: [
      { label: "examinations link", selector: 'a[href="/principal/examinations"]', expect: "/principal/examinations", expectType: "text" },
      { label: "today link", selector: 'a[href="/principal/home"]', expect: "/principal/home", expectType: "text" },
    ],
  },
  {
    role: "admin", login: "admin", pass: "Admin@123", home: "/admin",
    nav: [
      { label: "users", selector: 'a[href*="/admin/users"]' },
      { label: "students", selector: 'a[href*="/admin/students"]' },
    ],
    interactions: [
      { label: "student roster link", selector: 'a[href="/admin/students"]', expect: "/admin/students", expectType: "text" },
      { label: "bulk import link", selector: 'a[href="/admin/students/import"]', expect: "/admin/students/import", expectType: "text" },
    ],
  },
  {
    role: "operator", login: "OPERATOR", pass: "operator123", home: "/operator",
    nav: [],
    interactions: [
      { label: "gate selector / scan section", selector: '[data-testid], button, select', expect: "", expectType: "visible" },
    ],
  },
  {
    role: "worker", login: "WORKER", pass: "worker123", home: "/worker",
    nav: [],
    interactions: [
      { label: "worker console content", selector: "h1, h2, [class*='card'], [class*='panel']", expect: "", expectType: "visible" },
    ],
  },
  {
    role: "caretaker", login: "caretaker", pass: "Caretaker@123", home: "/hostel/permissions",
    nav: [],
    interactions: [
      { label: "caretaker console content", selector: "h1, h2, [class*='card']", expect: "", expectType: "visible" },
    ],
  },
  {
    role: "mess_incharge", login: "MESS_INCHARGE", pass: "MessIncharge@123", home: "/mess",
    nav: [],
    interactions: [
      { label: "mess console content", selector: "h1, h2, [class*='card']", expect: "", expectType: "visible" },
    ],
  },
  {
    role: "supervisor", login: "SUPERVISOR", pass: "Supervisor@123", home: "/supervisor",
    nav: [],
    interactions: [
      { label: "supervisor console content", selector: "h1, h2, [class*='card']", expect: "", expectType: "visible" },
    ],
  },
];

async function loginAs(browser: Browser, login: string, pass: string, home: string) {
  const page = await browser.newPage();
  await page.goto(BASE + "/login");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="login"], input[type="text"]').first().fill(login);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("domcontentloaded");
  // settle: if bounced to /login by a guard race, re-login once
  if (new URL(page.url()).pathname === "/login") {
    await page.goto(BASE + "/login");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[name="login"], input[type="text"]').first().fill(login);
    await page.locator('input[type="password"]').first().fill(pass);
    await page.locator("button[type='submit']").first().click();
    await page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");
  }
  return page;
}

for (const cfg of ROLES) {
  test.describe(`${cfg.role} interactive UI`, () => {

    test(`[${cfg.role}] login form works end-to-end`, async ({ browser }: any) => {
      const page = await loginAs(browser, cfg.login, cfg.pass, cfg.home);
      const url = new URL(page.url());
      expect(url.pathname.startsWith("/login")).toBe(false);
      const body = await page.locator("body").innerText();
      expect(body.length).toBeGreaterThan(30);
      await page.close();
    });

    for (const n of cfg.nav) {
      test(`[${cfg.role}] nav: click "${n.label}" navigates`, async ({ browser }: any) => {
        const page = await loginAs(browser, cfg.login, cfg.pass, cfg.home);
        // Wait for the shell to hydrate past "Loading page..." before checking
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.locator("main, [class*='shell'], [class*='sidebar']").first()
          .waitFor({ state: "visible", timeout: 15000 });
        const link = page.locator(n.selector).first();
        const count = await link.count();
        if (count === 0) {
          await page.goto(BASE + cfg.home, { waitUntil: "networkidle" }).catch(() => {});
          await page.locator("main, [class*='shell'], [class*='sidebar']").first()
            .waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
        }
        const c2 = await page.locator(n.selector).first().count();
        expect(c2, `nav element "${n.label}" not found`).toBeGreaterThan(0);
        await page.locator(n.selector).first().click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(400);
        const finalPath = new URL(page.url()).pathname;
        expect(finalPath).not.toBe("/login");
        expect(finalPath).not.toMatch(/^\/not-found/);
        await page.close();
      });
    }

    for (const ix of cfg.interactions) {
      test(`[${cfg.role}] interact: ${ix.label}`, async ({ browser }: any) => {
        const page = await loginAs(browser, cfg.login, cfg.pass, cfg.home);
        await page.goto(BASE + cfg.home, { waitUntil: "networkidle" }).catch(() => {});
        await page.locator("main, [class*='shell'], [class*='sidebar']").first()
          .waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
        const el = page.locator(ix.selector).first();
        const count = await el.count();
        expect(count, `element "${ix.label}" not found on ${cfg.home}`).toBeGreaterThan(0);
        if (ix.expectType === "visible") {
          await expect(el).toBeVisible();
        } else {
          // click and verify the result — wait for client-side nav to settle
          await el.click();
          await page.waitForURL((u) => {
            const p = new URL(u.toString()).pathname;
            return ix.expect.startsWith("/") ? p.includes(ix.expect) : true;
          }, { timeout: 8000 }).catch(() => {});
          await page.waitForLoadState("domcontentloaded").catch(() => {});
          await page.waitForTimeout(600);
          const finalUrl = new URL(page.url()).pathname;
          const body = await page.locator("body").innerText();
          if (ix.expect.startsWith("/")) {
            expect(finalUrl, `after clicking ${ix.label}, expected URL containing ${ix.expect}, got ${finalUrl}`).toContain(ix.expect);
          } else {
            expect(body.toLowerCase()).toContain(ix.expect.toLowerCase());
          }
        }
        await page.close();
      });
    }

    test(`[${cfg.role}] responsive: renders at 375px mobile width`, async ({ browser }: any) => {
      const page = await loginAs(browser, cfg.login, cfg.pass, cfg.home);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE + cfg.home, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const body = await page.locator("body").innerText();
      expect(body.length, "empty at mobile width").toBeGreaterThan(20);
      // no horizontal overflow (scrollWidth should be ~ viewport or less)
      expect(bodyWidth, `horizontal overflow at 375px`).toBeLessThanOrEqual(400);
      await page.close();
    });
  });
}
