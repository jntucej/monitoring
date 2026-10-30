/**
 * Principal Delegation E2E tests — DELEGATE consolidated pages.
 *
 * Follows the repo convention (see operator-ui-shell.spec.ts):
 *   - Logs in via /api/auth/login, seeds the token into sessionStorage,
 *     then drives the real pages. Skips cleanly without SMOKE creds.
 *
 * Routes target the post-consolidation principal pages:
 *   /principal/delegate/rules, /principal/delegate/in-force, /principal/delegated,
 *   /principal/oversee/sla-heatmap
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

test.describe("Principal Delegation — delegate pages", () => {
  test.skip(!SMOKE_USER || !SMOKE_PASS, "SMOKE_USER / SMOKE_PASS not set");

  test.beforeEach(async ({ page, request }) => {
    const token = await apiLogin(request);
    await page.addInitScript((t) => {
      sessionStorage.setItem("auth.token", t);
    }, token);
  });

  test("delegate/rules page loads with zero failed requests", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/delegate/rules", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("delegate/in-force + delegated sub-pages load", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/delegate/in-force", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    await page.goto("/principal/delegated", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("oversee/sla-heatmap renders the PrincipalSlaHeatmap widget", async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on("response", (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await page.goto("/principal/oversee/sla-heatmap", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failed, `Unexpected ${failed.length} failed requests`).toEqual([]);
  });

  test("navigates from principal root to delegate/rules", async ({ page }) => {
    await page.goto("/principal", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    await page.goto("/principal/delegate/rules", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
  });
});
