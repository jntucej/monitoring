
import { test, expect, Page, Browser } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
const BASE = (globalThis as any).process?.env?.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:80";

// Same role config as ui-all-roles-full.spec.ts
const ROLES: Array<{
  role: string; login: string; pass: string;
  console: string; consoleAlt?: string[];
}> = [
  { role: "student", login: "23JJ1A0599", pass: "student123", console: "/student" },
  { role: "hod", login: "HOD", pass: "Hod@123", console: "/hod" },
  { role: "principal", login: "PRINCIPAL", pass: "Principal@123", console: "/principal" },
  { role: "vice_principal", login: "VICE_PRINCIPAL", pass: "VicePrincipal@123", console: "/vice-principal" },
  { role: "supervisor", login: "SUPERVISOR", pass: "Supervisor@123", console: "/supervisor" },
  { role: "operator", login: "OPERATOR", pass: "operator123", console: "/operator" },
  { role: "mess_incharge", login: "MESS_INCHARGE", pass: "MessIncharge@123", console: "/mess" },
  { role: "hostel_manager", login: "HOSTEL_MANAGER", pass: "HostelManager@123", console: "/hostel-manager" },
  { role: "deputy_warden", login: "DEPUTY_WARDEN", pass: "DeputyWarden@123", console: "/deputy-warden" },
  { role: "caretaker", login: "caretaker", pass: "Caretaker@123", console: "/caretaker", consoleAlt: ["/hostel/permissions"] },
  { role: "subject_faculty", login: "SUBJECT_FACULTY", pass: "SubjectFac@123", console: "/faculty" },
  { role: "exam_superintendent", login: "EXAM_SUPERINTENDENT", pass: "ExamSuper@123", console: "/exam/superintendent" },
  { role: "exam_branch", login: "EXAM_BRANCH", pass: "ExamBranch@123", console: "/exam-branch" },
  { role: "oie", login: "oie", pass: "OIE@123", console: "/oie" },
  { role: "worker", login: "WORKER", pass: "worker123", console: "/worker" },
  { role: "emo", login: "EMO", pass: "EMO@123", console: "/emo" },
  { role: "staff", login: "admin", pass: "Admin@123", console: "/staff" },
  { role: "admin", login: "admin", pass: "Admin@123", console: "/admin" },
  { role: "parent", login: "PARENT", pass: "Parent@123", console: "/guardian" },
];

async function loginAs(browser: Browser, login: string, pass: string) {
  const page = await browser.newPage();
  await page.goto(BASE + "/login");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[name="login"], input[type="text"]').first().fill(login);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("domcontentloaded");
  if (new URL(page.url()).pathname === "/login") {
    await page.goto(BASE + "/login");
    await page.waitForLoadState("domcontentloaded");
    await page.locator('input[name="login"], input[type="text"]').first().fill(login);
    await page.locator('input[type="password"]').first().fill(pass);
    await page.locator("button[type='submit']").first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");
  }
  return page;
}

for (const cfg of ROLES) {
  const targets: string[] = [cfg.console, ...(cfg.consoleAlt || [])];

  for (const target of targets) {
    test(`[${cfg.role}] no horizontal overflow at 375px on ${target}`, async ({ browser }: any) => {
      const page = await loginAs(browser, cfg.login, cfg.pass);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE + target, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => ({
        vw: document.documentElement.clientWidth,
        bodyW: document.body.scrollWidth,
      }));
      // 2px tolerance for sub-pixel rendering
      expect(r.bodyW, `${cfg.role} ${target}: body scrollWidth ${r.bodyW} > viewport ${r.vw}`).toBeLessThanOrEqual(r.vw + 2);
      await page.close();
    });
  }
}
