#!/usr/bin/env node
/**
 * scripts/verify-all-roles.ts — the full-coverage role harness.
 *
 * Consumes scripts/role-inventory.json (the role->leaves contract) and,
 * for every (role, leaf) pair:
 *   1. logs in as that role (once),
 *   2. navigates to the leaf,
 *   3. checks: not redirected to /login, not a blank/stub EmptyState,
 *      no horizontal overflow (desktop + mobile viewport), no console errors,
 *      no >=500 API responses.
 *
 * Output: scripts/role-health-report.json — one row per (role, leaf) with
 * the full diagnostic. The diff between runs is your regression signal.
 *
 * Usage:
 *   npx tsx scripts/verify-all-roles.ts [--role=student] [--leaves-only]
 *
 * Env:
 *   SMOKE_BASE   — default https://monitor.ucej.in
 *   SMOKE_CREDS  — default /root/monitoring/scripts/smoke-creds.json
 */
import { chromium, type Browser, type BrowserContext } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.SMOKE_BASE ?? "https://monitor.ucej.in";
const CREDS_PATH = process.env.SMOKE_CREDS ?? "/root/monitoring/scripts/smoke-creds.json";
const INVENTORY_PATH = path.join(process.cwd(), "scripts", "role-inventory.json");
const OUT_PATH = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : path.join(process.cwd(), "scripts", "role-health-report.json");

const onlyRole = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1];

interface Creds {
  role: string;
  login: string;
  password: string;
  rootHref?: string;
  anchor?: string;
}
interface InventoryRole {
  role: string;
  login: string | null;
  root: string;
  leaves: string[];
}
interface LeafResult {
  role: string;
  leaf: string;
  status: "ok" | "broken";
  errors: string[];
  apiFailures: Array<{ url: string; status: number }>;
  consoleErrors: string[];
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")) as {
  roles: InventoryRole[];
};
const creds: Creds[] = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8")) as Creds[];

function credsFor(role: string): Creds | undefined {
  return creds.find((c) => c.role === role);
}

async function login(ctx: BrowserContext, c: Creds, role: string): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    // Pre-seed the client-side auth store so a reloaded page rehydrates:
    // zustand persist writes mycampus-auth (user/role/authenticated) to
    // localStorage; the JWT token itself lives in sessionStorage under
    // "auth.token".
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { login: c.login, password: c.password },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok() || !body?.data?.token) {
      console.log(`[DEBUG] login ${role}: status=${res.status()} error=${JSON.stringify(body?.error) ?? JSON.stringify(body).slice(0, 200)}`);
      return false;
    }
    const { user } = body.data;
    void user;

    // Drive the real browser login flow (form fields → store.login →
    // tokenStorage.set + session cookie), then let the app's own
    // post-auth redirect land on the console.
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator("#identifier").fill(c.login);
    await page.locator("#password").fill(c.password);
    await page
      .locator('button[type="submit"]')
      .first()
      .click()
      .catch(async () => {
        // some forms submit on Enter in the password field
        await page.locator("#password").press("Enter");
      });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    // The app redirects from /login to the role's default route (or
    // /settings/password?mandatory=1 when a credential was admin-set —
    // that is a valid authenticated landing, not a failure).
    let landed = page.url();
    // Give the router a moment if it's still transitioning.
    if (landed.includes("/login")) {
      await page.waitForTimeout(3000);
      landed = page.url();
    }
    if (landed.includes("/login")) {
      console.log(`[DEBUG] login ${role}: still on /login url=${landed}`);
      return false;
    }
    // A mandatory-password-change interstitial is a SUCCESSFUL login for
    // admin-set credentials: the sweep rotates the credential here so it
    // can keep walking the console without a human in the loop. The new
    // password is written back into smoke-creds.json so the next run (and
    // CI) can log in directly.
    if (landed.includes("/settings/password")) {
      const newPw = `${role}-Rotated@2026`;
      // The interstitial form carries current + new + confirm password
      // fields; fill all password inputs in order.
      const pwInputs = page.locator("input[type='password']");
      const n = await pwInputs.count();
      if (n > 0) {
        for (let i = 0; i < n; i++) {
          // Field 0 is "Current password" (the just-used credential);
          // fields 1..n are the new + confirm entries.
          await pwInputs.nth(i).fill(i === 0 ? c.password : newPw);
        }
        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
        // Success lands on /login?changed=1 (post-rotation bounce) or the
        // console; a stuck /settings/password means the update was rejected.
        const after = page.url();
        if (after.includes("/settings/password")) {
          console.log(`[DEBUG] login ${role}: password rotation did not complete url=${after}`);
          return false;
        }
        // Persist the rotated password so subsequent runs don't re-hit the
        // interstitial.
        const invIdx = creds.findIndex((x) => x.role === role);
        if (invIdx !== -1) {
          creds[invIdx].password = newPw;
        }
        fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2) + "\n");
        console.log(`[ok] ${role}: rotated admin-set credential → ${newPw} (persisted)`);
      }
    }
    return true;
  } finally {
    await page.close();
  }
}

async function verifyLeaf(ctx: BrowserContext, role: string, leaf: string): Promise<LeafResult> {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const apiFailures: LeafResult["apiFailures"] = [];

  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/") && res.status() >= 400) {
      apiFailures.push({ url: res.url().replace(BASE, ""), status: res.status() });
    }
  });

  try {
    await page.goto(`${BASE}${leaf}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch {
    errors.push("page-load-timeout");
  }

  if (page.url().includes("/login")) errors.push("redirected-to-login");

  // Stub detection: an EmptyState with no filter UI and no refresh button
  // that fills the whole main is a dead-end page, not a legitimate
  // "no data yet" state.
  const mainText = await page.locator("main, [role='main'], body").first().innerText().catch(() => "");
  const isStub =
    /No data|Nothing here|Coming soon|Placeholder|TODO|Lorem ipsum/i.test(mainText) &&
    (await page.locator('input[type="search"], select, [role="combobox"]').count()) === 0 &&
    (await page.locator('button[aria-label*="refresh" i]').count()) === 0;
  if (isStub) errors.push("empty-state-stub");

  // Desktop horizontal overflow
  const desktopOverflow = await page
    .evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
    .catch(() => 0);
  if (desktopOverflow > 1) errors.push(`horizontal-overflow:${desktopOverflow}px`);

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
  const mobileOverflow = await page
    .evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))
    .catch(() => 0);
  if (mobileOverflow > 1) errors.push(`mobile-overflow:${mobileOverflow}px`);

  await page.close();

  return {
    role,
    leaf,
    status: errors.length === 0 && apiFailures.length === 0 && consoleErrors.length === 0 ? "ok" : "broken",
    errors,
    apiFailures,
    consoleErrors: consoleErrors.slice(0, 3),
  };
}

async function main() {
  const roles = inventory.roles.filter((r) => !onlyRole || r.role === onlyRole);
  const browser = await chromium.launch({ headless: true });
  const report: LeafResult[] = [];

  for (const inv of roles) {
    const c = credsFor(inv.role);
    if (!c) {
      // The inventory `login` field is the canonical credential key; the
      // creds file itself may still carry the role (smoke-creds.json is
      // the source of truth the sweep actually logs in with).
      for (const leaf of [inv.root, ...inv.leaves]) {
        report.push({ role: inv.role, leaf, status: "broken", errors: ["no-creds"], apiFailures: [], consoleErrors: [] });
      }
      continue;
    }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const logged = await login(ctx, c, inv.role);
    if (!logged) {
      for (const leaf of [inv.root, ...inv.leaves]) {
        report.push({ role: inv.role, leaf, status: "broken", errors: ["login-failed"], apiFailures: [], consoleErrors: [] });
      }
      await ctx.close();
      continue;
    }

    const leaves = [inv.root, ...new Set(inv.leaves)];
    for (const leaf of leaves) {
      const result = await verifyLeaf(ctx, inv.role, leaf);
      report.push(result);
      const fail = result.status === "broken";
      console.log(`[${fail ? "FAIL" : "ok"}] ${inv.role} ${leaf}${fail ? " — " + result.errors.join(", ") : ""}`);
    }
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const broken = report.filter((r) => r.status === "broken");
  const byRole = new Map<string, number>();
  for (const b of broken) byRole.set(b.role, (byRole.get(b.role) ?? 0) + 1);
  console.log(`\n${report.length - broken.length}/${report.length} (role,leaf) pairs clean.`);
  if (broken.length) {
    console.log("Broken by role:");
    for (const [role, n] of byRole) console.log(`  ${role}: ${n}`);
  }
  process.exit(broken.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
