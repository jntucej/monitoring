import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-location-assign-relative-destination": "error",
      "prefer-const": "error",
      "react/no-unescaped-entities": "error",
      "react-hooks/immutability": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "repomix-output.*",
    "coverage/**",
  ]),
]);

export default eslintConfig;
