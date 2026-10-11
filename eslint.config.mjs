// eslint.config.mjs
{
  files: ["src/app/api/**/*.ts"],
  rules: {
    "no-restricted-imports": ["warn", {
      patterns: [
        { group: ["**/src/server/repositories/*"], message: "Use 'server/services/*'" },
        { group: ["**/lib/postgres"],              message: "Use 'server/repositories/*'" },
        { group: ["bcryptjs"],                     message: "Use 'server/services/auth/*'" },
      ],
    }],
  },
},

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          "**/src/server/repositories/*",
          "**/lib/postgres",
          "bcryptjs",
        ],
      }],
    },
  },

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
