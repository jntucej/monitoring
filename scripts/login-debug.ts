
import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  const res = await page.request.post("https://monitor.ucej.in/api/auth/login", { data: { login: "EMO", password: "EMO@123" } });
  const body = await res.json();
  await page.evaluate(([tok, user]) => {
    sessionStorage.setItem("auth.token", tok);
    localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user, role: user.role, authenticated: true }, version: 0 }));
  }, [body.data.token, body.data.user]);
  await page.goto("https://monitor.ucej.in/emo", { waitUntil: "domcontentloaded", timeout: 30000 });
  // wait for the sidebar brand to render
  try {
    await page.waitForFunction(() => document.body.innerText.includes("EMO"), null, { timeout: 20000 });
    console.log("EMO anchor: FOUND");
  } catch {
    console.log("EMO anchor: NOT FOUND after 20s");
    console.log("text:", await page.evaluate(() => document.body.innerText.slice(0,300)));
  }
  await browser.close();
}
main();
