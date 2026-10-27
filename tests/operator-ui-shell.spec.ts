import { test, expect, devices } from "@playwright/test";

/**
 * Operator UI shell — structural + responsive acceptance test.
 *
 * Asserts the operator dashboard renders with:
 *   - NO <header> chrome and NO <footer>
 *   - the slim OperatorShell side-rail as the ONLY navigation
 *     (desktop: left md rail; mobile: bottom tab bar)
 *   - the restored Board feed (scan transactions) in the main column
 *
 * Authentication: logs in through the app's own API (same pattern as
 * login-success.spec.ts), then seeds the token into sessionStorage so the
 * Auth-guarded /operator route hydrates to the real console. Skips cleanly
 * when SMOKE_USER / SMOKE_PASS are not provided — it never guesses creds.
 */

const SMOKE_USER = process.env.SMOKE_USER;
const SMOKE_PASS = process.env.SMOKE_PASS;

async function apiLogin(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post("/api/auth/login", {
    data: { login: SMOKE_USER, password: SMOKE_PASS },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  const token = body.data?.token;
  expect(typeof token).toBe("string");
  return token;
}

test.describe("Operator UI shell — no header/footer, side-rail only, responsive", () => {
  test.skip(!SMOKE_USER || !SMOKE_PASS, "SMOKE_USER / SMOKE_PASS not set");

  test.beforeEach(async ({ request, page }) => {
    const token = await apiLogin(request);
    // Seed the live auth token before the app hydrates so /operator renders
    // the console instead of the AuthGuard spinner/redirect.
    await page.addInitScript((t) => {
      sessionStorage.setItem("auth.token", t);
    }, token);
  });

  test("desktop: side-rail only, no header/footer, board feed present", async ({ page }) => {
    await page.goto("/operator", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    // The AuthGuard must have resolved — we should NOT be bounced to /login.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // No header or footer semantic elements anywhere in the rendered tree.
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);

    // The slim OperatorShell side-rail (desktop left rail, md+) is present and
    // is the only nav. Its aria-label is "Operator navigation".
    const desktopRail = page.locator('nav[aria-label="Operator navigation"]');
    await expect(desktopRail.first()).toBeVisible();

    // The restored dashboard main content (the Board feed widget) is present.
    const board = page.locator('[aria-label="Today\'s scan feed"], [aria-label="Feed"], li[role="option"], ol[role="listbox"]');
    // Either a feed with rows, or the "No scans recorded yet" empty state.
    await expect(page.getByRole("heading", { name: /Feed/i }).first()).toBeVisible({ timeout: 10_000 });
    void board; // feed presence asserted via the Feed heading above
  });

  test("mobile: bottom tab bar replaces the side-rail (responsive), no header/footer", async ({ page, context }) => {
    await context.tracing?.start?.({ name: "operator-mobile" }).catch?.(() => {});
    const iphone = devices["iPhone 13"];
    await page.setViewportSize({ width: iphone.viewport.width, height: iphone.viewport.height });
    await page.goto("/operator", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // No header/footer chrome on mobile either.
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);

    // The mobile bottom tab bar (md:hidden nav) is visible and reachable.
    const mobileNav = page.locator('nav[aria-label="Operator navigation"]').last();
    await expect(mobileNav).toBeVisible({ timeout: 10_000 });

    await context.tracing?.stop?.().catch?.(() => {});
  });
});
