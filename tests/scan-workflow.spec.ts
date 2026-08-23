import { test, expect } from '@playwright/test';

test.describe('Operator Scan Verification Workflows', () => {
  test('Operator login and scan verification of student with active exit pass', async ({ page }) => {
    // 1. Visit operator login
    await page.goto('/login/operator');
    await expect(page.locator('text=Gate Operator Portal')).toBeVisible();

    // 2. Fill in Employee ID & PIN
    await page.fill('input[placeholder="Enter your identifier"]', 'OP-001');
    await page.fill('input[placeholder="Enter password or PIN"]', '12345678');

    // 3. Click Login
    await page.click('button[type="submit"]');

    // 4. Verify redirections to the gate screen
    await expect(page).toHaveURL(/\/gate\/1/);
    await expect(page.locator('text=Gate 1 (Main Gate)')).toBeVisible();

    // 5. Select Manual Enter mode
    const manualBtn = page.locator('button:has-text("Manual Enter")');
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    // 6. Enter roll number for student with approved Home Out pass
    await page.fill('input[placeholder="e.g. 24JJ1A0501"]', '25JJ1A0503');
    await page.click('button:has-text("Verify Roll Number")');

    // 7. Verify Entry Details load student profile and permissions card
    await expect(page.locator('text=Swathi Singh')).toBeVisible();
    await expect(page.locator('text=Approved Exit Passes (1)')).toBeVisible();
    await expect(page.locator('text=Home Out').first()).toBeVisible();

    // 8. Confirm exit
    const exitBtn = page.locator('button:has-text("Home Out")');
    await expect(exitBtn).toBeVisible();
    await expect(exitBtn).not.toBeDisabled();
    await exitBtn.click();

    // 9. Verify success flash state
    await expect(page.locator('text=Movement Recorded Successfully')).toBeVisible();
  });
});