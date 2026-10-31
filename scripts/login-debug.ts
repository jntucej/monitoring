
import { chromium } from "playwright";
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const notFound: string[] = [];
  page.on("response", (res) => { if (res.status() === 404) notFound.push(res.url()); });
  const res = await page.request.post("https://monitor.ucej.in/api/auth/login", { data: { login: "MESS_INCHARGE", password: "MessIncharge@123" } });
  const body = await res.json();
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(([tok, user]) => {
    sessionStorage.setItem("auth.token", tok);
    localStorage.setItem("mycampus-auth", JSON.stringify({ state: { user, role: user.role, authenticated: true }, version: 0 }));
  }, [body.data.token, body.data.user]);
  await page.goto("https://monitor.ucej.in/mess", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(6000);
  console.log("404s:", JSON.stringify([...new Set(notFound)]));
  await browser.close();
}
main();
