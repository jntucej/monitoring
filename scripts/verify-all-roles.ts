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
const creds: Creds[] = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));

function credsFor(role: string): Creds | undefined {
  return creds.find((c) => c.role === role);
}

async function login(ctx: BrowserContext, c: Creds): Promise<boolean> {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { login: c.login, password: c.password },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok() || !body?.data?.token) return false;
    const { token, user } = body.data;
    await page.evaluate(
      ([t, u]) => {
        sessionStorage.setItem("auth.token", t);
        localStorage.setItem(
          "mycampus-auth",
          JSON.stringify({ state: { user: u, role: u.role, authenticated: true }, version: 0 })
        );
      },
      [token, user ?? {}] as const
    );
    await page.goto(`${BASE}${c.rootHref ?? "/"}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    return !page.url().includes("/login");
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
      for (const leaf of [inv.root, ...inv.leaves]) {
        report.push({ role: inv.role, leaf, status: "broken", errors: ["no-creds"], apiFailures: [], consoleErrors: [] });
      }
      continue;
    }

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const logged = await login(ctx, c);
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
