/**
 * Principal — review & respond E2E tests (warden-consolidated surfaces).
 *
 * Follows the repo convention (see operator-ui-shell.spec.ts):
 *   - Logs in via /api/auth/login, seeds the token into sessionStorage,
 *     then drives the real pages. Skips cleanly without SMOKE creds.
 *
 * Routes target the post-consolidation principal pages:
 *   /principal/review/audit, /principal/respond/emergency, /principal/hostels/overview
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

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

test.describe("Principal — review & respond", () => {
  test.skip(!SMOKE_USER || !SMOKE_PASS, "SMOKE_USER / SMOKE_PASS not set");

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request);
    await page.addInitScript((t) => {
      sessionStorage.setItem("auth.token", t);
    }, token);
  });

  test("review/audit page loads with zero failed requests", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/review/audit", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("respond/emergency page loads clean", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/respond/emergency", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("hostels/overview page loads clean", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/hostels/overview", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });
});
