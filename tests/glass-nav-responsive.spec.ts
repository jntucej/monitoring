import { test, expect, type Page } from "@playwright/test";

// Seeds a fake auth session so the SafeAreaAppShell renders the Glass rails.
// Note: this only exercises client rendering of the nav chrome; the auth
// middleware on server routes will still reject navigation, but the shell
// (and thus the rails) doesn't depend on the server session to lay out.
function seedAuth(page: Page) {
  return page.addInitScript(() => {
    const payload = {
      state: {
        user: { id: "u1", name: "Test Admin", role: "admin", employeeId: "ADM1", gateId: "1" },
        token: "fake-token-for-layout-test",
        refreshToken: null,
        role: "admin",
        authenticated: true,
      },
      version: 0,
    };
    try {
      sessionStorage.setItem("gate-monitor-auth", JSON.stringify(payload));
    } catch (e) {
      /* ignore */
    }
  });
}

test.describe("Glass responsive navigation", () => {
  test("mobile shows bottom dock, desktop shows left rail", async ({ page }) => {
    await seedAuth(page);
    // Mock the session endpoint so the fake token passes validation and
    // the page stays on /admin instead of being hard-redirected to /login.
    await page.route("**/api/auth/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            token: "fake-token-for-layout-test",
            refreshToken: null,
            user: { id: "u1", name: "Test Admin", role: "admin", employeeId: "ADM1", gateId: "1" },
          },
        }),
      });
    });

    // Mobile viewport (iPhone-ish) — expect the dock, not the rail.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    // Wait for the bottom dock to render before measuring.
    await page.locator(".glass-nav-dock").waitFor({ state: "attached", timeout: 10000 });
    await page.waitForTimeout(800);

    const dockMobile = await page
      .locator(".glass-nav-dock")
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { display: s.display, height: el.getBoundingClientRect().height, bottom: s.bottom };
      })
      .catch(() => null);
    const railMobile = await page
      .locator(".glass-nav-rail")
      .first()
      .evaluate((el) => getComputedStyle(el).display)
      .catch(() => null);

    // Desktop viewport — expect the rail, not the dock.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin");
    await page.locator(".glass-nav-rail").waitFor({ state: "attached", timeout: 10000 });
    await page.waitForTimeout(800);

    const railDesktop = await page
      .locator(".glass-nav-rail")
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { display: s.display, width: el.getBoundingClientRect().width };
      })
      .catch(() => null);
    const dockDesktop = await page
      .locator(".glass-nav-dock")
      .first()
      .evaluate((el) => getComputedStyle(el).display)
      .catch(() => null);

    console.log("MOBILE -> dock:", JSON.stringify(dockMobile), "rail:", railMobile);
    console.log("DESKTOP -> rail:", JSON.stringify(railDesktop), "dock:", dockDesktop);

    // dock visible on mobile, rail hidden on mobile
    if (dockMobile) expect(dockMobile.display).not.toBe("none");
    expect(railMobile).toBe("none");
    // rail visible on desktop, dock hidden on desktop
    if (railDesktop) expect(railDesktop.display).not.toBe("none");
    expect(dockDesktop).toBe("none");
    // rail width should be fluid (>= 220)
    if (railDesktop) expect(railDesktop.width).toBeGreaterThanOrEqual(220);
  });

  test("nav items present in both dock and rail", async ({ page }) => {
    await seedAuth(page);
    await page.route("**/api/auth/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            token: "fake-token-for-layout-test",
            refreshToken: null,
            user: { id: "u1", name: "Test Admin", role: "admin", employeeId: "ADM1", gateId: "1" },
          },
        }),
      });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    await page.locator(".glass-nav-dock").waitFor({ state: "attached", timeout: 10000 });
    await page.waitForTimeout(800);
    await expect(page.locator(".glass-nav-dock a")).toHaveCount(4);
  });
});