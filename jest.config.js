/**
 * Jest config for the gate UI/integration test suites.
 *
 * Uses Next's bundled SWC transformer (next/dist/build/swc/jest-transformer)
 * so TSX/TS tests exercise the real component code without a Babel config.
 */
const path = require("path");

const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/gate/jest.setup.ui.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx|mjs)$": path.resolve(
      __dirname,
      "node_modules/next/dist/build/swc/jest-transformer.js"
    ),
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@framer|framer-motion|lucide-react)/)",
  ],
  silent: false,
};

module.exports = config;
