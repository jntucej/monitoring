/**
 * Principal Inbox E2E tests — new consolidated inbox flow.
 *
 * Follows the repo convention (see operator-ui-shell.spec.ts):
 *   - Logs in via the app's own /api/auth/login, seeds the token into
 *     sessionStorage before the app hydrates, then drives the real pages.
 *   - Skips cleanly when SMOKE_USER / SMOKE_PASS aren't provided.
 *
 * Routes target the post-consolidation principal pages:
 *   /principal/inbox, /principal/overdue, /principal/manage-approved
 */
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const SMOKE_USER = process.env.SMOKE_USER;
const SMOKE_PASS = process.env.SMOKE_PASS;

async function apiLogin(request: APIRequestContext): Promise<string> {
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

test.describe("Principal Inbox — consolidated inbox", () => {
  test.skip(!SMOKE_USER || !SMOKE_PASS, "SMOKE_USER / SMOKE_PASS not set");

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request);
    await page.addInitScript((t) => {
      sessionStorage.setItem("auth.token", t);
    }, token);
  });

  test("inbox page loads and shows zero failed requests", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });

    await page.goto("/principal/inbox", { waitUntil: "networkidle" });
    // A rendered heading (not the login form) proves the page hydrated authenticated.
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("overdue + manage-approved sub-pages load clean", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });

    await page.goto("/principal/overdue", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    await page.goto("/principal/manage-approved", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });
});
