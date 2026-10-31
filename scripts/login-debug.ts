
import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const res = await page.request.post("https://monitor.ucej.in/api/auth/login", { data: { login: "admin", password: "Admin@123" } });
  const body = await res.json();
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(([tok, user]) => {
    sessionStorage.setItem("auth.token", tok);
    localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user, role: user.role, authenticated: true }, version: 0 }));
  }, [body.data.token, body.data.user]);
  await page.goto("https://monitor.ucej.in/admin/overview", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(8000);
  const text = await page.evaluate(() => document.body.innerText.slice(0,400));
  console.log("admin overview text:", JSON.stringify(text));
  await browser.close();
}
main();
