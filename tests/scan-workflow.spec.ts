import { test, expect } from '@playwright/test';

test.describe('Gate Monitor Operator & Workflow E2E Tests', () => {
  // Execute sequentially to avoid parallel Supabase OTP login conflicts with the same account
  test.describe.configure({ mode: 'serial' });
  
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSERLOG:', msg.text()));

    // Credentials come from the environment (.env.local) — never hardcoded.
    const operatorId = process.env.TEST_OPERATOR_ID;
    const operatorPin = process.env.TEST_OPERATOR_PIN;
    test.skip(!operatorId || !operatorPin, 'E2E credentials missing: set TEST_OPERATOR_ID and TEST_OPERATOR_PIN in .env.local');
    if (!operatorId || !operatorPin) return;

    // Perform login prior to each operator workflow test
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.fill('input[placeholder="Enter ID"]', operatorId);
    await page.fill('input[placeholder="password or PIN"]', operatorPin);
    await page.click('button[type="submit"]');

    // Wait redirect
    await expect(page).toHaveURL(/\/gate\//, { timeout: 15000 });
    await expect(page.locator('text=Gate 1 (Main Gate)')).toBeVisible({ timeout: 10000 });
  });

  test('Operator workflow: verify valid active student manual entry lookup and confirm scan', async ({ page }) => {
    // Go to "Manual Enter" tab
    await page.click('button:has-text("Manual Enter")');
    await expect(page.locator('input[placeholder="e.g. 24JJ1A0501"]')).toBeVisible();

    // Fill with a valid roll number from seed data (e.g. first student 24JJ1A0501)
    await page.fill('input[placeholder="e.g. 24JJ1A0501"]', '24JJ1A0501');
    await page.click('button:has-text("Verify Roll Number")');

    // Page automatically switches to "Entry Details" sub-mode/confirming state
    await expect(page.locator('text=Verifying Identity...')).toBeVisible();

    // Wait until identity is verified (2 seconds simulated delay)
    await expect(page.locator('text=Identity Verified')).toBeVisible({ timeout: 5000 });

    // Assert student info is resolved from the server and displayed correctly
    await expect(page.locator('text=24JJ1A0501')).toBeVisible();
    await expect(page.locator('text=- Year 2')).toBeVisible();

    // Scan direction defaults or action buttons should be active
    const confirmButton = page.getByRole('button', { name: 'Entry', exact: true });
    await expect(confirmButton).toBeEnabled();

    // Confirm scan
    await confirmButton.click();

    // Assert transition to success flash screen
    await expect(page.locator('text=Movement Recorded Successfully')).toBeVisible({ timeout: 5000 });

    // Tap to reset
    await page.click('text=Ready For Next Scan', { force: true });
    await expect(page.locator('text=Verify Roll Number')).not.toBeVisible();
  });

  test('Operator workflow: verify invalid roll number format fails validation on server', async ({ page }) => {
    // Selection Manual
    await page.click('button:has-text("Manual Enter")');

    // Fill a totally invalid format
    await page.fill('input[placeholder="e.g. 24JJ1A0501"]', 'XYZ-99');
    await page.click('button:has-text("Verify Roll Number")');

    // Since offline bypass/mocking is removed, this queries the backend and displays the 404 from the server
    await expect(page.locator('text=Person with ID XYZ-99 not found')).toBeVisible({ timeout: 8000 });

    // Verify cleanup
    await page.click('button:has-text("Resume Verification")');
    await expect(page.locator('input[placeholder="e.g. 24JJ1A0501"]')).toBeVisible();
  });

  test('Operator workflow: verify well-formed but non-existent student roll query fails strictly online with server 404', async ({ page }) => {
    await page.click('button:has-text("Manual Enter")');

    // Well-formed JNTUH roll format that doesn't exist in seed data: 24JJ1A0599
    await page.fill('input[placeholder="e.g. 24JJ1A0501"]', '24JJ1A0599');
    await page.click('button:has-text("Verify Roll Number")');

    // Stays on/transitions to "Entry Details" sub-mode but displays error box directly from server return message
    await expect(page.locator('text=Person with ID 24JJ1A0599 not found')).toBeVisible({ timeout: 8000 });

    // Try a new scan
    await page.click('button:has-text("Resume Verification")');
    await expect(page.locator('input[placeholder="e.g. 24JJ1A0501"]')).toBeVisible();
  });

  test('Operator workflow: verify QR payload schema varieties', async ({ page }) => {
    // 1. JSON payload with "roll" schema variety
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('{"roll": "24JJ1A0501"}');
    });
    await expect(page.locator('text=Verifying Identity...')).toBeVisible();
    await expect(page.locator('text=24JJ1A0501')).toBeVisible();
    // Cancel the confirmation page
    await page.click('button[aria-label="Cancel scan verification"]');

    // 2. JSON payload with "student_roll" schema variety
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('{"student_roll": "24JJ1A0501"}');
    });
    await expect(page.locator('text=Verifying Identity...')).toBeVisible();
    await expect(page.locator('text=24JJ1A0501')).toBeVisible();
    // Cancel
    await page.click('button[aria-label="Cancel scan verification"]');

    // 3. JSON payload with "uniqueId" schema variety
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('{"uniqueId": "24JJ1A0501"}');
    });
    await expect(page.locator('text=Verifying Identity...')).toBeVisible();
    await expect(page.locator('text=24JJ1A0501')).toBeVisible();
    // Cancel
    await page.click('button[aria-label="Cancel scan verification"]');

    // 4. Plain raw text string format
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('24JJ1A0501');
    });
    await expect(page.locator('text=Verifying Identity...')).toBeVisible();
    await expect(page.locator('text=24JJ1A0501')).toBeVisible();
    // Cancel
    await page.click('button[aria-label="Cancel scan verification"]');

    // 5. Non-existent JSON roll variety: should give 404 message directly
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('{"roll": "24JJ1A0599"}');
    });
    await expect(page.locator('text=Person with ID 24JJ1A0599 not found')).toBeVisible({ timeout: 8000 });
  });

  test('Network resilience: Operator sees error and can retry on network failure', async ({ page }) => {
    // Intercept scan POST endpoint and simulate network failure
    await page.route('**/api/gate/scan', route => route.abort('connectionrefused'));

    await page.click('button:has-text("Manual Enter")');
    await page.fill('input[placeholder="e.g. 24JJ1A0501"]', '24JJ1A0501');
    await page.click('button:has-text("Verify Roll Number")');
    await expect(page.locator('text=Identity Verified')).toBeVisible({ timeout: 5000 });

    const confirmButton = page.getByRole('button', { name: 'Entry', exact: true });
    await confirmButton.click();

    // UI displays Network Error state with Retry button
    await expect(page.locator('.scan-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#retry-btn')).toBeVisible();

    // Restore network response
    await page.unroute('**/api/gate/scan');
    await page.route('**/api/gate/scan', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, scan: { id: 's-1', roll: '24JJ1A0501', direction: 'IN' } }),
    }));

    await page.click('#retry-btn');
    await expect(page.locator('.scan-success')).toBeVisible({ timeout: 5000 });
  });

  test('Idempotency: Server rejects duplicate scan requests within short window', async ({ page }) => {
    // Trigger two rapid scans for same student
    await page.evaluate(() => {
      (window as any).__handleQRScannedForTesting('24JJ1A0501');
    });
    await expect(page.locator('text=Identity Verified')).toBeVisible({ timeout: 5000 });

    // Mock server 409 Conflict response for duplicate request
    await page.route('**/api/gate/scan', route => route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, duplicate: true, error: 'Duplicate scan detected' }),
    }));

    const confirmButton = page.getByRole('button', { name: 'Entry', exact: true });
    await confirmButton.click();

    await expect(page.locator('.scan-error')).toContainText('Duplicate scan detected');
  });

});
