import { test, expect } from "./fixtures";

// SCAFFOLD:RICH-TEST — fails CI when creds are missing (test.fixme, not skip).
const HAS_CREDS = Boolean(process.env.SMOKE_USER && process.env.SMOKE_PASS);
if (!HAS_CREDS) {
  test.fixme(true, "SMOKE_USER / SMOKE_PASS must be set");
}

test.describe("sysadmin /sysadmin/scheduling", () => {
  test("loads clean, zero failed requests", async ({ page, failedRequests }) => {
    await page.goto("/login");
    await page.getByLabel(/login id|email/i).fill(process.env.SMOKE_USER!);
    await page.getByLabel(/password/i).fill(process.env.SMOKE_PASS!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(sysadmin|admin)/);
    await page.goto("/sysadmin/scheduling");
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 15_000 });
    expect(failedRequests, JSON.stringify(failedRequests, null, 2)).toEqual([]);
  });

  test("shows error boundary on API failure", async ({ page }) => {
    await page.route("**/api/admin/scheduling**", (r) =>
      r.fulfill({ status: 500, body: "{}" }),
    );
    await page.goto("/sysadmin/scheduling");
    await expect(page.getByText(/unavailable|something went wrong/i)).toBeVisible({ timeout: 10_000 });
  });
});
