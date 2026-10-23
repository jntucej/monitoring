#!/usr/bin/env node
// CI gate — exits non-zero if any critical dashboard issue exists.
import { spawnSync } from "node:child_process";
const r = spawnSync("node", ["scripts/dashboard-doctor.mjs", "audit"], {
  encoding: "utf8",
});

if (r.error) {
  console.error("dashboard-doctor failed to spawn:", r.error.message);
  process.exit(1);
}
if (r.status !== 0 && r.status !== 1) {
  console.error("dashboard-doctor exited with unexpected status:", r.status);
  console.error(r.stdout, r.stderr);
  process.exit(1);
}

const out = (r.stdout ?? "") + (r.stderr ?? "");
const critical = (out.match(/\bR(2|7|8|24)\b/g) ?? []).length;
if (critical > 0) {
  console.error("Critical dashboard issues:", critical);
  process.exit(1);
}
process.exit(0);
