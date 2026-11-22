import { chromium } from "playwright";
import * as fs from "fs";

const BASE = "https://monitor.ucej.in";
const CREDS = JSON.parse(fs.readFileSync("/root/monitoring/scripts/smoke-creds.json", "utf8"));

async function probe() {
  const c = CREDS.find((x: any) => x.role === "operator");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { login: c.login, password: c.password },
  });
  const body = await res.json().catch(() => ({}));
  const token = body.data.token;
  const user = body.data.user ?? {};
  await page.evaluate(([token, user]) => {
    sessionStorage.setItem("auth.token", token);
    localStorage.setItem(
      "mycampus-auth",
      JSON.stringify({
        state: { user, role: user.role, authenticated: true },
        version: 0,
      })
    );
  }, [token, user] as const);

  await page.goto(`${BASE}/operator/transactions`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("On /operator/transactions, URL:", page.url());

  const bell = await page.$('button[aria-label*="Notification"], button:has(svg.lucide-bell)');
  console.log("Found bell button:", !!bell);
  if (bell) {
    await bell.click();
    await page.waitForTimeout(1000);
    const bellText = await page.evaluate(() => document.body.innerText);
    console.log("Bell dropdown opened:", bellText.includes("Notifications") || bellText.includes("No notifications"));
  }

  const mainText = await page.$eval("main", (m) => m.innerText.slice(0, 500)).catch(() => "no main");
  console.log("Main text:\n", mainText);

  // Check sidebar links
  const links = await page.$$eval("aside a, nav a", (els) =>
    els.map((el) => ({ href: (el as HTMLAnchorElement).href, text: el.textContent?.trim() }))
  );
  console.log("Sidebar links on /operator/transactions:", links);

  await browser.close();
}

probe().catch(console.error);
