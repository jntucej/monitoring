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
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-location-assign-relative-destination": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/immutability": "warn",
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
