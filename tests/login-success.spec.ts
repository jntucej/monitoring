import { test, expect } from "@playwright/test";

const SMOKE_USER = process.env.SMOKE_USER;
const SMOKE_PASS = process.env.SMOKE_PASS;

// Success-path regression guard for Login Failure Guide Parts 1-5. Skips unless
// SMOKE_USER / SMOKE_PASS are provided (never guesses credentials).
test.describe("Login — success path", () => {
  test.skip(!SMOKE_USER || !SMOKE_PASS, "SMOKE_USER / SMOKE_PASS not set");

  test("password login issues a token and lands off /login", async ({ request, page }) => {
    const res = await request.post("/api/auth/login", {
      headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
      data: { login: SMOKE_USER, password: SMOKE_PASS },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.token).toMatch(/^eyJ/);
    expect(body.data?.user?.role).toBeTruthy();

    // Drive the actual UI form
    await page.goto("/login");
    await page.getByPlaceholder(/Enter ID/i).fill(SMOKE_USER!);
    await page.getByPlaceholder(/Enter password/i).fill(SMOKE_PASS!);
    await page.getByPlaceholder(/Enter password/i).press("Enter");

    // Must NOT bounce back to /login (guards the double-redirect race)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.locator("body")).not.toContainText(/Invalid credentials/i);
  });

  test("session endpoint returns a valid payload after login", async ({ request }) => {
    const login = await request.post("/api/auth/login", {
      headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
      data: { login: SMOKE_USER, password: SMOKE_PASS },
    });
    const { data } = await login.json();
    const session = await request.get("/api/auth/session", {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(session.status()).toBe(200);
    const payload = await session.json();
    // Asserts the session shape: top-level `user`, not `data.user`
    expect(payload.user ?? payload.data?.user).toBeTruthy();
  });

  test("authenticated API call succeeds (guards against MFA fail-closed)", async ({ request }) => {
    const login = await request.post("/api/auth/login", {
      headers: { Origin: "http://localhost:3000", Host: "localhost:3000" },
      data: { login: SMOKE_USER, password: SMOKE_PASS },
    });
    const { data } = await login.json();
    const users = await request.get("/api/users", {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    // Not 401, not 403 MFA_REQUIRED
    expect(users.status()).toBe(200);
    const body = await users.json();
    if (!body.success) {
      throw new Error(`/api/users failed: ${JSON.stringify(body.error)}`);
    }
  });
});
