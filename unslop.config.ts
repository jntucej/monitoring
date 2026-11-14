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
    // ImageResponse prerender has no CSS variables — hex literals are the
    // only option. These two files are the entire legal-hex surface.
    "src/app/opengraph-image.tsx",
    "src/app/icon.tsx",
    "src/app/**/opengraph-image.tsx",
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
