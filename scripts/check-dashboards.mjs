#!/usr/bin/env node
// CI gate — exits non-zero if any critical dashboard issue exists.
import { spawnSync } from "node:child_process";
const r = spawnSync("node", ["scripts/dashboard-doctor.mjs", "audit"], { encoding: "utf8" });
const out = r.stdout + r.stderr;
const critical = (out.match(/\bR(2|7|8|24)\b/g) ?? []).length;
if (critical > 0) { console.error("Critical dashboard issues:", critical); process.exit(1); }
process.exit(0);
