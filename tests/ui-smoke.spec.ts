import { test, expect } from '@playwright/test';

test.describe('UI Console & Health Audit', () => {
  test('Login, sysadmin command center, and gate console render with zero console errors', async ({ page }) => {
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
    await page.fill('input#identifier, input[type="text"]', 'SYSADMIN');
    await page.fill('input[type="password"]', 'Sysadmin@123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /sysadmin or successful auth
    await page.waitForTimeout(2000);

    // 3. Visit /sysadmin
    await page.goto('http://127.0.0.1:80/sysadmin');
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

    // Filter out expected benign noise (e.g., favicon 404 or audio autoplay policy) if any
    const redErrors = consoleErrors.filter(
      e => !e.includes('favicon') && !e.includes('audio') && !e.includes('WebSocket')
    );
    expect(redErrors).toEqual([]);
  });
});
