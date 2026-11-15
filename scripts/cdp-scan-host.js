// Launch headless Chromium with a storage-state seed injected, navigate to the
// console, and KEEP IT OPEN with a remote DevTools port so `impeccable detect
// --cdp <port>` can scan the authenticated page. Exits when run with --exit.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const role = process.argv[2] || 'operator';
const url = process.argv[3] || `https://monitor.ucej.in/${role}`;
const cdpPort = process.argv[4] || '9222';
const seedPath = process.argv[5] || `/opt/monitoring/compose/.swarm-parallel/${role}/.swarm/${role}-storage.json`;

(async () => {
  const ss = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${cdpPort}`],
  });
  const ctx = await browser.newContext({
    baseURL: 'https://monitor.ucej.in',
    storageState: ss,
    viewport: { width: 1280, height: 900 },
  });
  // Seed storage unconditionally + reload so AuthGuard sees a live session.
  const ls = [];
  for (const o of ss.origins) for (const k of (o.localStorage || [])) ls.push([k.name, k.value]);
  const ssv = [];
  for (const o of ss.origins) for (const k of (o.sessionStorage || [])) ssv.push([k.name, k.value]);
  await ctx.addInitScript((d) => {
    (function () {
      try {
        for (const [n, v] of d.ss) sessionStorage.setItem(n, v);
        for (const [n, v] of d.ls) localStorage.setItem(n, v);
      } catch (e) {}
    })();
  }, { ss: ssv, ls: ls });
  const page = await ctx.newPage();
  await page.goto('https://monitor.ucej.in/login', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const landed = page.url();
  console.log(`ROLE=${role} LANDED=${landed} CDP_PORT=${cdpPort}`);
  if (process.argv.includes('--exit')) { await browser.close(); return; }
  // Keep the browser alive so `impeccable detect --cdp` can attach.
  console.log('BROWSER-READY (attach with: impeccable detect --cdp ' + cdpPort + ' --target "' + landed + '")');
  // Hold open until SIGTERM/kill.
  await new Promise((resolve) => {
    process.on('SIGTERM', () => { browser.close().then(resolve); });
    process.on('SIGINT', () => { browser.close().then(resolve); });
  });
})();
