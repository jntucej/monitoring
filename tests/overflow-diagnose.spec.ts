// Diagnostic: API login -> console walk at 375px, report overflowing elements.
import { test, expect, Browser, Page } from "@playwright/test";
const BASE = (globalThis as any).process?.env?.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:80";

const TARGETS: Array<{ role: string; login: string; pass: string; path: string }> = [
  { role: "principal", login: "PRINCIPAL", pass: "Principal@123", path: "/principal" },
  { role: "vice_principal", login: "VICE_PRINCIPAL", pass: "VicePrincipal@123", path: "/vice-principal" },
  { role: "hostel_manager", login: "HOSTEL_MANAGER", pass: "HostelManager@123", path: "/hostel-manager" },
  { role: "staff", login: "STAFF", pass: "staff@123", path: "/staff" },
  { role: "admin", login: "ADMIN", pass: "Admin@123", path: "/admin" },
];

async function loginViaApi(page: Page, login: string, pass: string) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { login, password: pass },
    headers: { "Sec-Fetch-Site": "same-origin" },
  });
  return res.ok();
}

for (const t of TARGETS) {
  test(`overflow diagnose: [${t.role}] ${t.path} @ 375px`, async ({ browser }: any) => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 667 });
    const ok = await loginViaApi(page, t.login, t.pass);
    if (!ok) {
      console.log(`[SKIP] ${t.role}: API login failed`);
      await page.close();
      return;
    }
    await page.goto(`${BASE}${t.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    if (page.url().includes("/login")) {
      console.log(`[SKIP] ${t.role}: redirected to /login (MFA?)`);
      await page.close();
      return;
    }

    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bodyW = document.body.scrollWidth;
      const bad: Array<{ tag: string; cls: string; w: number; left: number }> = [];
      document.querySelectorAll("*").forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.right > vw + 2 && r.width > 0) {
          bad.push({
            tag: (el as HTMLElement).tagName,
            cls: String((el as HTMLElement).className || "").slice(0, 90),
            w: Math.round(r.width),
            left: Math.round(r.left),
          });
        }
      });
      return { vw, bodyW, overflow: bodyW - vw, count: bad.length, sample: bad.slice(0, 10) };
    });
    console.log(`[OVERFLOW ${t.role}]`, JSON.stringify(report));
    await page.close();
  });
}
