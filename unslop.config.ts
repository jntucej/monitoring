import { defineConfig } from "unslop-ui";

export default defineConfig({
  include: ["src/**/*.{tsx,jsx,ts,js}", "app/**/*.{tsx,jsx}", "components/**/*.{tsx,jsx}"],
  ignore: ["node_modules/**", ".next/**", "dist/**", "*.test.tsx", "*.spec.tsx"],
  stack: {
    react: true,
    tailwind: true,
    shadcn: true,
  },
  rules: {
    "ui-slop/token-bypass": "error",
    "ui-slop/arbitrary-tailwind-values": "error",
    "ui-slop/raw-hex-colors": "error",
    "ui-slop/gradient-soup": "error",
    "ui-slop/card-lasagna": "warn",
    "ui-slop/muted-everything": "warn",
    "ui-slop/random-radius": "warn",
    "ui-slop/random-shadow": "warn",
    "ui-slop/shadcn-default-look": "warn",
    "ui-slop/generic-ai-hero": "warn",
    "ui-slop/inconsistent-icon-size": "warn",
  },
});
