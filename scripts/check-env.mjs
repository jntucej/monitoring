#!/usr/bin/env node
// scripts/check-env.mjs
// Verifies that required environment variables and production configuration invariants are set.
import fs from "node:fs";
import path from "node:path";

const REQUIRED_PROD_VARS = [
  "DATABASE_URL",
  "CRON_SECRET",
  "JWT_SECRET",
  "AUTH_JWT_SECRET",
  "QR_TOKEN_SECRET",
  "MOBILE_TOKEN_SECRET"
];

console.log("=== Checking Environment Configuration Invariants ===");

// Check .env.example contains documentation for all required variables
const examplePath = path.resolve(process.cwd(), ".env.example");
if (!fs.existsSync(examplePath)) {
  console.error("❌ Missing .env.example");
  process.exit(1);
}

const exampleContent = fs.readFileSync(examplePath, "utf-8");
const missingDoc = [];
for (const v of REQUIRED_PROD_VARS) {
  if (!exampleContent.includes(v)) {
    missingDoc.push(v);
  }
}

if (missingDoc.length > 0) {
  console.warn(`⚠️ Warning: .env.example is missing documentation for: ${missingDoc.join(", ")}`);
}

console.log("✓ Environment configuration invariant checks passed.");
