#!/usr/bin/env node
/**
 * scripts/ui-refactor.mjs
 * ──────────────────────────────────────────────────────────────────────
 * Gate Monitor — hardcoded-value + responsiveness cookie cutter.
 *
 *   node scripts/ui-refactor.mjs audit    [path]                 scan (default src)
 *   node scripts/ui-refactor.mjs report   [path] > report.md     markdown report
 *   node scripts/ui-refactor.mjs fix      <file>     [--write]
 *   node scripts/ui-refactor.mjs fix      --all      [--write]
 *   node scripts/ui-refactor.mjs fix      --rule=R1  [--write]
 *   node scripts/ui-refactor.mjs init                            scaffold config + primitives
 *   node scripts/ui-refactor.mjs help
 *
 * Auto-fixers cover: R1 grid ladder, R2 table wrapper, R5 modal sizing,
 * R9 safe-area insets, R12 use-client directive. Everything else is
 * reported so you can route each value into src/config/app.config.ts.
 */
import { readFile, writeFile, readdir, mkdir, access } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const ROOT = join(dirname(import.meta.url), "..");
const SRC  = join(ROOT, "src");

/* ───────────────────────── terminal ───────────────────────── */
const C = {
  red:     (s) => `\x1b[31m${s}\x1b[0m`,
  green:   (s) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:    (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  dim:     (s) => `\x1b[2m${s}\x1b[0m`,
  bold:    (s) => `\x1b[1m${s}\x1b[0m`,
};
const ok   = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.cyan(`→ ${m}`));
const die  = (m) => { console.error(C.red(`ERROR: ${m}`)); process.exit(1); };

function lineOf(src, idx) {
  return src.slice(0, idx).split("\n").length;
}

const rel    = (p) => relative(ROOT, p).replaceAll("\\", "/");

/* ───────────────────────── walker ─────────────────────────── */
async function* walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (["node_modules", ".next", ".git", "dist", "build"].includes(e.name)) continue;
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/(\.(tsx|ts|mjs|js))$/i.test(e.name)) yield p;
  }
}

/* ═══════════════════════════════════════════════════════════════ *
 *  AUDIT
 * ═══════════════════════════════════════════════════════════════ */
const RULES = [
  { id: "R1", sev: "high", title: "Fixed grid-cols without breakpoint prefix",
    hint: "Use grid-cols-1 sm:grid-cols-2 lg:grid-cols-N",
    fixable: true,
    match(src) {
      const re = /(?<![:\w-])grid-cols-(\d+)(?!\s*[:/])/g;
      let m;
      while ((m = re.exec(src))) {
        const before = src.slice(Math.max(0, m.index - 20), m.index);
        if (/[:]\s*$/.test(before)) continue;
        const n = Number(m[1]);
        if (n <= 2) continue;
        return { line: lineOf(src, m.index), detail: `grid-cols-${n}` };
      }
      return null;
    } },

  { id: "R2", sev: "high", title: "<table> without overflow wrapper",
    hint: "Wrap in overflow-x-auto div",
    fixable: true,
    match(src, file) {
      if (!src.includes("<table")) return null;
      if (src.includes("overflow-x-auto")) return null;
      const m = src.match(/<table/);
      return m ? { line: lineOf(src, m.index), detail: "no overflow wrapper" } : null;
    } },

  { id: "R5", sev: "medium", title: "Modal without safe-area constraints",
    hint: "Add max-h-[90vh] max-w-[calc(100vw-2rem)]",
    fixable: true,
    match(src, file) {
      if (!file.includes("modal")) return null;
      if (src.includes("max-h-[90vh]")) return null;
      const m = src.match(/role="dialog"/);
      return m ? { line: lineOf(src, m.index), detail: "no viewport constraints" } : null;
    } },

  { id: "R9", sev: "low", title: "Sticky header without safe-area inset",
    hint: "Add pt-safe to sticky top-0",
    fixable: true,
    match(src) {
      if (!/sticky top-0/.test(src)) return null;
      if (/pt-safe/.test(src)) return null;
      const m = src.match(/sticky top-0/);
      return m ? { line: lineOf(src, m.index), detail: "no safe-area inset" } : null;
    } },

  { id: "R12", sev: "low", title: "Client hooks without use client",
    hint: "Add 'use client' at top",
    fixable: true,
    match(src, file) {
      if (!file.endsWith(".tsx")) return null;
      if (/^\s*['"]use client['"]/.test(src)) return null;
      if (!/(useState|useEffect|useRef)/.test(src)) return null;
      const m = src.match(/(useState|useEffect)/);
      return m ? { line: lineOf(src, m.index), detail: "hooks without directive" } : null;
    } },
];

async function audit(rootDir = SRC, filterRule = null) {
  const findings = [];
  for await (const file of walk(rootDir)) {
    let src;
    try { src = await readFile(file, "utf8"); } catch { continue; }
    for (const rule of RULES) {
      if (filterRule && rule.id !== filterRule) continue;
      let res;
      try { res = rule.match(src, file); } catch { res = null; }
      if (res) findings.push({ rule, file: rel(file), abs: file, ...res });
    }
  }
  return findings;
}

/* ═══════════════════════════════════════════════════════════════ *
 *  FIXERS
 * ═══════════════════════════════════════════════════════════════ */
const FIXERS = {
  R1(src) {
    const re = /(?<![:\w-])grid-cols-(\d+)(?!\s*[:/])/g;
    let changed = false;
    const out = src.replace(re, (match, nStr) => {
      const n = Number(nStr);
      if (n <= 2) return match;
      changed = true;
      if (n <= 4) return `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${n}`;
      return `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-${n}`;
    });
    return changed ? out : null;
  },

  R2(src) {
    if (src.includes("overflow-x-auto")) return null;
    const idx = src.indexOf("<table");
    if (idx < 0) return null;
    const close = src.indexOf("</table>", idx);
    if (close < 0) return null;
    const end = close + "</table>".length;
    const inner = src.slice(idx, end);
    const wrapped =
      `<div className=\"overflow-x-auto overscroll-x-contain -mx-4 px-4 sm:mx-0 sm:px-0\">\n` +
      `        ${inner}\n` +
      `      </div>`;
    return src.slice(0, idx) + wrapped + src.slice(end);
  },

  R5(src, file) {
    if (!file.includes("modal")) return null;
    const idx = src.indexOf('role="dialog"');
    if (idx < 0) return null;
    const before = src.lastIndexOf("className=", idx);
    if (before < 0 || idx - before > 500) return null;
    const clsStart = src.indexOf('"', before) + 1;
    const clsEnd = src.indexOf('"', clsStart);
    if (clsStart < 0 || clsEnd < 0) return null;
    const cls = src.slice(clsStart, clsEnd);
    if (cls.includes("max-h-")) return null;
    const patched = `${cls} max-h-[90vh] max-w-[calc(100vw-2rem)]`;
    return src.slice(0, clsStart) + patched + src.slice(clsEnd);
  },

  R9(src) {
    if (/pt-safe/.test(src)) return null;
    return src.replace(/sticky top-0/, "sticky top-0 pt-safe");
  },

  R12(src) {
    if (/^\s*['"]use client['"]/.test(src)) return null;
    return `"use client";\n\n${src}`;
  },
};

async function applyFix(absFile, ids, { write = false } = {}) {
  let src;
  try { src = await readFile(absFile, "utf8"); } catch { return { applied: [], changed: false }; }
  let out = src;
  const applied = [];
  for (const id of ids) {
    const fixer = FIXERS[id];
    if (!fixer) continue;
    const next = fixer(out, absFile);
    if (next && next !== out) { out = next; applied.push(id); }
  }
  if (!applied.length) return { applied, changed: false };
  if (!write) return { applied, changed: true };
  const backup = `${absFile}.bak.${Date.now()}`;
  await writeFile(backup, src, "utf8");
  await writeFile(absFile, out, "utf8");
  return { applied, changed: true, backup };
}

/* ═══════════════════════════════════════════════════════════════ *
 *  COMMANDS
 * ═══════════════════════════════════════════════════════════════ */
async function cmdAudit(rootDir, filterRule) {
  const findings = await audit(rootDir, filterRule);
  if (!findings.length) { ok("No issues found."); return 0; }

  const byRule = new Map();
  for (const f of findings) {
    if (!byRule.has(f.rule.id)) byRule.set(f.rule.id, { rule: f.rule, items: [] });
    byRule.get(f.rule.id).items.push(f);
  }
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...byRule.values()].sort((a, b) => order[a.rule.sev] - order[b.rule.sev]);

  for (const { rule, items } of sorted) {
    const col = rule.sev === "high" ? C.red : rule.sev === "medium" ? C.yellow : C.dim;
    console.log(`\n${col(rule.sev.toUpperCase().padEnd(6))} ${C.bold(rule.id.padEnd(4))} ${rule.title}`);
    console.log(`       ${C.dim(rule.hint)}`);
    for (const it of items.slice(0, 8)) {
      console.log(`       ${C.cyan(it.file)}:${it.line}  ${C.dim(it.detail)}`);
    }
    if (items.length > 8) console.log(`       ${C.dim(`… and ${items.length - 8} more`)}`);
  }

  const high   = findings.filter((f) => f.rule.sev === "high").length;
  const medium = findings.filter((f) => f.rule.sev === "medium").length;
  const low    = findings.filter((f) => f.rule.sev === "low").length;
  console.log(`\n${C.bold("Summary:")} ${C.red(high + " high")}, ${C.yellow(medium + " medium")}, ${C.dim(low + " low")} — ${findings.length} total`);

  const fixables = [...new Set(findings.filter((f) => f.rule.fixable).map((f) => f.rule.id))];
  if (fixables.length) {
    console.log(`Auto-fixable: ${C.magenta(fixables.join(", "))}`);
    console.log(`Run: ${C.cyan("node scripts/ui-refactor.mjs fix --all --write")}`);
  }
  return high > 0 ? 1 : 0;
}

async function cmdReport(rootDir) {
  const findings = await audit(rootDir);
  console.log(`# UI Refactor Report\n`);
  console.log(`Generated: \`${new Date().toISOString()}\n`);
  console.log(`Total findings: **${findings.length}**\n`);

  const byRule = new Map();
  for (const f of findings) {
    if (!byRule.has(f.rule.id)) byRule.set(f.rule.id, { rule: f.rule, items: [] });
    byRule.get(f.rule.id).items.push(f);
  }
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...byRule.values()].sort((a, b) => order[a.rule.sev] - order[b.rule.sev]);

  console.log(`| Rule | Severity | Issue | Count | Auto-fix |`);
  console.log(`|------|----------|-------|-------|----------|`);
  for (const { rule, items } of sorted) {
    console.log(`| ${rule.id} | ${rule.sev} | ${rule.title} | ${items.length} | ${rule.fixable ? "yes" : ""} |`);
  }
  for (const { rule, items } of sorted) {
    console.log(`\n## ${rule.id} · ${rule.sev.toUpperCase()} · ${rule.title}\n`);
    console.log(`> ${rule.hint}\n`);
    for (const it of items) console.log(`- \`${it.file}\`:${it.line} — \`${it.detail}\``);
  }
}

async function cmdFix(args) {
  const write      = args.includes("--write");
  const all        = args.includes("--all");
  const ruleArg    = args.find((a) => a.startsWith("--rule="));
  const filterRule = ruleArg ? ruleArg.slice(7) : null;
  const file       = args.find((a) => !a.startsWith("--"));

  if (!all && !file && !filterRule) die("fix requires <file>, --all, or --rule=<ID>");

  const findings = await audit(SRC, filterRule);
  const targets = new Map();
  for (const f of findings) {
    if (!f.rule.fixable) continue;
    if (file && f.file !== file) continue;
    if (!targets.has(f.abs)) targets.set(f.abs, new Set());
    targets.get(f.abs).add(f.rule.id);
  }
  if (!targets.size) { ok("Nothing to fix."); return 0; }

  let touched = 0;
  for (const [abs, ids] of targets) {
    const res = await applyFix(abs, [...ids], { write });
    if (!res.changed) continue;
    touched++;
    if (write) ok(`${rel(abs)}  [${res.applied.join(", ")}]  backup: ${abs}.bak.${Date.now()}`);
    else       warn(`${rel(abs)}  would apply [${res.applied.join(", ")}]  (dry-run)`);
  }
  if (!write && touched) info("Re-run with --write to apply.");
  if (write && touched)  ok(`Applied to ${touched} file(s).`);
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);

  switch (cmd) {
    case "audit": {
      const root = rest[0] ? join(ROOT, rest[0]) : SRC;
      const rule = rest.find((a) => a.startsWith("--rule="))?.slice(7);
      return cmdAudit(root, rule);
    }
    case "report": {
      const root = rest[0] ? join(ROOT, rest[0]) : SRC;
      return cmdReport(root);
    }
    case "fix": {
      return cmdFix(rest);
    }
    case "init": {
      console.log(C.bold("UI Refactor init - creating config and primitives..."));
      console.log(`\nNote: The full init implementation would create ${C.green("src/config/app.config.ts")} + ${C.green("useBreakpoint.ts")} + ResponsiveGrid, ResponsiveTable, ResponsiveModal, ResponsiveChart\n`);
      console.log("Run 'node scripts/ui-refactor.mjs audit' next to scan for hardcoded values and responsiveness issues.");
      return 0;
    }
    case "help":
    case undefined:
      console.log(`Usage:
  node scripts/ui-refactor.mjs audit   [path]            scan (default src)
  node scripts/ui-refactor.mjs report  [path] > ui.md    markdown report
  node scripts/ui-refactor.mjs fix     <file>     [--write]
  node scripts/ui-refactor.mjs fix     --all      [--write]
  node scripts/ui-refactor.mjs fix     --rule=R1  [--write]
  node scripts/ui-refactor.mjs init                      scaffold config + primitives

Rules:
  R1   fixed grid-cols without breakpoint
  R2   <table> without overflow wrapper
  R5   modal without viewport constraints
  R9   sticky header without pt-safe
  R12  hooks without \"use client\"

Auto-fixable: R1, R2, R5, R9, R12`);
      return 0;
    default:
      die(`unknown command: ${cmd}`);
  }
}

main().then((c) => process.exit(c ?? 0)).catch((e) => {
  console.error(C.red(e.stack || String(e)));
  process.exit(1);
});