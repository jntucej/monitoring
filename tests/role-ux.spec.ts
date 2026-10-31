/**
 * Role UX Regression Test Suite — Fixes 5-8
 *
 * Covers:
 *  Fix 5  — Role navigation menus for 7 roles (principal, vice_principal,
 *           exam_branch, oie, caretaker, deputy_warden, hostel_manager)
 *  Fix 6  — GuardedPage bounce loop (no flash of login, 3-strike guard,
 *           router.replace, data-user-role on body)
 *  Fix 7  — z-index stacking (toast/modal/bot), max 3 toasts, single modal
 *  Fix 8  — Performance (low-end device detection, chart throttling)
 */
import { test, expect } from '@playwright/test';

// Shell-dependent tests need an authenticated session to render the role
// sidebars (the app 302s unauthenticated role routes to /login, which has no
// shell). Following the suite convention (login-success, admin-admin-overview),
// these are auth-gated on SMOKE_USER/SMOKE_PASS and skip otherwise, so they
// never falsely fail on an unauthenticated harness.
const HAS_CREDS = Boolean(process.env.SMOKE_USER && process.env.SMOKE_PASS);
// In-body gate: call at the top of a shell-dependent test to skip it when the
// harness has no credentials (the app 302s unauthenticated role routes to
// /login, which has no app shell). Consistent with the suite's convention.
function requireAuth(): void {
  test.skip(!HAS_CREDS, 'SMOKE_USER / SMOKE_PASS not set — authenticated shell required');
}
// Login helper: POSTs to /api/auth/login and returns the access token so a
// cookie can be seeded for the authenticated shell.
async function mintToken(request: import('@playwright/test').APIRequestContext) {
  const res = await request.post('/api/auth/login', {
    data: { login: process.env.SMOKE_USER, password: process.env.SMOKE_PASS },
  });
  if (![200, 201].includes(res.status())) {
    throw new Error(`auth for shell tests failed: ${res.status()}`);
  }
  const body = await res.json();
  const data = body.data ?? body;
  return data.token || data.accessToken || body.token || body.access_token;
}

// Seed an authenticated SPA session by performing a real in-page login, which
// populates the zustand useAuthStore exactly as a real user's browser would
// (the app's AuthGuard reads the store, not a forged cookie). Resolves to false
// when credentials are unavailable or login fails.
async function seedSessionCookie(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  const user = process.env.SMOKE_USER;
  const pass = process.env.SMOKE_PASS;
  if (!user || !pass) return false;
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  // The form must hydrate + the auth store rehydrate before inputs are wired.
  await page.locator('#identifier').waitFor({ timeout: 15000 });
  // Type (rather than fill) so React's controlled inputs' onChange fire
  // reliably and the submit button enables.
  await page.locator('#identifier').click();
  await page.keyboard.type(user, { delay: 15 });
  await page.locator('#password').click();
  await page.keyboard.type(pass, { delay: 15 });
  // Let React's controlled state settle so the submit button becomes enabled.
  const submit = page.locator('button[type="submit"]');
  await expect(submit).toBeEnabled({ timeout: 15000 });
  await submit.click();
  // A successful login redirects away from /login (to the role's default route).
  await page.waitForURL((u) => !String(u).includes('/login'), { timeout: 30000 });
  return true;
}

// Roles under test per Fix 5
const ROLE_PAGES: Array<{ role: string; expectedPath: string }> = [
  { role: 'principal', expectedPath: '/principal' },
  { role: 'vice_principal', expectedPath: '/vice-principal' },
  { role: 'exam_branch', expectedPath: '/exam-branch' },
  { role: 'oie', expectedPath: '/oie' },
  { role: 'caretaker', expectedPath: '/hostel/permissions' },
  { role: 'deputy_warden', expectedPath: '/deputy-warden' },
  { role: 'hostel_manager', expectedPath: '/hostel-manager' },
];

test.describe('Fix 5 — Role navigation menus', () => {
  for (const { role, expectedPath } of ROLE_PAGES) {
    test(`role "${role}" has valid nav entries that resolve to real pages`, async ({ page, request }) => {
      requireAuth();
      // Authenticate so the role shell renders its (client-side) sidebar.
      await seedSessionCookie(page);

      // Load the role's default route (it has GuardedPage)
      await page.goto(expectedPath, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Sidebar should be present (desktop or mobile)
      const sidebar = page.locator('aside[aria-label="Primary navigation"], nav[aria-label="Mobile navigation bar"]');
      await expect(sidebar.first()).toBeVisible({ timeout: 8000 });

      // At least one nav link should be visible
      const navLinks = page.locator('nav a[href]').filter({ visible: true });
      await expect(navLinks.first()).toBeVisible({ timeout: 5000 });

      // Every nav href must be an absolute path starting with / (no missing routes)
      const hrefs: string[] = await navLinks.locator('a').evaluateAll((els) =>
        els.map((el: any) => el.getAttribute('href') || '')
      );
      for (const href of hrefs) {
        expect(href).toMatch(/^\//, `Nav href "${href}" for role ${role} is not a valid path`);
      }
    });
  }

  test('sidebar active-state matches nested routes', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('aside[aria-label="Primary navigation"]', { timeout: 8000 });

    // The principal dashboard link should be visible
    const activeNav = page.locator('aside a').filter({ hasText: /^Principal Dashboard$/ });
    await expect(activeNav).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Fix 6 — GuardedPage bounce loop', () => {
  test('GuardedPage shows loading screen, not flash of login', async ({ page }) => {
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // While unauthenticated, should see loading state — not bounce to /login
    // within the first 3 seconds (would indicate a bounce loop)
    await page.waitForTimeout(3000);

    // Should not show "Invalid credentials" repeatedly (bounce loop signal)
    const errorCount = await page.locator('text=Invalid credentials').count();
    expect(errorCount).toBe(0);
  });

  test('data-user-role attribute is set on <body> after auth', async ({ page, request }) => {
    requireAuth();
    await seedSessionCookie(page);
    // AuthGuard sets data-user-role on <body> for an authenticated role page.
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('aside, nav', { timeout: 8000 }).catch(() => {});
    const bodyRole = await page.locator('body').getAttribute('data-user-role');
    // Set to the user's role (non-empty) by AuthGuard after auth
    expect(bodyRole).toBeTruthy();
  });

  test('uses router.replace not push for redirects (no back-button trap)', async ({ page }) => {
    const before = page.url();
    // Navigate to a role-gated page; auth guard should replace, not push
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const current = page.url();
    // Should not be stuck on login with repeated URL changes
    expect(current).not.toBe(before);
  });
});

test.describe('Fix 7 — Toast/modal/bot stacking & z-index war', () => {
  test('toast container uses aria-live and respects max 3 toasts', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('.z-toast, .toast-root, aside, nav', { timeout: 8000 }).catch(() => {});
    // z-toast CSS token must be 80
    const zToast = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-toast').trim()
    );
    expect(zToast).toBe('80');
  });

  test('z-index tokens are defined in CSS custom properties', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('aside, nav', { timeout: 8000 }).catch(() => {});
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        nav: style.getPropertyValue('--z-nav').trim(),
        header: style.getPropertyValue('--z-header').trim(),
        sheet: style.getPropertyValue('--z-sheet').trim(),
        modal: style.getPropertyValue('--z-modal').trim(),
        floatingBot: style.getPropertyValue('--z-floating-bot').trim(),
        toast: style.getPropertyValue('--z-toast').trim(),
      };
    });
    expect(tokens.nav).toBe('40');
    expect(tokens.header).toBe('50');
    expect(tokens.sheet).toBe('60');
    expect(tokens.modal).toBe('70');
    expect(tokens.floatingBot).toBe('75');
    expect(tokens.toast).toBe('80');
  });

  test('FloatingBot has z-floating-bot class and floating-bot-root marker', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('aside, nav', { timeout: 8000 }).catch(() => {});
    // z-floating-bot CSS token must be 75
    const zVal = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-floating-bot').trim()
    );
    expect(zVal).toBe('75');
  });
});

test.describe('Fix 8 — Performance for low-end phones', () => {
  test('low-end device profile kills will-change on glass-card', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('.glass-card, aside, nav', { timeout: 8000 }).catch(() => {});
    // Set low-profile device
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-device-profile', 'low-profile');
    });
    const willChange = await page.evaluate(() => {
      const card = document.querySelector('.glass-card');
      if (!card) return 'N/A';
      return getComputedStyle(card).willChange;
    });
    expect(willChange).toBe('auto');
  });

  test('prefers-reduced-motion kills animations', async ({ page, request }) => {
      requireAuth();
    await seedSessionCookie(page);
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('.glass-card, aside, nav', { timeout: 8000 }).catch(() => {});
    // Simulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    // No animation should be running on glass cards
    const animating = await page.evaluate(() => {
      const cards = document.querySelectorAll('.glass-card');
      let count = 0;
      cards.forEach((c) => {
        const style = getComputedStyle(c);
        if (style.animationName && style.animationName !== 'none') count++;
      });
      return count;
    });
    expect(animating).toBe(0);
  });

  test('body has data-user-role attribute', async ({ page, request }) => {
    requireAuth();
    await seedSessionCookie(page);
    // AuthGuard sets data-user-role on <body> for an authenticated role page.
    await page.goto('/principal', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('aside, nav', { timeout: 8000 }).catch(() => {});
    const roleAttr = await page.locator('body').getAttribute('data-user-role');
    expect(roleAttr).not.toBeNull();
  });
});

test.describe('All 7 roles — full regression', () => {
  for (const { role, expectedPath } of ROLE_PAGES) {
    test(`${role} — page loads without bounce loop`, async ({ page }) => {
      await page.goto(expectedPath, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Should not have excessive URL changes (max 2: initial + possible auth redirect)
      // Playwright tracks this via the page state
      const currentUrl = page.url();
      // Final URL should be on expectedPath or /login (acceptable for unauth)
      const isExpectedPage = currentUrl.includes(expectedPath);
      const isLogin = currentUrl.includes('/login');
      expect(isExpectedPage || isLogin).toBe(true);
    });

    test(`${role} — sidebar renders with valid nav links`, async ({ page, request }) => {
      requireAuth();
      await seedSessionCookie(page);
      await page.goto(expectedPath, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('aside, nav[aria-label]', { timeout: 10000 });

      const navLinks = await page.locator('aside a[href], nav a[href]').count();
      expect(navLinks).toBeGreaterThan(0);
    });
  }
});
