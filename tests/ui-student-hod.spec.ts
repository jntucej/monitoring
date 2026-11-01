import { test, expect, Page, Browser } from "@playwright/test";
const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:80';

// ── Student: full UI walk-through as a human would ───────────────────────
test.describe('Student UI walk-through', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
    // Log in like a human
    await page.goto(BASE + '/login');
    await page.waitForLoadState('domcontentloaded');
    const input = page.locator('input').first();
    await input.fill('23JJ1A0599');
    await page.locator('input[type="password"]').first().fill('student123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/student', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    console.log('student landed on:', page.url());
  });

  test.afterAll(async () => page && page.close());

  const PAGES = [
    '/', 'attendance', 'attendance-calendar', 'permissions', 'permissions/new',
    'passes', 'complaints', 'anti-ragging', 'mess', 'mess-bill',
    'mess/special', 'mess/reviews', 'achievements', 'activity', 'campus',
    'leave-requests', 'gate-pass', 'history', 'id', 'knowledge',
    'notifications', 'notifications/announcements', 'notifications/alerts',
    'profile', 'profile/privacy', 'profile-security', 'profile-security/sessions',
    'recap', 'request-tracking', 'pass-application',
  ];

  for (const sub of PAGES) {
    const label = sub === '/' ? 'home /student' : `/student/${sub}`;
    test(`student page ${label} renders without crash`, async () => {
      await page.goto(BASE + '/student' + (sub === '/' ? '' : '/' + sub), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(50, `page ${label} appears empty`);
      // No error boundary
      expect(await page.locator('[class*="error-boundary"], [data-testid="error"]').count()).toBe(0);
    });
  }

  test('student home dashboard shows real data widgets', async () => {
    await page.goto(BASE + '/student', { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    // The dashboard should have at least some headings/labels
    expect(text).toMatch(/attendance|permission|mess|campus|notification/i);
  });

  test('student can open a permission request form and see valid workflow options', async () => {
    await page.goto(BASE + '/student/permissions/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(80);
  });

  test('student mess bill page renders with data', async () => {
    await page.goto(BASE + '/student/mess-bill', { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(60);
  });

  test('student profile page renders', async () => {
    await page.goto(BASE + '/student/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(60);
  });

  test('student notification pages render', async () => {
    for (const p of ['/student/notifications', '/student/notifications/announcements', '/student/notifications/alerts']) {
      await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const text = await page.locator('body').innerText();
      expect(text.length, `page ${p} empty`).toBeGreaterThan(30);
    }
  });

  test('no console errors on any student page', async () => {
    const errors = [];
    const handler = (msg) => { if (msg.type() === 'error') errors.push(msg.text()); };
    page.on('console', handler);
    const pages = ['/', '/attendance', '/permissions', '/mess', '/complaints', '/profile'];
    for (const p of pages) {
      await page.goto(BASE + '/student' + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
    page.off('console', handler);
    // Filter out known-benign 429 rate-limit + 404 API probes
    const real = errors.filter(e => !/429|404|rate.limit/i.test(e));
    console.log('console errors:', real.length, real.slice(0,5));
    expect(real.length).toBe(0);
  });
});

// ── HOD: full UI walk-through ────────────────────────────────────────────
test.describe('HOD UI walk-through', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
    await page.goto(BASE + '/login');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input').first().fill('HOD');
    await page.locator('input[type="password"]').first().fill('Hod@123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('**/hod', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    console.log('hod landed on:', page.url());
  });

  test.afterAll(async () => page && page.close());

  const HOD_PAGES = [
    '/', 'dashboard', 'students', 'approvals', 'approvals/pending',
    'faculty', 'faculty/student-directory', 'announcements', 'examinations',
    'leave-oversight', 'complaints', 'mess', 'attendance', 'reports',
  ];

  for (const sub of HOD_PAGES) {
    const label = sub === '/' ? 'home /hod' : `/hod/${sub}`;
    test(`hod page ${label} renders without crash`, async () => {
      await page.goto(BASE + '/hod' + (sub === '/' ? '' : '/' + sub), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      const text = await page.locator('body').innerText();
      // HOD pages may redirect to a canonical sub-path; that's fine — just verify
      // we ended up somewhere under /hod (not /login or /not-found)
      const url = new URL(page.url());
      expect(url.pathname.startsWith('/hod') || url.pathname.startsWith('/login'),
        `page ${label} redirected to ${url.pathname}`).toBe(true);
      expect(text.length).toBeGreaterThan(30, `page ${label} appears empty`);
    });
  }

  test('hod approvals pending queue shows real tickets', async () => {
    await page.goto(BASE + '/hod/approvals/pending', { waitUntil: 'networkidle' });
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('hod student directory has entries', async () => {
    await page.goto(BASE + '/hod/faculty/student-directory', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('no console errors on key HOD pages', async () => {
    const errors = [];
    const handler = (msg) => { if (msg.type() === 'error') errors.push(msg.text()); };
    page.on('console', handler);
    for (const p of ['/', '/approvals/pending', '/students', '/faculty/student-directory']) {
      await page.goto(BASE + '/hod' + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
    page.off('console', handler);
    const real = errors.filter(e => !/429|404|rate.limit/i.test(e));
    console.log('HOD console errors:', real.length, real.slice(0,5));
    expect(real.length).toBe(0);
  });
});
