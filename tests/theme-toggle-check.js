const { chromium } = require("@playwright/test");
const BASE = process.argv[2] || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const p = await browser.newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await p.goto(`${BASE}/study`, { waitUntil: "networkidle" });
  console.log("1. /study opens:", p.url().endsWith("/study") ? "YES" : `NO (${p.url()})`);

  const group = p.locator('[role="radiogroup"][aria-label="Theme selection"]');
  console.log("2. Theme switcher present:", (await group.count()) === 1 ? "YES" : "NO");

  const buttons = group.locator('button[role="radio"]');
  console.log("3. Theme buttons:", await buttons.count());

  // Click Light theme -> html class + aria-checked + localStorage should follow
  await buttons.nth(2).click(); // Sun = Light
  await p.waitForTimeout(400);
  const htmlClass = await p.evaluate(() => document.documentElement.className);
  const stored = await p.evaluate(() => localStorage.getItem("gate-monitor-theme"));
  const lightChecked = await buttons.nth(2).getAttribute("aria-checked");
  console.log("4. After clicking Light -> html class:", JSON.stringify(htmlClass), "| localStorage:", stored, "| aria-checked:", lightChecked);

  // Click Glossy
  await buttons.nth(1).click();
  await p.waitForTimeout(400);
  const htmlClass2 = await p.evaluate(() => document.documentElement.className);
  console.log("5. After clicking Glossy -> html class:", JSON.stringify(htmlClass2));

  // Back to Dark (default)
  await buttons.nth(0).click();
  await p.waitForTimeout(400);
  const htmlClass3 = await p.evaluate(() => document.documentElement.className);
  console.log("6. After clicking Dark -> html class:", JSON.stringify(htmlClass3));

  // Theme persists on a fresh page (reload)
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  const storedAfter = await p.evaluate(() => localStorage.getItem("gate-monitor-theme"));
  const htmlClass4 = await p.evaluate(() => document.documentElement.className);
  console.log("7. After reload -> localStorage:", storedAfter, "| html class:", JSON.stringify(htmlClass4));
  for (let i = 0; i < 3; i++) {
    console.log(`   pill[${i}] aria-checked:`, await buttons.nth(i).getAttribute("aria-checked"));
  }
  const uiStore = await p.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (/ui|store/i.test(k) && localStorage.getItem(k)?.includes("theme")) {
        return { key: k, value: localStorage.getItem(k).slice(0, 200) };
      }
    }
    return null;
  });
  console.log("   zustand persist entry:", uiStore);

  await browser.close();
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
