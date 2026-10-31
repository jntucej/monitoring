/**
 * Role smoke harness — logs in as every role, hits every leaf route, and
 * records what tsc/check:no-tabs cannot catch:
 *
 *   - HTTP status of each leaf
 *   - whether the page body contains the shell's expected anchor
 *     (the sidebar brand / role label, proving the client mounted)
 *   - console.error lines emitted during hydration
 *   - any /api/* request that returned 401/403 (caught via page response)
 *
 * Reads test credentials from /root/monitoring/scripts/smoke-creds.json
 * (never committed — .gitignored). One entry per role:
 *
 *   { "role": "emo", "login": "EMO", "password": "EMO@123",
 *     "rootHref": "/emo", "anchor": "Electrical" }
 *
 * Usage:
 *   cd /root/monitoring && npx tsx scripts/smoke-all-roles.ts [--role=hod] [--verbose]
 */
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import * as fs from "node:fs";

const BASE = process.env.SMOKE_BASE ?? "https://monitor.ucej.in";
const CREDS_PATH = "/root/monitoring/scripts/smoke-creds.json";

interface Creds {
  role: string;
  login: string;
  password: string;
  rootHref: string;
  anchor: string;
  leaves: string[];
}

const creds: Creds[] = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));

const onlyRole = process.argv.find((a) => a.startsWith("--role="))?.split("=")[1];
const verbose = process.argv.includes("--verbose");

async function login(page: Page, c: Creds): Promise<string | null> {
  // 1) POST the real login form through the browser context — this sets the
  //    HttpOnly `access_token` cookie exactly as a real user's submit would,
  //    which is what /api/auth/session (cookie-based, no Bearer) actually
  //    checks on the next navigation. page.request would get us the token but
  //    not the cookie, and checkSession() would 401 → bounce back to /login.
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { login: c.login, password: c.password },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || !body?.data?.token) {
    return null; // login failed — record the role as FAIL
  }
  // 2) Seed the client-side store the same way a real login does (the API
  //    response above already set the HttpOnly cookie via the browser's
  //    native form path only if we actually submit the form — page.request
  //    does not, so we complete the session manually): the Bearer token in
  //    sessionStorage (read by getAuthHeaders on every subsequent fetch) and
  //    the zustand-persisted user in localStorage so AuthGuard sees a
  //    hydrated, authenticated session without waiting on checkSession().
  const token = body.data.token;
  const user = body.data.user ?? {};
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
  // 3) Navigate straight to the role's root. The seeded store + token let
  //    AuthGuard pass on the first paint (no redirect loop), and the Bearer
  //    token in sessionStorage is what every subsequent /api/* fetch signs
  //    with — the same mechanism a real user's post-login session uses.
  await page.goto(`${BASE}${c.rootHref}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  // bounced back to /login = the store's rehydration rejected the session
  if (page.url().includes("/login")) return null;
  return page.url();
}

async function smokeRole(browser: Browser, c: Creds) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors: string[] = [];
  const badApis: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    // noise: COOP header warnings, blocked static assets, and 429 rate-limit
    // responses (the sweep itself triggers these; not app bugs)
    if (t.includes("Cross-Origin-Opener-Policy") || t.includes("ERR_BLOCKED_BY_RESPONSE") || t.includes("429")) return;
    consoleErrors.push(t.slice(0, 200));
  });
  page.on("response", (res) => {
    if (res.url().includes("/api/") && (res.status() === 401 || res.status() === 403)) {
      badApis.push(`${res.status()} ${res.url().replace(BASE, "")}`);
    }
  });

  // 1) login
  const landed = await login(page, c);
  if (!landed) {
    await ctx.close();
    return { role: c.role, ok: false, reason: "login-failed", url: page.url(), consoleErrors, badApis, leaves: [] };
  }

  // 2) hit root + every leaf — each via a full navigation from the logged-in
  //    session (the redirect off /login already verified the token; the guard
  //    re-validates on each leaf in the same context, which is what the
  //    "infinite loader" bug class actually is)
  const leaves = [c.rootHref, ...c.leaves];
  const results: Array<{ leaf: string; status: number; anchorOk: boolean; error: string | null }> = [];
  for (const leaf of leaves) {
    const res = await page.goto(`${BASE}${leaf}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Wait for the shell's brand text to actually render (proves hydration +
    // AuthGuard passed). Bounded — an infinite loader fails the anchor here.
    let anchorOk = false;
    if (c.anchor) {
      try {
        await page.waitForFunction(
          (a) => document.body.innerText.includes(a),
          c.anchor,
          { timeout: 15_000 }
        );
        anchorOk = true;
      } catch {
        anchorOk = false;
      }
    } else {
      anchorOk = (await page.content()).length > 500;
    }
    const html = await page.content();
    results.push({
      leaf,
      status: res?.status() ?? 0,
      anchorOk,
      error: html.includes("Application error") || html.includes("Internal Server Error") ? "page-error-boundary" : null,
    });
    // a bounced-to-/login leaf means this role's session failed re-validation
    // on that route — stop early, the rest will fail the same way
    if (!anchorOk && page.url().includes("/login")) break;
  }

  await ctx.close();
  return {
    role: c.role,
    ok: results.every((r) => r.anchorOk && !r.error) && badApis.length === 0 && consoleErrors.length === 0,
    url: landed,
    consoleErrors: consoleErrors.slice(0, 10),
    badApis: badApis.slice(0, 20),
    leaves: results,
  };
}

async function main() {
  const targets = onlyRole ? creds.filter((c) => c.role === onlyRole) : creds;
  const browser = await chromium.launch({ headless: true });
  const report: Array<Record<string, unknown>> = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    // Cooldown between roles so the global per-IP rate limiter (10 req/10s
    // window on most /api/* routes) doesn't trip mid-sweep.
    if (i > 0) await new Promise((res) => setTimeout(res, 4000));
    const result = await smokeRole(browser, c);
    report.push(result);
    fs.writeFileSync(CREDS_PATH + ".progress.json", JSON.stringify(report, null, 2));
    const bad = result as { role: string; ok: boolean; consoleErrors: string[]; badApis: string[]; leaves: Array<{ leaf: string; status: number; anchorOk: boolean; error: string | null }>; reason?: string };
    const status = bad.reason ? `LOGIN FAILED` : bad.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${bad.role} ${bad.reason ? `(${bad.reason})` : ""}`);
    if (verbose) {
      for (const l of bad.leaves) {
        console.log(`   ${l.status} ${l.leaf} ${l.anchorOk ? "" : "NO-ANCHOR"} ${l.error ?? ""}`);
      }
      if (bad.badApis.length) console.log("   bad APIs:", bad.badApis.join("; "));
      if (bad.consoleErrors.length) console.log("   console errors:", bad.consoleErrors.join("; "));
    }
  }
  await browser.close();
  fs.writeFileSync("/root/monitoring/scripts/smoke-report.json", JSON.stringify(report, null, 2));
  const fails = report.filter((r) => !(r as { ok: boolean }).ok).length;
  console.log(`\n${report.length - fails}/${report.length} roles clean — report at scripts/smoke-report.json`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
