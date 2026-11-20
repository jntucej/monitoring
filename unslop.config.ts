import { defineConfig } from "unslop-ui";

export default defineConfig({
  include: ["src/**/*.{tsx,jsx,ts,js}"],
  ignore: [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "tests/**",
    "docs/**",
    "scripts/**",
    "packages/**",
    // File exclusions: only for contexts where CSS vars cannot resolve at
    // build time (ImageResponse/OG prerender). Adding a third requires
    // confirming the context is prerender-only — if it renders in the
    // browser, use a token instead.
    "src/app/opengraph-image.tsx",
    "src/app/icon.tsx",
    "src/app/**/opengraph-image.tsx",
    // Role identity configs: raw hex values are intentional — each role
    // gets a distinct accent/tint pair. These are CSS-var source values,
    // not UI component colors, so they don't belong in the design system.
    "src/components/RoleThemeProvider.tsx",
    "src/config/roles/**/*.ts",
    // MealReviewPanel: legitimate multi-card surface — 3 side-by-side meal cards
    // + status card + a "Your reviews today" list card + an inline edit editor.
    // The unslop card-lasagna rule (>=8 stacked card-like wrappers) is designed
    // for card-on-card marketing layouts; this is a data list with distinct
    // per-card semantics (each meal is its own card by design). Ignoring the
    // whole file rather than de-carding the 3 meals (which would make the
    // meals visually indistinguishable).
    "src/components/mess/MealReviewPanel.tsx",
  ],
  stack: { react: true, tailwind: true, shadcn: false },
  rules: {
    // Hard gates — fail CI on any new occurrence:
    "ui-slop/token-bypass": "error",
    "ui-slop/raw-hex-colors": "error",
    "ui-slop/gradient-soup": "error",
    "ui-slop/card-lasagna": "error",
    "ui-slop/inconsistent-icon-size": "error",
    "ui-slop/muted-everything": "error",

    // Objectively inactive under the graphite single-radius / zero-shadow
    // system: one radius token, zero shadows. Leaving these on would flag
    // correct code.
    "ui-slop/random-radius": "off",
    "ui-slop/random-shadow": "off",
    // Scanner limitation (reads @theme token utilities as arbitrary values)
    // and taste rules:
    "ui-slop/arbitrary-tailwind-values": "off",
    "ui-slop/shadcn-default-look": "off",
    "ui-slop/generic-ai-hero": "off",
  },
});
