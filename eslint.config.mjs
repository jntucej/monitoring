import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // `_`-prefixed names (params, catch bindings, destructure fields,
          // locals) are the idiomatic "intentionally unused" marker — accept them.
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // rest siblings (`const { a, ...rest } = obj` where only `rest` is
          // consumed) should not be flagged — they exist to exclude `a` from
          // the spread, so the named destructuring is the whole point.
          ignoreRestSiblings: true,
        },
      ],
      "@next/next/no-img-element": "off",
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
