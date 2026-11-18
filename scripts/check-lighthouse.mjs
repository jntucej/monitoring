#!/usr/bin/env node
/**
 * check-lighthouse.mjs — CI gate for Lighthouse scores.
 *
 * Reads lighthouse-report.json (produced by `npm run test:perf`) and
 * exits non-zero if any category falls below the threshold.
 *
 * Thresholds:
 *   performance     >= 0.50 (warn)
 *   accessibility   >= 0.90 (error — hard gate)
 *   best-practices  >= 0.80 (warn)
 *   seo             >= 0.80 (warn)
 *
 * Only accessibility is a hard gate (blocks deploy). The others warn
 * so the team can see the trend without blocking every PR.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPORT = process.env.LIGHTHOUSE_REPORT ?? "lighthouse-report.json";
const THRESHOLDS = {
  performance: 0.5,
  accessibility: 0.9,
  "best-practices": 0.8,
  seo: 0.8,
};

const HARD_GATE = ["accessibility"];

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error(`[lighthouse-gate] ${REPORT} not found — run \`npm run test:perf\` first`);
    process.exit(2);
  }

  const raw = JSON.parse(fs.readFileSync(REPORT, "utf8"));
  const cats = raw.cats;
  if (!cats) {
    console.error("[lighthouse-gate] malformed report: no cats field");
    process.exit(2);
  }

  let failures = 0;

  for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
    const score = cats[cat]?.score;
    if (score === undefined) {
      console.warn(`[lighthouse-gate] ${cat}: missing from report — skipping`);
      continue;
    }
    const pct = Math.round(score * 100);
    const hard = HARD_GATE.includes(cat);
    const pass = score >= threshold;

    if (pass) {
      console.log(`[lighthouse-gate] ${cat}: ${pct}/100 ${hard ? "(hard gate) " : ""}— PASS (threshold ${Math.round(threshold * 100)})`);
    } else {
      const label = hard ? "FAIL" : "WARN";
      console.log(`[lighthouse-gate] ${cat}: ${pct}/100 ${hard ? "(hard gate) " : ""}— ${label} (threshold ${Math.round(threshold * 100)})`);
      if (hard) failures++;
    }
  }

  // Also surface key Core Web Vitals metrics from the report
  const m = raw.audits ?? {};
  const cwvKeys = [
    "largest-contentful-paint",
    "first-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "interactive",
  ];
  console.log("\n[core-web-vitals]");
  for (const key of cwvKeys) {
    const audit = m[key];
    if (!audit) continue;
    const display = audit.displayValue ?? audit.score ?? "?";
    const status = audit.score === 2 ? "✓" : audit.score === 1 ? "△" : "✗";
    console.log(`  ${status} ${key}: ${display}`);
  }

  if (failures > 0) {
    console.error(`\n[lighthouse-gate] ${failures} hard-gate failure(s) — blocking deploy`);
    process.exit(1);
  }
  console.log("\n[lighthouse-gate] all hard gates passed");
}

main();
