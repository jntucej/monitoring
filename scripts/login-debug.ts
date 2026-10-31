
import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const bad: string[] = [];
  page.on("response", (res) => { if ([404,403,429,500,501].includes(res.status())) bad.push(res.status() + " " + res.url().replace("https://monitor.ucej.in","")); });
  const res = await page.request.post("https://monitor.ucej.in/api/auth/login", { data: { login: "PARENT", password: "Parent@123" } });
  const body = await res.json();
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(([tok, user]) => {
    sessionStorage.setItem("auth.token", tok);
    localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user, role: user.role, authenticated: true }, version: 0 }));
  }, [body.data.token, body.data.user]);
  await page.goto("https://monitor.ucej.in/parent", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(8000);
  console.log("bad:", JSON.stringify(bad));
  await browser.close();
}
main();
