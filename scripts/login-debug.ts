
import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type()==="error") errs.push(m.text().slice(0,100)); });
  const res = await page.request.post("https://monitor.ucej.in/api/auth/login", { data: { login: "OPERATOR", password: "operator123" } });
  const body = await res.json();
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(([tok, user]) => {
    sessionStorage.setItem("auth.token", tok);
    localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user, role: user.role, authenticated: true }, version: 0 }));
  }, [body.data.token, body.data.user]);
  await page.goto("https://monitor.ucej.in/operator/transactions", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(10000);
  console.log("URL:", page.url());
  console.log("errors:", JSON.stringify(errs, null, 2));
  console.log("body text:", await page.evaluate(() => document.body.innerText.slice(0,200)));
  await browser.close();
}
main();
