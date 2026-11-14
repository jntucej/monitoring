import { test, expect } from '@playwright/test';

/**
 * Home-page first-paint guard.
 *
 * The P0 this closes: the home page was force-static + strict-dynamic CSP
 * with a nonce mismatch, so every _next chunk was blocked, the S:0
 * streaming wrapper never un-hid, and the hero painted invisible.
 * Lighthouse measured NO_FCP; /api/health reported green; 19/19
 * Playwright passed (dev server, no CSP header). A page-load test that
 * only checks HTTP status and title does NOT catch this class of bug —
 * the DOM is present, the paint is absent.
 *
 * The assertion that catches it: after navigating to /, the hero h1
 * must be visible in the viewport without forcing a scroll, and the
 * body's visible text must be well above the S:0-hidden baseline
 * (~41 chars). If a future CSP change or Suspense wrapper re-introduces
 * the blank-first-paint state, this test fails.
 *
 * Run against a prod-like server (next start, NODE_ENV=production) so
 * the CSP header is present. `PLAYWRIGHT_TEST_BASE_URL` points at it.
 */
test.describe('Home first-paint (no blank hero)', () => {
  test('hero h1 is visible without scrolling', async ({ page }) => {
    await page.goto('/');
    // The hero h1 is the LCP element. If S:0 is still hidden (JS
    // blocked by CSP, or a streaming wrapper regressed), it is out of
    // layout and getBoundingClientRect().height === 0.
    const h1 = page.locator('#home-hero h1');
    await expect(h1).toBeVisible({ timeout: 15_000 });
    const box = await h1.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(0);
    expect(box?.width ?? 0).toBeGreaterThan(0);
  });

  test('body visible text is above the S:0-hidden baseline', async ({ page }) => {
    await page.goto('/');
    // When S:0 is hidden, body.innerText is ~41 chars (the nav + footer
    // shell outside the wrapper). A painted hero + sections is 2000+.
    // The threshold of 200 is generous: it allows for slow hydration on
    // a throttled test runner but still catches the blank state.
    await page.waitForFunction(
      () => document.body?.innerText?.length > 200,
      undefined,
      { timeout: 15_000 },
    );
    const len = await page.evaluate(() => document.body?.innerText?.length ?? 0);
    expect(len).toBeGreaterThan(200);
  });

  test('no CSP-blocked chunk failures on first load', async ({ page }) => {
    // Collect page errors that mention CSP. If the CSP blocks every
    // chunk, the browser logs 20+ "violates the following Content
    // Security Policy" errors. A healthy page logs 0.
    const cspErrors: string[] = [];
    page.on('pageerror', (err) => {
      if (String(err).includes('Content Security Policy')) cspErrors.push(String(err));
    });
    await page.goto('/');
    // Give any chunk loads a chance to fail and log.
    await page.waitForTimeout(3_000);
    expect(cspErrors.length, `CSP blocked ${cspErrors.length} scripts`).toBe(0);
  });
});
