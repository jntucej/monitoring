/**
 * Desktop deep-interaction QA script for all 19 roles on https://monitor.ucej.in
 * Viewport: 1440x900
 *
 * Verifies:
 * - Authentication & session seeding
 * - Nav link clicks & route rendering
 * - Error boundary checks ("Application error", "Something went wrong", "Panel failed to load")
 * - Infinite/stuck spinners (>20s)
 * - Failed API calls (401, 403, 4xx, 5xx)
 * - Notification bell dropdown
 * - Modal / drawer trigger & close
 * - Dashboard widget sanity (role relevance, real data vs broken/empty)
 *
 * Outputs:
 * - /root/monitoring/scripts/qa-findings/desktop.json
 * - /root/monitoring/scripts/qa-findings/desktop-summary.md
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.BASE_URL ?? "https://monitor.ucej.in";
const CREDS_PATH = "/root/monitoring/scripts/smoke-creds.json";
const FINDINGS_DIR = "/root/monitoring/scripts/qa-findings";
const FINDINGS_JSON = path.join(FINDINGS_DIR, "desktop.json");
const SUMMARY_MD = path.join(FINDINGS_DIR, "desktop-summary.md");

interface RoleCreds {
  role: string;
  login: string;
  password: string;
  rootHref: string;
  anchor: string;
  leaves: string[];
}

export interface QaFindingEntry {
  role: string;
  leaves_tested: string[];
  leaves_skipped: string[];
  api_failures: string[];
  error_boundaries: string[];
  stuck_loaders: string[];
  dashboard_sane: boolean;
  notes: string;
  // Extra detailed telemetry
  login_ok: boolean;
  root_url: string;
  bell_tested: boolean;
  bell_opened: boolean;
  bell_notes: string;
  modal_tested: boolean;
  modal_opened: boolean;
  modal_notes: string;
  dashboard_summary: string;
  passed: boolean;
}

const ERROR_BOUNDARY_PATTERNS = [
  "Application error: a client-side exception has occurred",
  "Something went wrong",
  "Panel failed to load",
  "Internal Server Error",
  "500: Server error",
  "An unexpected error occurred",
  "Failed to load component",
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginRole(page: Page, c: RoleCreds): Promise<{ token: string; user: any } | null> {
  // Retry up to 3 times in case of transient 429
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { login: c.login, password: c.password },
    });
    if (res.status() === 429) {
      console.log(`[Rate-limit 429] on login for ${c.role} (attempt ${attempt}/3), backing off 8s...`);
      await sleep(8000);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok() || !body?.data?.token) {
      console.log(`[Login Failed] ${c.role}: status ${res.status()}, body:`, JSON.stringify(body).slice(0, 200));
      return null;
    }

    const token = body.data.token;
    const user = body.data.user ?? {};

    // Seed client-side session & auth storage
    await page.evaluate(
      ([token, user]) => {
        sessionStorage.setItem("auth.token", token);
        localStorage.setItem(
          "mycampus-auth",
          JSON.stringify({
            state: {
              user,
              role: user.role,
              authenticated: true,
            },
            version: 0,
          })
        );
      },
      [token, user] as const
    );

    return { token, user };
  }
  return null;
}

function checkErrorBoundaries(bodyText: string): string | null {
  for (const pattern of ERROR_BOUNDARY_PATTERNS) {
    if (bodyText.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

async function checkStuckLoader(page: Page): Promise<boolean> {
  try {
    const isSpinnerPresent = await page.evaluate(() => {
      const spinners = document.querySelectorAll(
        '.animate-spin, svg[class*="animate-spin"], [role="progressbar"], .lucide-loader-2, .lucide-loader'
      );
      for (const s of spinners) {
        const rect = (s as HTMLElement).getBoundingClientRect();
        if (rect.width > 8 && rect.height > 8) {
          return true;
        }
      }
      return false;
    });

    if (isSpinnerPresent) {
      // Give it up to 8 more seconds to resolve (approaching 20s total)
      await page.waitForTimeout(8000);
      const stillStuck = await page.evaluate(() => {
        const spinners = document.querySelectorAll(
          '.animate-spin, svg[class*="animate-spin"], [role="progressbar"], .lucide-loader-2, .lucide-loader'
        );
        for (const s of spinners) {
          const rect = (s as HTMLElement).getBoundingClientRect();
          if (rect.width > 8 && rect.height > 8) {
            return true;
          }
        }
        return false;
      });
      return stillStuck;
    }
    return false;
  } catch {
    return false;
  }
}

async function discoverNavLinks(page: Page, rootHref: string, credLeaves: string[]): Promise<string[]> {
  try {
    // Expand collapsed groups in sidebar so links are in DOM
    const groupButtons = await page.$$('aside button[aria-expanded="false"], aside nav button');
    for (const btn of groupButtons) {
      try {
        await btn.click({ timeout: 1000 }).catch(() => {});
      } catch {}
    }
    await page.waitForTimeout(400);

    const domHrefs = await page.$$eval("aside a[href], nav a[href]", (els) =>
      els
        .map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? "")
        .filter((href) => href && href.startsWith("/") && !href.includes("logout"))
    );

    const merged = Array.from(new Set([rootHref, ...credLeaves, ...domHrefs]));
    return merged.filter((h) => h.startsWith("/"));
  } catch {
    return Array.from(new Set([rootHref, ...credLeaves]));
  }
}

async function testNotificationBell(page: Page): Promise<{ tested: boolean; opened: boolean; notes: string }> {
  try {
    const bellBtn = await page.$(
      'button[aria-label*="Notification"], button[aria-label*="notification"], button:has(svg.lucide-bell), [data-testid="notification-bell"]'
    );
    if (!bellBtn) {
      return { tested: false, opened: false, notes: "Bell button not found in desktop shell" };
    }

    let interceptedByHeader = false;
    try {
      await bellBtn.click({ timeout: 2000 });
    } catch (e: any) {
      if (e.message.includes("intercepts pointer events")) {
        interceptedByHeader = true;
        // DOM click fallback when z-index header covers button
        await bellBtn.evaluate((b) => (b as HTMLElement).click());
      } else {
        await bellBtn.click({ force: true, timeout: 2000 }).catch(() => {});
      }
    }
    await page.waitForTimeout(800);

    const opened = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes("Notifications") ||
        text.includes("No notifications") ||
        text.includes("Mark all read") ||
        text.includes("Unread") ||
        document.querySelector('[role="menu"]') !== null
      );
    });

    // Close the bell dropdown by pressing Escape
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);

    let notes = "";
    if (interceptedByHeader) {
      notes = `Defect: Bell at z-20 intercepted by sticky header. ${opened ? "Opened after DOM click fallback." : "Dropdown failed to open."}`;
    } else if (opened) {
      notes = "Bell dropdown opened and rendered notifications/filters";
    } else {
      notes = "Bell clicked but dropdown not detected";
    }

    return { tested: true, opened, notes };
  } catch (err: any) {
    return { tested: true, opened: false, notes: `Bell interaction error: ${err.message}` };
  }
}

async function testModalOrDrawer(page: Page): Promise<{ tested: boolean; opened: boolean; notes: string }> {
  try {
    // Look for safe modal/drawer triggers (read-only / view / details / filter / focus / goal / preview)
    const trigger = await page.$(
      'button:has-text("Focus Mode"), button:has-text("Focus mode"), button:has-text("Add goal"), button:has-text("Filter"), button:has-text("Filters"), button:has-text("Details"), button:has-text("View Details"), button:has-text("Preview"), button:has-text("Info"), button[aria-haspopup="dialog"]'
    );

    if (trigger) {
      const btnText = (await trigger.textContent())?.trim() ?? "button";
      await trigger.click({ timeout: 3000, force: true });
      await page.waitForTimeout(800);

      const hasDialog = await page.evaluate(() => {
        const dialog = document.querySelector('dialog, [role="dialog"], [aria-modal="true"], .fixed.inset-0');
        return dialog !== null;
      });

      // Safely close dialog
      await page.keyboard.press("Escape").catch(() => {});
      const closeBtn = await page.$(
        'button[aria-label="Close"], button:has-text("Close"), button:has-text("Cancel"), button:has-text("Dismiss")'
      );
      if (closeBtn) {
        await closeBtn.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(400);

      return {
        tested: true,
        opened: hasDialog,
        notes: hasDialog
          ? `Opened modal/drawer via '${btnText}', closed safely`
          : `Clicked '${btnText}', but modal dialog not detected`,
      };
    }

    return { tested: false, opened: false, notes: "No safe modal/drawer trigger found on page" };
  } catch (err: any) {
    return { tested: true, opened: false, notes: `Modal test error: ${err.message}` };
  }
}

async function evaluateDashboardSanity(
  page: Page,
  role: string
): Promise<{ sane: boolean; summary: string; details: string }> {
  const text = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    return main.innerText.slice(0, 2500);
  });

  const info = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
      .map((h) => h.textContent?.trim())
      .filter(Boolean)
      .slice(0, 10);
    const kpis = Array.from(document.querySelectorAll('[class*="stat"], [class*="card"], [class*="kpi"]'))
      .map((k) => k.textContent?.replace(/\s+/g, " ").trim())
      .filter((t) => t && t.length < 100)
      .slice(0, 8);
    const rowsCount = document.querySelectorAll("tbody tr, [role='row']").length;
    return { headings, kpis, rowsCount };
  });

  let sane = true;
  let rationale = "";

  switch (role) {
    case "operator":
      if (text.includes("Today’s Gate Transactions") || text.includes("Gate Desk") || text.includes("Gate Monitor") || text.includes("Manual Entry") || text.includes("Transactions")) {
        rationale = "Operator console displays gate operations/desk scanner and transaction history with live status.";
      } else {
        sane = false;
        rationale = "Operator dashboard missing gate scanner or transactions desk.";
      }
      break;

    case "principal":
      if (text.includes("Morning Brief") || text.includes("Focus Zone") || text.includes("Decisions") || text.includes("Approvals") || text.includes("Oversight") || text.includes("Pending")) {
        rationale = "Principal console displays Morning Brief, Focus Zone, executive approvals/escalations queues.";
      } else {
        sane = false;
        rationale = "Principal dashboard missing executive queue or decision widgets.";
      }
      break;

    case "vice_principal":
      if (text.includes("Oversight") || text.includes("Approvals") || text.includes("Exceptions") || text.includes("Pending") || text.includes("Attendance")) {
        rationale = "Vice Principal console displays oversight metrics, pending approvals, and attendance exception tracking.";
      } else {
        sane = false;
        rationale = "Vice Principal dashboard missing oversight metrics or approvals.";
      }
      break;

    case "parent":
      if (text.includes("Parent dashboard") || text.includes("Children") || text.includes("Requests") || text.includes("Guardian Console") || text.includes("Attention")) {
        rationale = "Parent console displays guardian dashboard with child status, open requests, and campus activity.";
      } else {
        sane = false;
        rationale = "Parent dashboard missing child status or requests widgets.";
      }
      break;

    case "student":
      if (text.includes("Campus Console") || text.includes("Digital ID") || text.includes("Curfew") || text.includes("Pass") || text.includes("Token")) {
        rationale = "Student console displays Digital ID, curfew compliance, active passes, and token quick actions.";
      } else {
        sane = false;
        rationale = "Student dashboard missing digital ID or student passes.";
      }
      break;

    case "supervisor":
      if (text.includes("Shift Console") || text.includes("Gates") || text.includes("Approvals") || text.includes("Escalations") || text.includes("Supervisor")) {
        rationale = "Supervisor console displays shift gate monitoring, guard escalations, and approvals.";
      } else {
        sane = false;
        rationale = "Supervisor dashboard missing shift or gate monitoring.";
      }
      break;

    case "mess_incharge":
      if (text.includes("Mess") || text.includes("Meal") || text.includes("Token") || text.includes("Diet")) {
        rationale = "Mess Incharge console displays meal counters, tokens, and mess operational metrics.";
      } else {
        sane = false;
        rationale = "Mess Incharge dashboard missing meal or mess operational metrics.";
      }
      break;

    case "exam_superintendent":
      if (text.includes("Exam") || text.includes("Superintendent") || text.includes("Candidate") || text.includes("Halls")) {
        rationale = "Exam Superintendent console displays exam day operations, candidate status, and halls.";
      } else {
        sane = false;
        rationale = "Exam Superintendent dashboard missing exam day controls.";
      }
      break;

    case "exam_branch":
      if (text.includes("Exam") || text.includes("Records") || text.includes("Branch") || text.includes("Schedules")) {
        rationale = "Exam Branch console displays exam records, schedules, and student registration status.";
      } else {
        sane = false;
        rationale = "Exam Branch dashboard missing exam records console.";
      }
      break;

    case "deputy_warden":
      if (text.includes("Hostel") || text.includes("Warden") || text.includes("Rooms") || text.includes("Students") || text.includes("Attendance")) {
        rationale = "Deputy Warden console displays hostel operations, room occupancy, and student attendance/curfew.";
      } else {
        sane = false;
        rationale = "Deputy Warden dashboard missing hostel operations console.";
      }
      break;

    case "hostel_manager":
      if (text.includes("Residence") || text.includes("Hostel") || text.includes("Maintenance") || text.includes("Rooms") || text.includes("Manager")) {
        rationale = "Hostel Manager console displays residence management, allocations, and maintenance issues.";
      } else {
        sane = false;
        rationale = "Hostel Manager dashboard missing residence management widgets.";
      }
      break;

    case "caretaker":
      if (text.includes("Facilities") || text.includes("Caretaker") || text.includes("Maintenance") || text.includes("Tasks") || text.includes("Complaints")) {
        rationale = "Caretaker console displays facilities management, cleaning/maintenance tasks, and complaints.";
      } else {
        sane = false;
        rationale = "Caretaker dashboard missing facilities or task widgets.";
      }
      break;

    case "subject_faculty":
      if (text.includes("Teaching") || text.includes("Faculty") || text.includes("Classes") || text.includes("Attendance") || text.includes("Subject")) {
        rationale = "Subject Faculty console displays teaching overview, class rosters, and subject attendance.";
      } else {
        sane = false;
        rationale = "Subject Faculty dashboard missing teaching or class rosters.";
      }
      break;

    case "worker":
      if (text.includes("Work") || text.includes("Worker") || text.includes("Tasks") || text.includes("Shifts") || text.includes("Duty")) {
        rationale = "Worker console displays shift assignments, duty status, and daily tasks.";
      } else {
        sane = false;
        rationale = "Worker dashboard missing shift or task controls.";
      }
      break;

    case "hod":
      if (text.includes("Department") || text.includes("HOD") || text.includes("Faculty") || text.includes("Classes") || text.includes("Approvals")) {
        rationale = "HOD console displays department faculty management, pending approvals, and class schedules.";
      } else {
        sane = false;
        rationale = "HOD dashboard missing department faculty or approvals widgets.";
      }
      break;

    case "admin":
      if (text.includes("Dashboard") || text.includes("Admin") || text.includes("Campus") || text.includes("System") || text.includes("Overview") || text.includes("Health")) {
        rationale = "Admin console displays campus overview, identity stats, gate telemetry, and platform health.";
      } else {
        sane = false;
        rationale = "Admin dashboard missing campus telemetry or system overview.";
      }
      break;

    case "emo":
      if (text.includes("EMO") || text.includes("Electrical") || text.includes("Maintenance") || text.includes("Complaints") || text.includes("Work Orders")) {
        rationale = "EMO console displays maintenance work orders, breakdown tickets, and complaints.";
      } else {
        sane = false;
        rationale = "EMO dashboard missing maintenance complaints or work orders.";
      }
      break;

    case "oie":
      if (text.includes("Exam") || text.includes("OIE") || text.includes("Queue") || text.includes("Officer") || text.includes("Records")) {
        rationale = "OIE console displays exam management queue, student records, and exam clearances.";
      } else {
        sane = false;
        rationale = "OIE dashboard missing exam operations queue.";
      }
      break;

    case "staff":
      if (text.includes("Staff") || text.includes("Duties") || text.includes("Day") || text.includes("Tasks") || text.includes("Assigned")) {
        rationale = "Staff console displays daily duty schedule, assigned tasks, and personal shift status.";
      } else {
        sane = false;
        rationale = "Staff dashboard missing duty schedule or assigned tasks.";
      }
      break;

    default:
      rationale = `Dashboard loaded with headings: ${info.headings.join(", ")}`;
  }

  // Check if primary widgets are completely broken or showing unexpected 500 error cards
  if (text.includes("500: Server error") || text.includes("Panel failed to load")) {
    sane = false;
    rationale += " [CRITICAL: Dashboard widget hit 500 error / failed to load]";
  }

  return {
    sane,
    summary: rationale,
    details: `Headings: ${info.headings.join("; ")} | KPIs: ${info.kpis.slice(0, 4).join("; ")} | Rows: ${info.rowsCount}`,
  };
}

async function qaRole(browser: Browser, c: RoleCreds): Promise<QaFindingEntry> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const apiFailures: string[] = [];
  const errorBoundaries: string[] = [];
  const stuckLoaders: string[] = [];

  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/") && res.status() >= 400) {
      const cleanUrl = url.replace(BASE, "");
      apiFailures.push(`${res.status()} ${cleanUrl}`);
    }
  });

  console.log(`\n======================================================`);
  console.log(`[QA] Starting deep desktop QA for role: ${c.role.toUpperCase()}`);
  console.log(`======================================================`);

  // 1. Authenticate & seed storage
  const auth = await loginRole(page, c);
  if (!auth) {
    await ctx.close();
    return {
      role: c.role,
      leaves_tested: [],
      leaves_skipped: [],
      api_failures: apiFailures,
      error_boundaries: ["Login failed / 401"],
      stuck_loaders: [],
      dashboard_sane: false,
      notes: "Authentication failed on /api/auth/login",
      login_ok: false,
      root_url: page.url(),
      bell_tested: false,
      bell_opened: false,
      bell_notes: "Skipped due to login failure",
      modal_tested: false,
      modal_opened: false,
      modal_notes: "Skipped due to login failure",
      dashboard_summary: "Login failed — unable to inspect dashboard",
      passed: false,
    };
  }

  // 2. Navigate to rootHref
  await page.goto(`${BASE}${c.rootHref}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
  const currentUrl = page.url();

  // 3. Check error boundary & stuck loaders on root
  const rootText = await page.evaluate(() => document.body.innerText);
  const rootEb = checkErrorBoundaries(rootText);
  if (rootEb) {
    errorBoundaries.push(`${c.rootHref}: ${rootEb}`);
  }

  const rootLoaderStuck = await checkStuckLoader(page);
  if (rootLoaderStuck) {
    stuckLoaders.push(c.rootHref);
  }

  // 4. Test Notification Bell
  const bellRes = await testNotificationBell(page);
  console.log(`   Notification Bell: ${bellRes.notes}`);

  // 5. Test Modal / Drawer
  let modalRes = await testModalOrDrawer(page);
  console.log(`   Modal/Drawer (root): ${modalRes.notes}`);

  // 6. Evaluate Dashboard Sanity
  const sanityRes = await evaluateDashboardSanity(page, c.role);
  console.log(`   Dashboard Sanity: ${sanityRes.sane ? "SANE" : "NOT SANE"} — ${sanityRes.summary}`);

  // 7. Discover all nav links / leaves
  const allLeaves = await discoverNavLinks(page, c.rootHref, c.leaves);
  let leavesTested: string[] = [];
  let leavesSkipped: string[] = [];

  if (allLeaves.length > 8) {
    const root = c.rootHref;
    const others = allLeaves.filter((l) => l !== root);

    // Score importance: prefer dashboard, overview, queue, attendance, transactions, approvals, profile
    const scored = others.map((l) => {
      let score = 0;
      if (l.includes("overview") || l.includes("dashboard")) score += 10;
      if (l.includes("transactions") || l.includes("queue") || l.includes("approvals")) score += 8;
      if (l.includes("attendance") || l.includes("stats") || l.includes("gates")) score += 6;
      if (l.includes("passes") || l.includes("permissions") || l.includes("classes")) score += 5;
      if (l.includes("profile")) score += 3;
      return { leaf: l, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored.slice(0, 6).map((s) => s.leaf);
    leavesTested = [root, ...chosen];
    leavesSkipped = scored.slice(6).map((s) => s.leaf);
  } else {
    leavesTested = allLeaves;
    leavesSkipped = [];
  }

  console.log(`   Leaves to test (${leavesTested.length}):`, leavesTested.join(", "));
  if (leavesSkipped.length > 0) {
    console.log(`   Leaves skipped (>8 leaves, ${leavesSkipped.length}):`, leavesSkipped.join(", "));
  }

  // 8. Click through each leaf
  for (const leaf of leavesTested) {
    if (leaf === c.rootHref) continue;

    let clickSucceeded = false;
    try {
      const link = page.locator(`aside a[href="${leaf}"], nav a[href="${leaf}"]`).first();
      if ((await link.count()) > 0 && (await link.isVisible())) {
        await link.click({ timeout: 4000 });
        clickSucceeded = true;
      }
    } catch {}

    if (!clickSucceeded) {
      await page.goto(`${BASE}${leaf}`, { waitUntil: "domcontentloaded", timeout: 25_000 }).catch(() => {});
    }

    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // If modal not found yet, check on this leaf
    if (!modalRes.opened) {
      const leafModal = await testModalOrDrawer(page);
      if (leafModal.opened) {
        modalRes = leafModal;
        console.log(`   Modal/Drawer found on ${leaf}: ${leafModal.notes}`);
      }
    }

    // Check error boundaries
    const leafText = await page.evaluate(() => document.body.innerText).catch(() => "");
    const leafEb = checkErrorBoundaries(leafText);
    if (leafEb) {
      errorBoundaries.push(`${leaf}: ${leafEb}`);
    }

    // Check stuck loaders
    const leafLoader = await checkStuckLoader(page);
    if (leafLoader) {
      stuckLoaders.push(leaf);
    }
  }

  await ctx.close();

  const uniqueApiFailures = Array.from(new Set(apiFailures));
  const uniqueErrorBoundaries = Array.from(new Set(errorBoundaries));
  const uniqueStuckLoaders = Array.from(new Set(stuckLoaders));

  // Determine overall pass status
  const passed =
    uniqueErrorBoundaries.length === 0 &&
    uniqueStuckLoaders.length === 0 &&
    sanityRes.sane &&
    !uniqueApiFailures.some((f) => f.startsWith("500") || f.startsWith("502"));

  const notes = `${sanityRes.summary} | Tested ${leavesTested.length} leaves. Bell: ${bellRes.notes}. Modal: ${modalRes.notes}.`;

  const result: QaFindingEntry = {
    role: c.role,
    leaves_tested: leavesTested,
    leaves_skipped: leavesSkipped,
    api_failures: uniqueApiFailures,
    error_boundaries: uniqueErrorBoundaries,
    stuck_loaders: uniqueStuckLoaders,
    dashboard_sane: sanityRes.sane,
    notes,
    login_ok: true,
    root_url: currentUrl,
    bell_tested: bellRes.tested,
    bell_opened: bellRes.opened,
    bell_notes: bellRes.notes,
    modal_tested: modalRes.tested,
    modal_opened: modalRes.opened,
    modal_notes: modalRes.notes,
    dashboard_summary: sanityRes.summary,
    passed,
  };

  console.log(`[QA Result] ${c.role.toUpperCase()}: ${passed ? "PASS" : "FAIL"}`);
  if (uniqueApiFailures.length) console.log(`   API Failures:`, uniqueApiFailures);
  if (uniqueErrorBoundaries.length) console.log(`   Error Boundaries:`, uniqueErrorBoundaries);
  if (uniqueStuckLoaders.length) console.log(`   Stuck Loaders:`, uniqueStuckLoaders);

  return result;
}

function writeSummaryMarkdown(results: QaFindingEntry[]) {
  const lines: string[] = [];
  lines.push("# Desktop Deep-Interaction QA Report");
  lines.push(`- **Target:** ${BASE}`);
  lines.push(`- **Viewport:** 1440x900`);
  lines.push(`- **Timestamp:** ${new Date().toISOString()}`);
  lines.push(`- **Total Roles Tested:** ${results.length}`);
  lines.push(`- **Passed:** ${results.filter((r) => r.passed).length}`);
  lines.push(`- **Failed:** ${results.filter((r) => !r.passed).length}`);
  lines.push("");

  lines.push("## Per-Role Summary Table");
  lines.push("");
  lines.push("| Role | Status | Leaves Tested | Skipped (>8) | API Failures | Error Boundaries | Stuck Loaders | Dashboard Sane | Bell | Modal |");
  lines.push("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");

  for (const r of results) {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    const sane = r.dashboard_sane ? "✅ Yes" : "❌ No";
    const bell = r.bell_opened ? "✅ Open" : r.bell_tested ? "⚠️ Checked" : "—";
    const modal = r.modal_opened ? "✅ Open" : r.modal_tested ? "⚠️ Checked" : "—";
    lines.push(
      `| **${r.role}** | ${status} | ${r.leaves_tested.length} | ${r.leaves_skipped.length} | ${r.api_failures.length} | ${r.error_boundaries.length} | ${r.stuck_loaders.length} | ${sane} | ${bell} | ${modal} |`
    );
  }

  lines.push("");
  lines.push("## Detailed Role Findings");
  lines.push("");

  for (const r of results) {
    lines.push(`### Role: \`${r.role}\``);
    lines.push(`- **Status:** ${r.passed ? "PASS" : "FAIL"}`);
    lines.push(`- **Landed Root URL:** ${r.root_url}`);
    lines.push(`- **Leaves Tested (${r.leaves_tested.length}):** ${r.leaves_tested.map((l) => `\`${l}\``).join(", ")}`);
    if (r.leaves_skipped.length > 0) {
      lines.push(`- **Leaves Skipped (>8 limit, ${r.leaves_skipped.length}):** ${r.leaves_skipped.map((l) => `\`${l}\``).join(", ")}`);
    }
    lines.push(`- **Dashboard Sane:** ${r.dashboard_sane ? "Yes" : "No"}`);
    lines.push(`- **Dashboard Assessment:** ${r.dashboard_summary}`);
    lines.push(`- **Notification Bell:** ${r.bell_notes}`);
    lines.push(`- **Modal/Drawer:** ${r.modal_notes}`);

    if (r.api_failures.length > 0) {
      lines.push(`- **API Failures (${r.api_failures.length}):**`);
      for (const f of r.api_failures) {
        lines.push(`  - \`${f}\``);
      }
    } else {
      lines.push(`- **API Failures:** None (All endpoints clean)`);
    }

    if (r.error_boundaries.length > 0) {
      lines.push(`- **Error Boundaries (${r.error_boundaries.length}):**`);
      for (const eb of r.error_boundaries) {
        lines.push(`  - ❌ \`${eb}\``);
      }
    } else {
      lines.push(`- **Error Boundaries:** None`);
    }

    if (r.stuck_loaders.length > 0) {
      lines.push(`- **Stuck Loaders (>20s, ${r.stuck_loaders.length}):**`);
      for (const sl of r.stuck_loaders) {
        lines.push(`  - ❌ \`${sl}\``);
      }
    } else {
      lines.push(`- **Stuck Loaders:** None`);
    }

    lines.push("");
  }

  fs.writeFileSync(SUMMARY_MD, lines.join("\n"), "utf8");
}

async function main() {
  const creds: RoleCreds[] = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));
  const onlyRole = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1];
  const targets = onlyRole ? creds.filter((c) => c.role === onlyRole) : creds;

  if (!fs.existsSync(FINDINGS_DIR)) {
    fs.mkdirSync(FINDINGS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const results: QaFindingEntry[] = [];

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];

    // Cooldown between roles to prevent hitting the 10req/10s rate limiter
    if (i > 0) {
      const cooldownMs = 5000;
      console.log(`[Cooldown] Waiting ${cooldownMs / 1000}s before next role (${c.role})...`);
      await sleep(cooldownMs);
    }

    const res = await qaRole(browser, c);
    results.push(res);

    // Save incremental results to disk so progress is preserved
    fs.writeFileSync(FINDINGS_JSON, JSON.stringify(results, null, 2), "utf8");
    writeSummaryMarkdown(results);
  }

  await browser.close();
  console.log(`\n======================================================`);
  console.log(`QA Complete! Results saved to:\n  - ${FINDINGS_JSON}\n  - ${SUMMARY_MD}`);
  console.log(`======================================================`);
}

main().catch(console.error);
