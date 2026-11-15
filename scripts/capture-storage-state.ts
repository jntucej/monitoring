// Capture a Playwright storageState for the student role (mirror of the
// operator seed) so the ux-swarm init-script can seed auth before the
// AuthGuard fires. Run: npx tsx scripts/capture-storage-state.ts student
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const role = process.argv[2] || "student";
const BASE = "https://monitor.ucej.in";
const creds = JSON.parse(
  fs.readFileSync("/root/monitoring/scripts/smoke-creds.json", "utf8")
) as { role: string; login: string; password: string }[];
const cred = creds.find((c) => c.role === role);
if (!cred) throw new Error(`no creds for role ${role}`);

// student uses /login?role=student; operator uses /login/operator
const loginPath =
  role === "operator" ? "/login/operator" : role === "supervisor" ? "/login/supervisor" : `/login?role=${role}`;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();

  await page.goto(loginPath, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  await page.locator('input[type="text"], input[type="email"]').first().fill(cred.login).catch(() => {});
  await page.locator('input[type="password"]').first().fill(cred.password);
  await page.locator('button[type="submit"]').first().click();

  // wait to reach the role's root (or stay if no redirect)
  await page.waitForTimeout(6000);
  const url = page.url();
  console.log("landed:", url);

  // The guard redirects on cold load if localStorage `mycampus-auth.authenticated`
  // is false. After a successful login the store rehydrates and flips it to true.
  // Wait for that before capturing, else the seed carries authenticated:false and
  // every cold-context agent bounces to /login before checkSession() can fix it.
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem("mycampus-auth");
      if (!raw) return false;
      try {
        const j = JSON.parse(raw);
        const s = j.state ?? j;
        return s.authenticated === true && !!(s.token || s.user);
      } catch {
        return false;
      }
    },
    { timeout: 20000 }
  ).catch(() => console.log("WARN: mycampus-auth.authenticated never became true before capture"));
  await page.waitForTimeout(1500);

  // MFA gate? If we're on an MFA screen, report it.
  if (url.includes("mfa") || url.includes("two-factor") || /verify/i.test(await page.evaluate(() => document.body.innerText.slice(0, 200)))) {
    console.log("MFA gate detected — student seed requires a TOTP code; cannot capture autonomously.");
    await browser.close();
    process.exit(2);
  }

  // storageState carries cookies + origins (localStorage + sessionStorage).
  // Playwright's native shape already nests sessionStorage under origins,
  // which the patched agents.py init-script reads.
  const storageState = await context.storageState();

  // The student app splits auth across three stores:
  //   mycampus-auth (localStorage): user, role, authenticated  (no token)
  //   auth.token / auth.refresh (sessionStorage): the actual JWT
  //   access_token (httpOnly cookie)
  // Playwright's storageState() sometimes omits sessionStorage for a freshly
  // created context, so the seed ends up ss:0 and the cold-context agent's
  // first checkSession() has no in-memory token and races the hydration.
  // Force-capture the sessionStorage token keys and merge them into the seed
  // so the init-script's sessionStorage branch always fires.
  const sessionStorageSeed = await page.evaluate(() => {
    const out: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i)!;
      out.push({ name: k, value: window.sessionStorage.getItem(k)! });
    }
    return out;
  });
  console.log("sessionStorage keys:", sessionStorageSeed.map((k) => k.name));
  if (storageState.origins?.length) {
    // Playwright's StorageState origin type only declares localStorage; the
    // runtime object also carries sessionStorage, so cast to add the keys.
    const origin = storageState.origins[0] as {
      origin: string;
      localStorage: Array<{ name: string; value: string }>;
      sessionStorage?: Array<{ name: string; value: string }>;
    };
    origin.sessionStorage = sessionStorageSeed;
  }

  const out = {
    ...storageState,
    _captured: new Date().toISOString(),
    _role: role,
  };

  const dir = path.join(process.cwd(), `.swarm-parallel/${role}/.swarm`);
  fs.mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, `${role}-storage.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log("wrote", outFile);
  console.log("origins:", storageState.origins?.map((o: any) => ({ origin: o.origin, ls: (o.localStorage ?? []).length, ss: (o.sessionStorage ?? []).length })));

  // Mirror the operator config (same local OmniRoute Agnes model + JCode key).
  const cfg = path.join(dir, "config.json");
  const opCfg = fs.existsSync(".swarm-parallel/operator/.swarm/config.json")
    ? JSON.parse(fs.readFileSync(".swarm-parallel/operator/.swarm/config.json", "utf8"))
    : { provider: "openai", model: "openai/agnes/agnes-3.0-flash", api_key: "sk-local" };
  fs.writeFileSync(cfg, JSON.stringify(opCfg, null, 1));
  await browser.close();
})();
