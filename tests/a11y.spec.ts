import { test, expect } from "@playwright/test";

let AxeBuilder: typeof import("@axe-core/playwright") = null as never;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AxeBuilder = require("@axe-core/playwright").default;
} catch {
  test.fixme(true, "@axe-core/playwright not installed — run: npm i -D @axe-core/playwright");
}

// Public pages must be WCAG-contrast clean in BOTH themes (dark + light).
const PAGES = ["/", "/login", "/about", "/help"];

for (const theme of ["dark", "light"] as const) {
  for (const path of PAGES) {
    test(`a11y (${theme}): ${path} has no critical or serious violations`, async ({
      page,
    }) => {
      test.fixme(!AxeBuilder, "axe-core not installed");
      await page.addInitScript((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);
      await page.goto(path);
      // "/" redirects to /login for anonymous visitors — the navigation
      // destroys the execution context, so wait for the final URL to settle
      // before analyzing.
      await page.waitForLoadState("domcontentloaded");
      await page.waitForURL(/.*/).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 500));
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }
}

// Baseline (always runs, no assertion — just logs findings for triage)
test("a11y baseline: log all WCAG violations on /", async ({ page }) => {
  test.fixme(!AxeBuilder, "axe-core not installed");
  await page.goto("/");
  // Wait for the theme to settle before analyze (a redirect/navigation kills
  // the execution context; wait for the final landing URL).
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  console.log(`A11y violations on ${page.url()}: ${results.violations.length}`);
  results.violations.forEach((v) => {
    console.log(`[${v.impact}] ${v.id}: ${v.description} — ${v.nodes.length} nodes`);
  });
});
