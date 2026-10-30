import { test, expect } from '@playwright/test';

test('Sysadmin students page renders infographics and table correctly', async ({ page }) => {
  // 1. Login via UI so localStorage and session state hydrate properly
  await page.goto('http://127.0.0.1:80/login');
  await page.fill('input#identifier, input[name="login"]', 'SYSADMIN');
  await page.fill('input#password', 'Sysadmin@123');
  await page.click('button[type="submit"]');

  // Wait for redirect to /sysadmin
  await page.waitForURL('**/sysadmin**');

  // 2. Navigate to /sysadmin/students
  await page.goto('http://127.0.0.1:80/sysadmin/students');
  await page.waitForLoadState('networkidle');

  // 3. Verify Infographics
  await expect(page.locator('text=Total Students').first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Largest Branch').first()).toBeVisible();
  await expect(page.locator('text=Course (B.Tech / M.Tech)').first()).toBeVisible();

  // Verify Largest branch card contains CSE and students count
  const largestBranchCard = page.locator('div:has-text("Largest Branch")').filter({ hasText: 'students' }).first();
  await expect(largestBranchCard).toContainText('CSE');
  await expect(largestBranchCard).toContainText('311 students');

  // Verify Table headers contain Course and Branch
  await expect(page.locator('th:has-text("Course")').first()).toBeVisible();
  await expect(page.locator('th:has-text("Branch")').first()).toBeVisible();
});
