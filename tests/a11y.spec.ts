import { test, expect } from "@playwright/test";

// Axe is optional (dev dep not installed in all CI environments). If it's
// missing, the a11y baseline test is marked fixme rather than failing — the
// important tests (mobile smoke) always run.
let AxeBuilder: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AxeBuilder = require("@axe-core/playwright").default;
} catch {
  test.fixme(
    true,
    "@axe-core/playwright not installed — run: npm i -D @axe-core/playwright"
  );
}

const PAGES = ["/login", "/about", "/help"];

for (const path of PAGES) {
  test(`a11y: ${path} has no critical or serious violations`, async ({
    page,
  }) => {
    test.fixme(!AxeBuilder, "axe-core not installed");
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const critical = results.violations.filter(
      (v: any) => v.impact === "critical" || v.impact === "serious"
    );
    expect(
      critical,
      JSON.stringify(critical, null, 2)
    ).toEqual([]);
  });
}

// Baseline (always runs, no assertion — just logs findings for triage)
test("a11y baseline: log all WCAG violations on /", async ({ page }) => {
  if (!AxeBuilder) return;
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  console.log("A11y violations on /:", results.violations.length);
  results.violations.forEach((v: any) => {
    console.log(
      `[${v.impact}] ${v.id}: ${v.description} — ${v.nodes.length} nodes`
    );
  });
});
