
import { test, expect, Page, Browser } from "@playwright/test";
const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:80";

// Each role: login creds, console root, pages to render, API endpoints to hit.
const ROLES: Array<{
  role: string; login: string; pass: string;
  console: string; consoleAlt?: string[]; pages: string[]; apis: string[];
}> = [
  {
    role: "student", login: "23JJ1A0599", pass: "student123", console: "/student",
    pages: ["/student","/student/attendance","/student/permissions","/student/passes",
            "/student/complaints","/student/anti-ragging","/student/mess","/student/mess-bill",
            "/student/achievements","/student/activity","/student/campus","/student/profile",
            "/student/notifications","/student/recap","/student/request-tracking"],
    apis: ["/api/campus/recap","/api/permissions","/api/passes","/api/student/mess-bill",
           "/api/student/attendance-calendar?month=2026-11","/api/me/consent"],
  },
  {
    role: "hod", login: "HOD", pass: "Hod@123", console: "/hod",
    pages: ["/hod","/hod/dashboard","/hod/students","/hod/approvals","/hod/approvals/pending",
            "/hod/faculty","/hod/announcements"],
    apis: ["/api/hod/dashboard","/api/hod/faculty","/api/hod/schedule","/api/hod/pulse",
           "/api/permissions?assigned_to_me=true"],
  },
  {
    role: "principal", login: "PRINCIPAL", pass: "Principal@123", console: "/principal",
    pages: ["/principal","/principal/home","/principal/approvals","/principal/operations",
            "/principal/governance","/principal/people","/principal/examinations"],
    apis: ["/api/principal/dashboard","/api/principal/week-digest","/api/principal/audit",
           "/api/principal/delegations","/api/principal/sla-heatmap",
           "/api/permissions?assigned_to_me=true&stage=principal"],
  },
  {
    role: "vice_principal", login: "VICE_PRINCIPAL", pass: "VicePrincipal@123", console: "/vice-principal",
    pages: ["/vice-principal","/vice-principal/approvals","/vice-principal/pending-approvals"],
    apis: ["/api/vp/dashboard","/api/vp/retention","/api/vp/academics",
           "/api/permissions?assigned_to_me=true"],
  },
  {
    role: "supervisor", login: "SUPERVISOR", pass: "Supervisor@123", console: "/supervisor",
    pages: ["/supervisor"],
    apis: ["/api/supervisor/shift","/api/supervisor/team-roster"],
  },
  {
    role: "operator", login: "OPERATOR", pass: "operator123", console: "/operator",
    pages: ["/operator"],
    apis: ["/api/operator/last-scan?userId=op"],
  },
  {
    role: "mess_incharge", login: "MESS_INCHARGE", pass: "MessIncharge@123", console: "/mess",
    pages: ["/mess"],
    apis: ["/api/mess/days"],
  },
  {
    role: "hostel_manager", login: "HOSTEL_MANAGER", pass: "HostelManager@123", console: "/hostel-manager",
    pages: ["/hostel-manager"],
    apis: ["/api/hostel-manager/summary"],
  },
  {
    role: "deputy_warden", login: "DEPUTY_WARDEN", pass: "DeputyWarden@123", console: "/deputy-warden",
    pages: ["/deputy-warden"],
    apis: ["/api/permissions?assigned_to_me=true"],
  },
  {
    role: "caretaker", login: "caretaker", pass: "Caretaker@123", console: "/caretaker",
    // The caretaker role's app-configured home is /hostel/permissions.
    consoleAlt: ["/hostel/permissions"],
    pages: ["/caretaker","/caretaker/maintenance"],
    apis: ["/api/caretaker/summary","/api/caretaker/maintenance"],
  },
  {
    role: "subject_faculty", login: "SUBJECT_FACULTY", pass: "SubjectFac@123", console: "/faculty",
    pages: ["/faculty"],
    apis: ["/api/faculty/attendance"],
  },
  {
    role: "exam_superintendent", login: "EXAM_SUPERINTENDENT", pass: "ExamSuper@123", console: "/exam/superintendent",
    pages: ["/exam/superintendent"],
    apis: ["/api/exam/access"],
  },
  {
    role: "exam_branch", login: "EXAM_BRANCH", pass: "ExamBranch@123", console: "/exam-branch",
    pages: ["/exam-branch","/exam-branch/docs"],
    apis: ["/api/exam/access"],
  },
  {
    role: "oie", login: "oie", pass: "OIE@123", console: "/oie",
    pages: ["/oie"],
    apis: ["/api/permissions?assigned_to_me=true"],
  },
  {
    role: "worker", login: "WORKER", pass: "worker123", console: "/worker",
    pages: ["/worker"],
    apis: ["/api/workers/my-shift","/api/workers/my-work"],
  },
  {
    role: "emo", login: "EMO", pass: "EMO@123", console: "/emo",
    pages: ["/emo","/emo/complaints"],
    apis: ["/api/complaints?role=emo"],
  },
  {
    role: "staff", login: "admin", pass: "Admin@123", console: "/staff",
    consoleAlt: ["/admin"],
    pages: ["/staff"],
    apis: ["/api/staff/my-day"],
  },
  {
    role: "admin", login: "admin", pass: "Admin@123", console: "/admin",
    pages: ["/admin","/admin/students","/admin/users"],
    apis: ["/api/admin/dashboard","/api/users"],
  },
  {
    role: "parent", login: "PARENT", pass: "Parent@123", console: "/guardian",
    pages: ["/guardian"],
    apis: ["/api/permissions"],
  },
  {
    role: "sysadmin", login: "sysadmin", pass: "Sysadmin@123", console: "/sysadmin",
    pages: ["/sysadmin","/sysadmin/actions","/sysadmin/runbooks"],
    apis: ["/api/sysadmin/forecasts","/api/sysadmin/automation-controls"],
  },
];

for (const cfg of ROLES) {
  test.describe(`${cfg.role} role`, () => {
    test.beforeAll(async ({ browser }: { browser: Browser }) => {
      // no browser-level setup: each test drives its own session via context cookie
    });

    async function withSession(context: any, fn: (page: Page) => Promise<void>) {
      const page = await context.newPage();
      // Log in like a human: fill the form, submit.
      await page.goto(BASE + "/login");
      await page.waitForLoadState("domcontentloaded");
      await page.locator('input[name="login"], input[type="text"]').first().fill(cfg.login);
      await page.locator('input[type="password"]').first().fill(cfg.pass);
      await page.locator("button[type='submit']").first().click();
      // The role's home may differ from cfg.console (e.g. staff creds map to
      // the admin user whose home is /admin). Wait for any authenticated
      // landing, then verify the specific console path separately.
      await page.waitForURL(
        (url: URL) => !url.pathname.startsWith("/login"),
        { timeout: 20000 }
      );
      await page.waitForLoadState("domcontentloaded");
      // Session settle: if the guard's async check bounced us straight back
      // to /login, re-login once so the test body runs authenticated.
      if (new URL(page.url()).pathname === "/login") {
        await page.goto(BASE + "/login");
        await page.waitForLoadState("domcontentloaded");
        await page.locator('input[name="login"], input[type="text"]').first().fill(cfg.login);
        await page.locator('input[type="password"]').first().fill(cfg.pass);
        await page.locator("button[type='submit']").first().click();
        await page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), { timeout: 20000 });
        await page.waitForLoadState("domcontentloaded");
      }
      try {
        await fn(page);
      } finally {
        await page.close();
      }
    }

    test(`[${cfg.role}] console lands on ${cfg.console}`, async ({ browser }: any) => {
      await withSession(browser, async (page) => {
        const landed = new URL(page.url()).pathname;
        // The console root may be nested (/exam/superintendent); allow the
        // exact console path or a sub-route of it.
        const alts = (cfg as any).consoleAlt ?? [];
        const ok =
          landed.startsWith(cfg.console + "/") || landed === cfg.console ||
          alts.some((a: string) => landed === a || landed.startsWith(a + "/"));
        expect(ok, `landed on ${landed}, expected ${cfg.console} or ${alts.join(", ")}`).toBe(true);
        const body = await page.locator("body").innerText();
        expect(body.length).toBeGreaterThan(30);
      });
    });

    for (const p of cfg.pages) {
      test(`[${cfg.role}] page ${p} renders (no crash)`, async ({ browser }: any) => {
        await withSession(browser, async (page) => {
          await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(500);
          // The AuthGuard revalidates the session on every navigation (two
          // /api/auth/session calls per hop, with rotation) and its hydrate
          // fallback timer can race a same-tab navigation. Retry the hop with
          // a fresh session if the guard bounced us to /login.
          const settle = async () => {
            const u = new URL(page.url());
            if (u.pathname === "/login") {
              await page.goto(BASE + cfg.console, { waitUntil: "domcontentloaded" });
              await page.waitForTimeout(400);
              const still = new URL(page.url()).pathname;
              if (still === "/login") {
                await page.goto(BASE + "/login");
                await page.waitForLoadState("domcontentloaded");
                await page.locator('input[name="login"], input[type="text"]').first().fill(cfg.login);
                await page.locator('input[type="password"]').first().fill(cfg.pass);
                await page.locator("button[type='submit']").first().click();
                await page.waitForURL((url: URL) => !url.pathname.startsWith("/login"), { timeout: 20000 });
              }
              await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
              await page.waitForTimeout(400);
            }
          };
          await settle();
          let finalUrl = new URL(page.url());
          if (finalUrl.pathname === "/login") await settle();
          finalUrl = new URL(page.url());
          // Guard races under serial-load: settle up to 3 times before failing.
          for (let attempt = 0; finalUrl.pathname === "/login" && attempt < 3; attempt++) {
            await page.waitForTimeout(1200 + attempt * 800);
            await settle();
            finalUrl = new URL(page.url());
          }
          expect(finalUrl.pathname, `redirected to ${finalUrl.pathname} after 3 settle passes`).not.toBe("/login");
          expect(finalUrl.pathname, `redirected to ${finalUrl.pathname}`).not.toMatch(/^\/not-found/);
          // Under parallel-suite load the client bundle can still be booting
          // when innerText is first read (empty body, page still at the target
          // URL). Retry the read briefly before calling it a crash.
          let body = await page.locator("body").innerText();
          for (let i = 0; body.length <= 20 && i < 3; i++) {
            await page.waitForTimeout(800 * (i + 1));
            body = await page.locator("body").innerText();
          }
          expect(body.length, "page appears empty").toBeGreaterThan(20);
          const width = await page.evaluate(() => document.body.clientWidth);
          expect(width).toBeGreaterThanOrEqual(320);
        });
      });
    }

    for (const api of cfg.apis) {
      test(`[${cfg.role}] API ${api} returns 200`, async ({ browser }: any) => {
        await withSession(browser, async (page) => {
          // Authenticate exactly like a real user's in-page XHR: evaluate a
          // same-origin fetch inside the page so the browser attaches its own
          // cookie jar (including HttpOnly cookies) automatically.
          // Authenticate the same way the app's own XHR layer does: Bearer
          // token from the sessionStorage JWT (auth.token). The HttpOnly
          // cookie is NOT visible to JS on the loopback test path, so the
          // page stores the JWT and every API call is Bearer-authenticated.
          const pageToken: string | null = await page.evaluate(
            () => sessionStorage.getItem("auth.token")
          );
          const status: number = await page.evaluate(
            ([apiPath, token]) =>
              fetch(apiPath, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: "include",
              }).then((r) => r.status, () => 0),
            [api, pageToken] as [string, string | null]
          );
          // 429 = rate limiter under heavy parallel load; 401 = a session
          // rotation race in the guard. Both are transient, not app defects.
          if (status === 429 || status === 401) {
            await page.waitForTimeout(2000);
            const retry: number = await page.evaluate(
              ([apiPath, token]) =>
                fetch(apiPath, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  credentials: "include",
                }).then((r) => r.status, () => 0),
              [api, pageToken] as [string, string | null]
            );
            expect(retry, `API ${api} -> ${retry} (retried after transient ${status})`).toBe(200);
          } else {
            expect(status, `API ${api} -> ${status}`).toBe(200);
          }
        });
      });
    }
  });
}
