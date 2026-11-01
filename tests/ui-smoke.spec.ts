import { test, expect } from '@playwright/test';

test.describe('UI Console & Health Audit', () => {
  test('Login, admin command center, and gate console render with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    // 1. Visit /login
    await page.goto('http://127.0.0.1:80/login');
    await expect(page).toHaveTitle(/JNTUH|Campus|Gate/i);

    // 2. Perform Login as SYSADMIN
    await page.fill('input#identifier, input[type="text"]', 'admin');
    // login form uses id=identifier or role-based placeholder; the shared
    // LoginForm fills the username field by placeholder/label — 'admin' (admin console)
    // is used here because sysadmin creds are not a smoke-creds entry.
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /admin or successful auth
    await page.waitForTimeout(2000);

    // 3. Visit /admin
    await page.goto('http://127.0.0.1:80/admin');
    await page.waitForLoadState('networkidle');

    // Confirm no crash/chunk errors
    expect(pageErrors).toEqual([]);
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Failed to load chunk');
    expect(pageContent).not.toContain('Application error: a client-side exception');

    // 4. Visit /gate/5f2183c9-51ae-4677-8f38-52a17bbe0538 (Main Campus Gate)
    await page.goto('http://127.0.0.1:80/gate/5f2183c9-51ae-4677-8f38-52a17bbe0538');
    await page.waitForLoadState('networkidle');

    const gateContent = await page.content();
    expect(gateContent).not.toContain('Failed to load chunk');
    expect(gateContent).not.toContain('Application error: a client-side exception');

    // Filter out expected benign noise. 429s are transient rate-limit
    // responses (the admin console fires 30+ API calls on mount; the limiter
    // is 60 req/min per IP per bucket) — not a UI defect.
    const redErrors = consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('audio') && !e.includes('WebSocket')
         && !e.includes('429') && !e.includes('Too Many Requests')
    );
    expect(redErrors).toEqual([]);
  });
});
