#!/usr/bin/env node
// One-pass design-debt codemod for unslop-ui findings.
//   node scripts/unslop-fix-all.mjs            -> dry run (report only)
//   node scripts/unslop-fix-all.mjs --apply    -> write changes
//   node scripts/unslop-fix-all.mjs --only=arbitrary,gradient,icons
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");
const ONLY  = (process.argv.find(a => a.startsWith("--only=")) || "").split("=")[1]?.split(",") || null;
const ROOT  = process.cwd();
const DIRS  = ["src"];
const SKIP  = [/opengraph-image/, /\/icon\.tsx?$/, /opengraph-image\.tsx$/];

// @theme token names that have Tailwind utilities generated.
// bg-[var(--bg-base)] -> bg-bg-base (bg-base is a valid @theme utility)
// bg-[var(--action-primary)] -> bg-action-primary
// text-[var(--text-primary)] -> text-text-primary
const THEME_TOKENS = new Set([
  "bg-base","bg-elevated","bg-surface",
  "text-muted","text-primary","text-secondary",
  "border","border-strong","border-subtle",
  "action-danger","action-info","action-primary","action-success","action-warning",
  "alert-critical","alert-success","alert-warning",
  "unit-a","unit-b","unit-c",
  "canvas","focus-ring",
]);

// Semantic palette mapping (hex -> token name)
const HEX = {
  "#10b981":"action-success","#22c55e":"action-success","#059669":"action-success",
  "#f43f5e":"action-danger",  "#ef4444":"action-danger",  "#dc2626":"action-danger",
  "#f59e0b":"action-warning","#eab308":"action-warning","#f97316":"action-warning",
  "#3b82f6":"action-primary","#6366f1":"action-primary",
  "#0ea5e9":"action-info",   "#06b6d4":"action-info",
  "#8b5cf6":"unit-c",        "#a855f7":"unit-c",         "#d946ef":"unit-c",
  "#64748b":"text-muted",    "#6b7280":"text-muted",
};
const TEXT_SCALE = [12,14,16,18,20,24,30,36];
const nearest = (n, arr) => arr.reduce((b,c)=>Math.abs(c-n)<Math.abs(b-n)?c:b, arr[0]);
const TEXT_MAP = {12:"xs",14:"sm",16:"base",18:"lg",20:"xl",24:"2xl",30:"3xl",36:"4xl"};

function resolve(prefix, raw) {
  const v = raw.trim();

  // bg-[var(--bg-base)] -> bg-bg-base
  // Only resolve if the var name is a known @theme token.
  const vm = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
  if (vm) {
    const name = vm[1].replace(/^--/, "");
    // --color-X pattern: bg-[var(--color-bg-base)] -> bg-bg-base
    if (name.startsWith("color-")) {
      const token = name.slice(6);
      if (THEME_TOKENS.has(token)) return prefix + token;
      return null;
    }
    // Raw CSS var: bg-[var(--bg-base)] -> bg-base
    // If the token already starts with the same prefix, drop the redundant prefix.
    // bg-[var(--bg-base)] -> bg-base (not bg-bg-base)
    // text-[var(--text-primary)] -> text-primary (not text-text-primary)
    // bg-[var(--action-primary)] -> bg-action-primary (prefix differs, keep)
    if (THEME_TOKENS.has(name)) {
      if (name.startsWith(prefix + "-") || name === prefix) return name;
      return prefix + name;
    }
    // Unknown var: leave untouched
    return null;
  }

  const hex = v.toLowerCase();
  if (HEX[hex]) return prefix + HEX[hex];

  const px = v.match(/^(-?\d*\.?\d+)px$/);
  if (px) {
    const n = parseFloat(px[1]);
    if (prefix.startsWith("rounded")) {
      if (n <= 2)  return "rounded-xs";
      if (n <= 4)  return "rounded-sm";
      if (n <= 6)  return "rounded-md";
      if (n <= 8)  return "rounded-lg";
      if (n <= 12) return "rounded-xl";
      if (n <= 16) return "rounded-2xl";
      return null;
    }
    if (prefix === "text") {
      const snapped = nearest(n, TEXT_SCALE);
      return "text-" + TEXT_MAP[snapped];
    }
    const step = n / 4;
    if (Number.isInteger(step) && step >= 0 && step <= 256) return prefix + String(step);
    return null;
  }
  const rem = v.match(/^(-?\d*\.?\d+)rem$/);
  if (rem) {
    const step = parseFloat(rem[1]) * 4;
    if (Number.isInteger(step) && step >= 0 && step <= 256) return prefix + String(step);
  }
  return null;
}

const CLASS_RE = /\b(bg|text|border|ring|shadow|rounded(?:-[trbl]{1,2})?|p[trblxy]?|m[trblxy]?|gap(?:-[xy])?|space-[xy]|size|w|h|min-w|max-w|min-h|max-h|top|right|bottom|left|inset|z|opacity|from|via|to|fill|stroke|outline|divide|translate-[xy]|scale|duration|leading|tracking|font)-\[([^\]\n]+)\]/g;

const fixArbitrary = s => s.replace(CLASS_RE, (m,p,v) => {
  const resolved = resolve(p, v);
  return resolved || m;
});

const fixGradient = s => s.replace(/\bfrom-(\S+)\s+via-\S+\s+to-(\S+)/g, "from-$1 to-$2");

function fixIcons(s) {
  const sizes = [...s.matchAll(/\bsize-(3(?:\.5)?|4|5|6|7|8|9|10|12)\b/g)].map(m => m[1]);
  if (!sizes.length) return [s, false];
  const freq = {}; for (const x of sizes) freq[x] = (freq[x]||0)+1;
  const keep = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([x])=>parseFloat(x));
  const snap = n => keep.reduce((b,c)=>Math.abs(c-n)<Math.abs(b-n)?c:b, keep[0]);
  let changed = false;
  const out = s.replace(/\bsize-(3(?:\.5)?|4|5|6|7|8|9|10|12)\b/g, (m,x) => {
    const n = parseFloat(x), t = snap(n);
    if (t === n) return m;
    changed = true;
    return "size-" + t;
  });
  return [out, changed];
}

function walk(d, out=[]) {
  for (const e of readdirSync(d)) {
    if (["node_modules",".next",".git","dist","coverage","tests"].includes(e)) continue;
    const p = join(d,e), st = statSync(p);
    if (st.isDirectory()) walk(p,out);
    else if (/\.(tsx|jsx)$/.test(p) && !SKIP.some(r=>r.test(p))) out.push(p);
  }
  return out;
}

const want = k => !ONLY || ONLY.includes(k);
const report = { files:0, arbitrary:0, gradient:0, icons:0, resolved:0, skipped:0 };

for (const f of DIRS.flatMap(d => walk(join(ROOT,d)))) {
  let src = readFileSync(f,"utf8"); const before = src;
  if (want("arbitrary")) {
    const matches = src.match(CLASS_RE) || [];
    for (const m of matches) {
      const parts = m.match(/^(\w+)-\[([^\]]+)\]$/);
      if (parts) {
        const resolved = resolve(parts[1], parts[2]);
        if (resolved) report.resolved++;
        else report.skipped++;
      }
    }
    src = fixArbitrary(src);
    report.arbitrary += matches.length;
  }
  if (want("gradient")) {
    const n = (src.match(/\bvia-\S+/g)||[]).length;
    src = fixGradient(src); report.gradient += n;
  }
  if (want("icons")) {
    const [out,ch] = fixIcons(src); src = out; if (ch) report.icons++;
  }
  if (src !== before) {
    report.files++;
    if (APPLY) writeFileSync(f, src);
  }
}
console.log(JSON.stringify(report,null,2));
if (!APPLY) console.log("\nDry run. Re-run with --apply to write changes.");
