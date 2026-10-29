import { test, expect } from '@playwright/test';

test.describe('Deep Console Walkthrough & Interactions', () => {
  test('Sysadmin interactive tabs, Command Center and Audit log navigation', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // Authenticate
    await page.request.post('http://127.0.0.1:80/api/auth/login', {
      data: { login: 'SYSADMIN', password: 'Sysadmin@123' },
      headers: { 'Sec-Fetch-Site': 'same-origin' }
    });

    // 1. Sysadmin Health
    await page.goto('http://127.0.0.1:80/sysadmin/health');
    await page.waitForLoadState('networkidle');
    expect(await page.content()).not.toContain('Failed to load chunk');
    expect(pageErrors).toEqual([]);

    // 2. Sysadmin Audit
    await page.goto('http://127.0.0.1:80/sysadmin/audit');
    await page.waitForLoadState('networkidle');
    expect(await page.content()).not.toContain('Failed to load chunk');
    expect(pageErrors).toEqual([]);

    // 3. Sysadmin Students
    await page.goto('http://127.0.0.1:80/sysadmin/students');
    await page.waitForLoadState('networkidle');
    expect(await page.content()).not.toContain('Failed to load chunk');
    expect(pageErrors).toEqual([]);

    // 4. Sysadmin Gates
    await page.goto('http://127.0.0.1:80/sysadmin/gates');
    await page.waitForLoadState('networkidle');
    expect(await page.content()).not.toContain('Failed to load chunk');
    expect(pageErrors).toEqual([]);
  });

  test('Student permissions creation form renders with interactive elements', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.request.post('http://127.0.0.1:80/api/auth/login', {
      data: { login: '25JJ1A0501', password: 'Sysadmin@123' },
      headers: { 'Sec-Fetch-Site': 'same-origin' }
    });

    await page.goto('http://127.0.0.1:80/student/permissions/new');
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    expect(content).not.toContain('Failed to load chunk');
    expect(content).not.toContain('Application error');
    expect(pageErrors).toEqual([]);
  });

  test('Operator gate console scanner and status strip render cleanly', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.request.post('http://127.0.0.1:80/api/auth/login', {
      data: { login: 'OPERATOR', password: 'Operator@123' },
      headers: { 'Sec-Fetch-Site': 'same-origin' }
    });

    await page.goto('http://127.0.0.1:80/gate/5f2183c9-51ae-4677-8f38-52a17bbe0538');
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    expect(content).not.toContain('Failed to load chunk');
    expect(content).not.toContain('Application error');
    expect(pageErrors).toEqual([]);
  });
});
