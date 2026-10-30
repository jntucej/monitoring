#!/usr/bin/env node
// scripts/check-dashboards.mjs
// Validates all dashboards and domain pages using dashboard-doctor audit logic.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCTOR = path.join(ROOT, "scripts", "dashboard-doctor.mjs");

console.log("=== Checking Dashboards via Dashboard Doctor ===");
const res = spawnSync("node", [DOCTOR, "audit"], { stdio: "inherit", cwd: ROOT });
if (res.status !== 0) {
  console.error("❌ Dashboard audit failed!");
  process.exit(res.status ?? 1);
}
console.log("✓ Dashboard audit passed cleanly.");
