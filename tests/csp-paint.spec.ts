import { test, expect } from "@playwright/test";

/**
 * CSP + first-paint guard for public pages.
 *
 * The P0 this closes: the home page was force-static + strict-dynamic
 * CSP with a nonce mismatch, so every _next chunk was blocked, the
 * S:0 streaming wrapper never un-hid, and the hero painted invisible.
 * Lighthouse measured NO_FCP; /api/health reported green; 19/19
 * Playwright passed (dev server, no CSP header).
 *
 * These tests assert what Lighthouse would have told us:
 *   - body text > 100 chars (S:0-hidden baseline is ~41)
 *   - h1 visible in viewport
 *   - zero CSP violations in console
 *
 * Run against `next start` (NODE_ENV=production), NOT the dev server.
 * The dev server does not enforce the CSP middleware header, which is
 * exactly the gap that let the P0 ship under 19/19 green.
 */
test.describe("CSP + first-paint (public pages)", () => {
  for (const path of ["/", "/login"]) {
    test(`${path}: SSR content paints, no CSP blocks`, async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().toLowerCase().includes("content security policy")) {
          violations.push(msg.text());
        }
      });

      await page.goto(path);

      // Body text well above the S:0-hidden baseline (~41 chars).
      await expect(page.locator("body")).toHaveText(/.{100,}/);

      // The first h1 is visible (hero on /, form heading on /login).
      await expect(page.locator("h1").first()).toBeVisible();

      // Zero CSP violations — the assertion that catches the P0 class.
      expect(
        violations,
        `${path}: ${violations.length} CSP violation(s): ${violations.slice(0, 3).join(" | ")}`,
      ).toEqual([]);
    });
  }
});
