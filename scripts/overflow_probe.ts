import { chromium } from "playwright";
// Mobile + desktop overflow inspection for the changed student pages.
// Measures document horizontal overflow (scrollWidth > clientWidth) and any
// element whose rendered width exceeds its container — the "inspect layout"
// signal. Run from repo root: npx tsx scripts/overflow_probe.ts
async function main(){
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  // login as the sakuga girl (she has the home console + reviews)
  await page.goto("https://monitor.ucej.in/login", { waitUntil: "networkidle" });
  await page.fill("#identifier", "25JJ1D5810");
  await page.fill("#password", "Girl@Demo123");
  await page.click("button:has-text('Sign In')");
  await page.waitForURL(/\/student/, { timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(4000);

  const routes = ["/student", "/student/passes", "/student/mess/reviews", "/student/profile"];
  const widths = [375, 768, 1024];
  const report: Record<number, Record<string, { docScrollW: number; docClientW: number; hOverflow: boolean; topOverflows: { tag: string; cls: string; w: number }[] }>> = {};
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    report[w] = {};
    for (const r of routes) {
      await page.goto("https://monitor.ucej.in" + r, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => {
        const de = document.documentElement;
        const overflows = [];
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el);
          if (cs.overflowX === 'hidden' || cs.overflowX === 'auto') continue;
          // flag elements wider than the viewport that would cause sideways scroll
          const rect = el.getBoundingClientRect();
          if (rect.width > de.clientWidth + 1 && rect.width > 0 && el.children.length > 0) {
            overflows.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,40), w: Math.round(rect.width) });
          }
        }
        return {
          docScrollW: de.scrollWidth,
          docClientW: de.clientWidth,
          hOverflow: de.scrollWidth > de.clientWidth + 2,
          topOverflows: overflows.slice(0, 5),
        };
      });
      report[w][r] = info;
    }
  }
  console.log(JSON.stringify(report, null, 2));
  await b.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
