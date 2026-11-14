import { defineConfig } from "unslop-ui";

export default defineConfig({
  include: ["src/**/*.{tsx,jsx,ts,js}"],
  ignore: [
    "node_modules/**",
    ".next/**",
    "dist/**",
    "tests/**",
    "src/app/opengraph-image.tsx",
    "src/app/icon.tsx",
    "src/app/**/opengraph-image.tsx",
  ],
  stack: { react: true, tailwind: true, shadcn: false },
  rules: {
    // Real breaks — keep hard
    "ui-slop/token-bypass": "error",
    "ui-slop/raw-hex-colors": "error",
    "ui-slop/gradient-soup": "error",

    // Real debt, but needs human judgment
    "ui-slop/card-lasagna": "warn",
    "ui-slop/inconsistent-icon-size": "warn",
    "ui-slop/muted-everything": "warn",

    // Noise: scanner limitation or taste — off
    "ui-slop/arbitrary-tailwind-values": "off",
    "ui-slop/random-radius": "off",
    "ui-slop/random-shadow": "off",
    "ui-slop/shadcn-default-look": "off",
    "ui-slop/generic-ai-hero": "off",
  },
});
