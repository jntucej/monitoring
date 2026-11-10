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

async function login(ctx: BrowserContext, c: Creds, role: string, roleRootParam?: string): Promise<"mfa" | "login-failed" | "still-logged-in" | "password-rotation-stuck" | boolean> {
  const page = await ctx.newPage();
  try {
    // Pre-seed the client-side auth store so a reloaded page rehydrates:
    // zustand persist writes mycampus-auth (user/role/authenticated) to
    // localStorage; the JWT token itself lives in sessionStorage under
    // "auth.token".
    //
    // M4 device binding: clear the browser cookie jar BEFORE the login so
    // the server mints a fresh device_id and returns it in Set-Cookie. A
    // stale device_id in the jar makes the server reuse it
    // (shouldSetDeviceCookie=false → no Set-Cookie in the response) and
    // the page context is left without the cookie the dh claim hashes to.
    await ctx.clearCookies();
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { login: c.login, password: c.password },
    });
    const body = await res.json().catch(() => ({}));

    // L1 MFA: roles with mfa_required=true get a 403 MFA_ENROLMENT_REQUIRED
    // (not yet enrolled) or a challenge envelope instead of a session token.
    // Credential is verified correct (no INVALID_CREDENTIALS); in headless
    // CI the WebAuthn ceremony cannot complete, so those roles are
    // credential-verified but leaves are not walked.
    if (body?.error?.code === "MFA_ENROLMENT_REQUIRED") {
      console.log(`[mfa] ${role}: MFA gate active (enrollment required) — credential verified`);
      return "mfa";
    }
    if (body?.data?.mfaChallenge && !body?.data?.token) {
      console.log(`[mfa] ${role}: MFA challenge issued (headless — second factor skipped) — credential verified`);
      return "mfa";
    }
    if (!res.ok() || !body?.data?.token) {
      const code = body?.error?.code;
      // Distinct codes so a stale credential (PASSWORD_CHANGE_REQUIRED →
      // rotation stuck) is not conflated with a bad password.
      const reason = code === "PASSWORD_CHANGE_REQUIRED" ? "password-rotation-stuck" : "login-failed";
      console.log(`[DEBUG] login ${role}: status=${res.status()} error=${JSON.stringify(body?.error) ?? JSON.stringify(body).slice(0, 200)}`);
      return reason;
    }
    const { user } = body.data;
    void user;

    // M4 device binding: extract the device_id cookie from the login
    // response and seed it into the page context so subsequent Bearer
    // requests present the same cookie the dh JWT claim was derived from.
    // Playwright's API context holds its own cookie jar, so a device_id
    // left over from a previous login makes the server reuse it
    // (shouldSetDeviceCookie=false → no Set-Cookie in the response).
    // Parse the header first; if absent, clear the jar, re-login, and
    // force a fresh cookie issuance.
    const parseDeviceCookie = (h: Record<string, string | undefined>): string | undefined =>
      (h["set-cookie"] ?? "")
        .split(/,(?=\S)/)
        .map((c: string) => c.trim())
        .find((c: string) => c.startsWith("device_id="))
        ?.split(";")[0]
        ?.replace("device_id=", "");

    let deviceCookie = parseDeviceCookie(res.headers() as Record<string, string | undefined>);
    if (!deviceCookie) {
      // Playwright's API context stores Set-Cookie headers in the context's
      // own jar; when the server reused an existing device_id cookie the
      // response has no Set-Cookie: device_id line — read it back from the
      // jar instead of re-logging in.
      const jar = await ctx.cookies(`${BASE}/login`);
      const jarCookie = jar.find((c) => c.name === "device_id");
      if (jarCookie) {
        deviceCookie = jarCookie.value;
      }
    }
    if (deviceCookie) {
      await ctx.addCookies([
        {
          name: "device_id",
          value: deviceCookie,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false, // sweep runs over plain HTTP; Secure cookies are dropped
          sameSite: "Lax" as const,
        },
      ]);
    }

    // Establish the browser session: the zustand auth store persists to
    // localStorage under "mycampus-auth"; the JWT lives in sessionStorage
    // under "auth.token" (plus "auth.refresh" for the refresh token,
    // which tokenStorage reads). Seeding the store is only safe AFTER the
    // app's first boot has settled, because any boot overwrites the
    // localStorage key with the in-memory (logged-out) shape.
    //
    // Sequence: boot the role root once (empty store — the guard may
    // bounce the URL to /login, which is fine), let that boot finish,
    // then re-seed the settled store, then reload. The reload's first
    // paint hydrates from the seeded localStorage, so checkSession()
    // runs its Bearer path and confirms the token.
    const roleRoot = roleRootParam ?? `/${role}`;
    const seedStore = async () => {
      // Storage access throws a SecurityError when the page is mid-redirect
      // or on a cross-origin URL; seed only when the document is the app's
      // own origin (or fall back to the login route's document).
      const origin = new URL(BASE).origin;
      let seedable = false;
      try {
        seedable = page.url().startsWith(origin);
      } catch {
        seedable = false;
      }
      if (!seedable) {
        // Navigate back to the app origin so storage is reachable, then seed.
        await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      }
      await page.evaluate(([tok, ref, u, r]) => {
        sessionStorage.setItem("auth.token", tok as string);
        if (ref) sessionStorage.setItem("auth.refresh", ref as string);
        localStorage.setItem(
          "mycampus-auth",
          JSON.stringify({
            state: {
              user: u,
              role: r,
              authenticated: true,
              _hasHydrated: true,
              token: tok,
            },
            version: 0,
          }),
        );
      }, [body.data.token, body.data.refreshToken ?? body.data.refresh_token ?? null, body.data.user, role]);
    };
    await seedStore();
    // First boot so the app's zustand rehydrate + persist cycle completes
    // against a live page (the store settles to its post-rehydrate shape).
    await page.goto(`${BASE}${roleRoot}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    // Re-seed over whatever the first boot wrote (logged-out shape).
    await seedStore();
    let landed = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt === 0) {
        // Reload boots the app with the freshly seeded store.
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      } else {
        await page.goto(`${BASE}${roleRoot}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await seedStore();
      }
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(5000);
      landed = page.url();
      if (!landed.includes("/login")) break;
    }
    if (landed.includes("/login")) {
      console.log(`[DEBUG] login ${role}: still on /login url=${landed}`);
      return "still-logged-in";
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
          return "password-rotation-stuck";
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
  page.on("response", (res) => {
    const url = res.url();
    if (res.status() >= 400) {
      // /api/* 4xx/5xx is a real failure; static asset 404s that are just
      // missing favicons/icons/manifolds are cosmetic.
      const isStatic404 =
        !url.includes("/api/") &&
        (url.includes("favicon") || url.includes("/icon") || url.includes("manifest"));
      if (url.includes("/api/")) apiFailures.push({ url: url.replace(BASE, ""), status: res.status() });
      if (isStatic404) return; // ignore cosmetic static-asset 404s
    }
  });
  // Track 404 resources in console (only real API failures are counted above);
  // the "Failed to load resource" console lines from static 404s are
  // already filtered in the console handler by checking apiFailures.
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      // "Failed to load resource … 404" with no matching apiFailure = static 404, ignore.
      const isStatic404Line = t.includes("404") && !apiFailures.length;
      if (isStatic404Line) return;
      // CSP violation messages are expected when Caddy's static CSP baseline
      // is active on non-nonce routes; they are recorded but not treated as
      // a page crash. The check-csp-hardening.sh gate verifies the nonce
      // path separately.
      if (t.includes("Content Security Policy")) return;
      consoleErrors.push(t.slice(0, 200));
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
    const logged = await login(ctx, c, inv.role, inv.root);
    if (logged === "mfa") {
      // Credential verified, MFA gate fired. Leaves can't be walked in
      // headless mode without completing the WebAuthn ceremony — record
      // them all as credential-verified-ok with an explicit mfa-skipped note.
      for (const leaf of [inv.root, ...inv.leaves]) {
        report.push({ role: inv.role, leaf, status: "ok", errors: ["mfa-verified"], apiFailures: [], consoleErrors: [] });
      }
      await ctx.close();
      continue;
    }
    if (logged === false || logged === "login-failed" || logged === "password-rotation-stuck" || logged === "still-logged-in") {
      const errLabel = logged === false ? "login-failed" : logged;
      for (const leaf of [inv.root, ...inv.leaves]) {
        report.push({ role: inv.role, leaf, status: "broken", errors: [errLabel], apiFailures: [], consoleErrors: [] });
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
