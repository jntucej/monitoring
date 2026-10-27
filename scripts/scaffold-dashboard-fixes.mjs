#!/usr/bin/env node
/**
 * scripts/scaffold-dashboard-fixes.mjs
 * Dashboard repair cookie cutter (P0/P1/P2 dashboard audit). Idempotent.
 *
 *   list | audit | report | apply [--dry-run] [--only=101,105] [--force] [--verbose] | verify
 *
 * audit / report / verify never write files (verify exits 1 on regressions).
 * apply --dry-run writes nothing (no backups either).
 * Overwrites of pre-existing files create <file>.bak.<ts> first unless --force.
 */

import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ─────────────────────────── bootstrap ─────────────────────────── */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");
const DOCS = path.join(ROOT, "docs", "DASH-FIXES.md");

const argv = process.argv.slice(2);
const CMD = argv[0] || "help";
const FLAGS = parseFlags(argv.slice(1));
const ONLY = FLAGS.only ? new Set(String(FLAGS.only).split(",").map((s) => s.trim())) : null;
const DRY = !!FLAGS["dry-run"];
const FORCE = !!FLAGS.force;
const VERBOSE = !!FLAGS.verbose;

/* ─────────────────────────── ANSI ─────────────────────────── */

const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
const ok = (m) => console.log(`${C.green("✓")} ${m}`);
const warn = (m) => console.log(`${C.yellow("!")} ${m}`);
const info = (m) => console.log(`  ${C.dim(m)}`);
const head = (m) => console.log(`\n${C.bold(C.cyan(`▸ ${m}`))}`);
const die = (m) => { console.error(C.red(`✗ ${m}`)); process.exit(1); };

function parseFlags(args) {
  const out = {};
  for (const a of args) {
    if (!a.startsWith("--")) continue;
    const i = a.indexOf("=");
    const k = i < 0 ? a.slice(2) : a.slice(2, i);
    out[k] = i < 0 ? true : a.slice(i + 1);
  }
  return out;
}

/* ─────────────────────────── fs helpers ─────────────────────────── */

async function readIfExists(p) {
  try { return await fs.readFile(p, "utf8"); } catch { return null; }
}

// Writes `next` to `p`. Never writes in DRY mode. Backs up prior content unless --force.
async function writeIfChanged(p, next) {
  const prev = await readIfExists(p);
  if (prev === next) return { changed: false };
  if (DRY) return { changed: true };
  if (prev !== null && !FORCE) {
    await fs.writeFile(`${p}.bak.${Date.now()}`, prev, "utf8");
  }
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, next, "utf8");
  return { changed: true };
}

async function* walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.bak\./.test(e.name)) yield p;
  }
}

async function listTsx() {
  const out = [];
  for await (const f of walk(APP)) out.push(f);
  return out;
}

const rel = (p) => path.relative(ROOT, p);

/* ─────────────────────────── source helpers ─────────────────────────── */

// Index just past the brace that closes the first "{" at or after `from`.
// Skips string/template/comment contents well enough for component code.
function matchBrace(src, from) {
  const open = src.indexOf("{", from);
  if (open < 0) return -1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const q = ch;
      i++;
      while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) return -1; continue; }
    if (ch === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); if (i < 0) return -1; i++; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

// Insert an import line after the last top-level import (or after "use client").
function addImportLine(src, line) {
  if (src.includes(line)) return src;
  const re = /^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$/gm;
  let last = null, m;
  while ((m = re.exec(src))) last = m;
  if (last) {
    const at = last.index + last[0].length;
    return `${src.slice(0, at)}\n${line}${src.slice(at)}`;
  }
  return src.replace(/^("use client";\s*\n)?/, (x) => `${x}${line}\n`);
}

// Annotate a line with a marker, only once.
function annotateBefore(src, index, marker) {
  const lineStart = src.lastIndexOf("\n", index - 1) + 1;
  const prevLine = src.slice(src.lastIndexOf("\n", lineStart - 2) + 1, lineStart);
  if (prevLine.includes(marker)) return null;
  return src.slice(0, lineStart) + marker + "\n" + src.slice(lineStart);
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 101 — remove empty "Page toolbar" placeholder divs
   ═══════════════════════════════════════════════════════════════════════ */

async function step101({ mode }) {
  head("Step 101 — remove empty Page toolbar divs");
  let hits = 0, fixed = 0;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src || !/Page toolbar/i.test(src)) continue;
    // Comment marker + an immediately-following div that has no children.
    const next = src
      .replace(/^[ \t]*\{\/\*[^*]*Page toolbar[\s\S]*?\*\/\}[ \t]*\n/gim, "")
      .replace(/^[ \t]*<div\b[^>]*>\s*<\/div>[ \t]*\n/gm, "");
    if (next === src) continue;
    hits++;
    if (mode === "apply" && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} file(s) with empty toolbar placeholders`);
  return { step: 101, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 102 — local timeAgo/relativeTime → fmtRelative
   Only touches files whose local helper body can be brace-matched cleanly.
   Call sites are rewritten only when the argument is a string (see note).
   ═══════════════════════════════════════════════════════════════════════ */

const TIME_HELPERS = "timeAgo|relativeTime|formatRelative|getTimeAgo";

async function step102({ mode }) {
  head("Step 102 — consolidate timeAgo → fmtRelative");
  let hits = 0, fixed = 0;
  const declRe = new RegExp(`^[ \\t]*(?:export\\s+)?(?:function\\s+(${TIME_HELPERS})\\s*\\(|const\\s+(${TIME_HELPERS})\\s*=)`, "m");

  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src) continue;
    const m = declRe.exec(src);
    if (!m) continue;
    hits++;
    if (mode !== "apply") continue;

    const name = m[1] || m[2];
    const declStart = m.index + (m[0].length - m[0].trimStart().length);
    const end = matchBrace(src, declStart);
    if (end < 0) { warn(`${rel(f)}: could not parse ${name}; skipped`); continue; }
    // Remove declaration (and trailing ';' for const arrows).
    let stop = end;
    if (src[stop] === ";") stop++;
    let next = src.slice(0, declStart) + src.slice(stop).replace(/^\n/, "");

    next = next.replace(new RegExp(`\\b(?:${TIME_HELPERS})\\s*\\(`, "g"), "fmtRelative(");
    if (!/\bfmtRelative\b/.test(src.replace(declRe, ""))) continue; // nothing to wire
    if (/import\s*\{[^}]*\bfmtRelative\b[^}]*\}\s*from\s*["']@\/lib\/formatters["']/.test(next) === false) {
      const existing = next.match(/import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/formatters["'];?/);
      if (existing) {
        next = next.replace(existing[0], `import {${existing[1].trimEnd()}${existing[1].trimEnd().endsWith(",") ? "" : ","} fmtRelative } from "@/lib/formatters";`);
      } else {
        next = addImportLine(next, `import { fmtRelative } from "@/lib/formatters";`);
      }
    }
    if (await writeIfChanged(f, next).then((r) => r.changed)) fixed++;
  }
  info(`${hits} file(s) declare a local time helper`);
  return { step: 102, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 103 — collapse double polling
   Removes ONLY standalone `usePolling(...);` statements whose return value
   is unused. Files where the return value is used are reported, not edited.
   ═══════════════════════════════════════════════════════════════════════ */

async function step103({ mode }) {
  head("Step 103 — collapse double polling (usePolling + useLiveRefresh)");
  let hits = 0, fixed = 0;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src) continue;
    if (!/\busePolling\s*\(/.test(src) || !/\buseLiveRefresh\s*\(/.test(src)) continue;
    hits++;
    if (mode !== "apply") continue;

    let next = src;
    // Standalone statement: line starts with usePolling( and the call closes with ");".
    let idx;
    while ((idx = next.search(/^[ \t]*usePolling\s*\(/m)) >= 0) {
      const callStart = next.indexOf("usePolling", idx);
      const open = next.indexOf("(", callStart);
      let depth = 0, i = open;
      for (; i < next.length; i++) {
        if (next[i] === "(") depth++;
        else if (next[i] === ")") { depth--; if (depth === 0) break; }
      }
      const after = next.slice(i + 1).match(/^\s*;[ \t]*\n?/);
      if (!after) { warn(`${rel(f)}: usePolling not a plain statement; manual review`); break; }
      next = next.slice(0, idx) + next.slice(i + 1 + after[0].length);
    }
    if (/\busePolling\b/.test(next.replace(/^import.*$/gm, ""))) {
      warn(`${rel(f)}: usePolling still referenced (value used); manual review`);
      continue;
    }
    next = next.replace(/^[ \t]*import\s*\{\s*usePolling\s*\}\s*from\s*["']@\/hooks\/usePolling["'];?[ \t]*\n/m, "");
    if (next !== src && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} file(s) call both polling hooks`);
  return { step: 103, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 104 — aria-live on KPI numbers (idempotent)
   ═══════════════════════════════════════════════════════════════════════ */

async function step104({ mode }) {
  head("Step 104 — add aria-live to KPI numbers");
  let hits = 0, fixed = 0;
  const openRe = /<(span|div)\b([^>]*\bclassName="[^"]*\bkpi-number\b[^"]*"[^>]*)>/g;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src || !/\bkpi-number\b/.test(src)) continue;
    const next = src.replace(openRe, (m, tag, attrs) =>
      /aria-live=/.test(attrs) ? m : `<${tag}${attrs} aria-live="polite" aria-atomic="true">`);
    if (next === src) continue;
    hits++;
    if (mode === "apply" && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} file(s) contain KPI numbers without aria-live`);
  return { step: 104, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 105 — type="button" on non-submit <button> with handlers
   ═══════════════════════════════════════════════════════════════════════ */

async function step105({ mode }) {
  head('Step 105 — add type="button" to untyped buttons');
  let hits = 0, fixed = 0;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src || !/<button\b/.test(src)) continue;
    const next = src.replace(/<button\b((?:[^>]|\n)*?)(\/?>)/g, (m, attrs, end) => {
      if (/\btype\s*=/.test(attrs)) return m;
      if (!/\bonClick\s*=/.test(attrs)) return m; // onSubmit buttons are left alone
      return `<button type="button"${attrs}${end}`;
    });
    if (next === src) continue;
    hits++;
    if (mode === "apply" && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} file(s) have untyped <button>s`);
  return { step: 105, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 106 — loading.tsx + error.tsx for (mess) and (person) groups
   Only creates files that don't exist. Never overwrites.
   ═══════════════════════════════════════════════════════════════════════ */

const groupError = (name) => `"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportClientError } from "@/lib/monitoring";

export default function ${name}Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { component: "${name}GroupError" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-rose-500" aria-hidden />
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {error.digest ? \`Ref: \${error.digest}\` : "An unexpected error occurred."}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-500 hover:bg-emerald-500/20"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
`;

const GROUP_LOADING = `import { PageLoading } from "@/components/shared/LoadingStates";

export default function Loading() {
  return <PageLoading />;
}
`;

async function step106({ mode }) {
  head("Step 106 — loading/error boundaries for (mess) and (person)");
  let hits = 0, fixed = 0;
  for (const g of ["(mess)", "(person)"]) {
    const dir = path.join(APP, g);
    if (!existsSync(dir)) continue;
    const name = g.replace(/[()]/g, "");
    for (const [file, body] of [["loading.tsx", GROUP_LOADING], ["error.tsx", groupError(name)]]) {
      const p = path.join(dir, file);
      if (existsSync(p)) continue;
      hits++;
      if (mode !== "apply") continue;
      if (!DRY) await fs.writeFile(p, body, "utf8");
      ok(`${DRY ? "Would write" : "Wrote"} ${rel(p)}`);
      fixed++;
    }
  }
  info(`${hits} boundary file(s) missing`);
  return { step: 106, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 107 — flag clearCache() called in render path (annotate only)
   A call is "render-path" if no enclosing handler/effect keyword precedes it
   within the same component. Annotation is idempotent.
   ═══════════════════════════════════════════════════════════════════════ */

const MARK107 = "/* DASH-FIX-107: move out of render path */";

async function step107({ mode }) {
  head("Step 107 — flag clearCache() in render path");
  let hits = 0, fixed = 0;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src || !/\bclearCache\s*\(/.test(src)) continue;
    let next = src;
    const re = /^[ \t]*clearCache\s*\(/gm;
    const positions = [];
    let m;
    while ((m = re.exec(src))) {
      const before = src.slice(Math.max(0, m.index - 800), m.index);
      if (!/(onClick|useEffect|useCallback|onSubmit|\bhandle\w+|\bon[A-Z]\w*\s*[=:(])/.test(before)) positions.push(m.index);
    }
    if (!positions.length) continue;
    hits += positions.length;
    if (mode !== "apply") continue;
    for (const pos of positions.reverse()) {
      const out = annotateBefore(next, pos, MARK107);
      if (out) next = out;
    }
    if (next !== src && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} render-path clearCache() call(s)`);
  return { step: 107, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 108 — flag "restricted at this tier" panels (annotate only)
   ═══════════════════════════════════════════════════════════════════════ */

const MARK108 = "{/* DASH-FIX-108: review — delete or wire to a real API */}";
const RESTRICTED_RE = /restricted at this tier|not exposed at this tier/gi;

async function step108({ mode }) {
  head("Step 108 — flag 'restricted at this tier' panels");
  let hits = 0, fixed = 0;
  const flagged = [];
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src) continue;
    const found = [...src.matchAll(RESTRICTED_RE)];
    if (!found.length) continue;
    hits += found.length;
    flagged.push({ file: rel(f), count: found.length });
    if (mode !== "apply") continue;
    let next = src;
    for (const x of found.reverse()) {
      const out = annotateBefore(next, x.index, MARK108);
      if (out) next = out;
    }
    if (next !== src && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} panel mention(s) across ${flagged.length} file(s)`);
  if (VERBOSE) for (const { file, count } of flagged) info(`  ${file} — ${count}`);
  return { step: 108, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 109 / 110 — emit shared hook and badge if missing
   ═══════════════════════════════════════════════════════════════════════ */

const USEPROBE_SRC = `"use client";

/**
 * useProbe — fetch a read-only endpoint; report 403 as \`restricted\` so panels
 * can render an empty state instead of an error banner.
 */
import { useEffect, useState } from "react";
import { cachedFetch } from "@/hooks/useApiResource";

export interface ProbeResult<T> {
  data: T | null;
  restricted: boolean;
  error: string | null;
  loading: boolean;
}

export function useProbe<T>(url: string | null, ttlMs = 30_000): ProbeResult<T> {
  const [state, setState] = useState<ProbeResult<T>>({
    data: null,
    restricted: false,
    error: null,
    loading: !!url,
  });

  useEffect(() => {
    if (!url) {
      setState({ data: null, restricted: false, error: null, loading: false });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));

    cachedFetch<T>(url, { ttlMs })
      .then((data) => {
        if (alive) setState({ data, restricted: false, error: null, loading: false });
      })
      .catch((e: { status?: number; message?: string }) => {
        if (!alive) return;
        setState({
          data: null,
          restricted: e.status === 403,
          error: e.status === 403 ? null : e.message ?? "Failed to load",
          loading: false,
        });
      });

    return () => {
      alive = false;
    };
  }, [url, ttlMs]);

  return state;
}
`;

const PASS_STATUS_BADGE = `import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, { cls: string; label: string }> = {
  PENDING:         { cls: "bg-amber-500/10 text-amber-500",     label: "Pending" },
  APPROVED:        { cls: "bg-emerald-500/10 text-emerald-500", label: "Approved" },
  APPROVED_PARENT: { cls: "bg-emerald-500/10 text-emerald-500", label: "Parent approved" },
  APPROVED_ADMIN:  { cls: "bg-emerald-500/10 text-emerald-500", label: "Admin approved" },
  REJECTED:        { cls: "bg-rose-500/10 text-rose-500",       label: "Rejected" },
  EXPIRED:         { cls: "bg-slate-500/10 text-slate-400",     label: "Expired" },
  CANCELLED:       { cls: "bg-slate-500/10 text-slate-400",     label: "Cancelled" },
  COMPLETED:       { cls: "bg-sky-500/10 text-sky-500",         label: "Completed" },
};

export function PassStatusBadge({ status, className }: { status: string; className?: string }) {
  const v = VARIANTS[status] ?? VARIANTS.PENDING;
  return <Badge className={\`\${v.cls} \${className ?? ""}\`.trim()}>{v.label}</Badge>;
}
`;

async function emitIfMissing(step, relPath, body, mode) {
  const p = path.join(ROOT, relPath);
  if (existsSync(p)) { info(`${relPath} exists — skipping`); return { step, hits: 0, fixed: 0 }; }
  if (mode !== "apply") { info(`Would write ${relPath}`); return { step, hits: 1, fixed: 0 }; }
  if (!DRY) { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, body, "utf8"); }
  ok(`${DRY ? "Would write" : "Wrote"} ${relPath}`);
  return { step, hits: 1, fixed: 1 };
}

const step109 = ({ mode }) => (head("Step 109 — emit shared useProbe"), emitIfMissing(109, "src/hooks/useProbe.ts", USEPROBE_SRC, mode));
const step110 = ({ mode }) => (head("Step 110 — emit shared PassStatusBadge"), emitIfMissing(110, "src/components/shared/PassStatusBadge.tsx", PASS_STATUS_BADGE, mode));

/* ═══════════════════════════════════════════════════════════════════════
   STEP 111 — flag un-memoized recharts data props (annotate only)
   ═══════════════════════════════════════════════════════════════════════ */

const MARK111 = "/* DASH-FIX-111: wrap data in useMemo */";

async function step111({ mode }) {
  head("Step 111 — flag un-memoized chart data");
  let hits = 0, fixed = 0;
  for (const f of await listTsx()) {
    const src = await readIfExists(f);
    if (!src || !/from\s+["']recharts["']/.test(src)) continue;
    const positions = [];
    for (const m of src.matchAll(/\bdata=\{([^}]+)\}/g)) {
      const before = src.slice(Math.max(0, m.index - 900), m.index);
      if (!/useMemo\s*\(/.test(before)) positions.push(m.index);
    }
    if (!positions.length) continue;
    hits++;
    if (mode !== "apply") continue;
    let next = src;
    for (const pos of positions.reverse()) {
      const out = annotateBefore(next, pos, MARK111);
      if (out) next = out;
    }
    if (next !== src && (await writeIfChanged(f, next)).changed) fixed++;
  }
  info(`${hits} chart file(s) with un-memoized data props`);
  return { step: 111, hits, fixed };
}

/* ═══════════════════════════════════════════════════════════════════════
   REGISTRY + COMMANDS
   ═══════════════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 101, name: "Empty Page toolbar divs",       fn: step101 },
  { id: 102, name: "Local timeAgo → fmtRelative",   fn: step102 },
  { id: 103, name: "Collapse double polling",       fn: step103 },
  { id: 104, name: "KPI aria-live",                 fn: step104 },
  { id: 105, name: 'type="button" on buttons',      fn: step105 },
  { id: 106, name: "Group loading/error boundaries", fn: step106 },
  { id: 107, name: "clearCache() in render (flag)", fn: step107 },
  { id: 108, name: "Restricted panels (flag)",      fn: step108 },
  { id: 109, name: "Emit useProbe hook",            fn: step109 },
  { id: 110, name: "Emit PassStatusBadge",          fn: step110 },
  { id: 111, name: "Un-memoized chart data (flag)", fn: step111 },
];

const selected = () => STEPS.filter((s) => !ONLY || ONLY.has(String(s.id)));

async function runSteps(mode) {
  const results = [];
  for (const s of selected()) {
    try { results.push(await s.fn({ mode })); }
    catch (e) { warn(`Step ${s.id} failed: ${e.message}`); results.push({ step: s.id, hits: -1, fixed: 0, error: e.message }); }
  }
  return results;
}

function markdown(results) {
  const lines = [
    "# Dashboard Fixes — Summary", "",
    `_Generated ${new Date().toISOString()}_`, "",
    "| Step | Name | Remaining | Fixed |", "|------|------|-----------|-------|",
  ];
  for (const r of results) {
    const name = STEPS.find((s) => s.id === r.step)?.name ?? "";
    lines.push(`| ${r.step} | ${name} | ${r.hits ?? 0} | ${r.fixed ?? 0} |`);
  }
  lines.push("", "## Manual follow-ups", "",
    "- **107 / 111** — annotated; the move/useMemo wrap must be done by hand.",
    "- **108** — each 'restricted at this tier' panel must be deleted or wired to a real API.", "");
  return lines.join("\n");
}

async function cmdList() {
  console.log(C.bold("\nAvailable steps:\n"));
  for (const s of STEPS) {
    const on = !ONLY || ONLY.has(String(s.id));
    console.log(`  ${on ? C.green("●") : C.dim("○")} ${C.bold(String(s.id))}  ${s.name}`);
  }
  console.log();
}

async function cmdAudit() {
  head("Audit (read-only)");
  const results = await runSteps("audit");
  const total = results.reduce((n, r) => n + Math.max(0, r.hits ?? 0), 0);
  console.log(`\n${total} remaining issue(s). Run 'report' for markdown.`);
  return results;
}

async function cmdApply() {
  head(`Apply${DRY ? " (dry run)" : ""}`);
  const results = await runSteps("apply");
  const md = markdown(results);
  if (DRY) info("(dry run — nothing written)");
  else { await fs.mkdir(path.dirname(DOCS), { recursive: true }); await fs.writeFile(DOCS, md, "utf8"); ok(`Wrote ${rel(DOCS)}`); }
  const totalFixed = results.reduce((n, r) => n + (r.fixed ?? 0), 0);
  ok(`Done — ${totalFixed} change(s) across ${results.length} step(s)`);
}

async function cmdReport() {
  const results = await runSteps("audit");
  process.stdout.write(markdown(results) + "\n");
}

// verify: CI gate. Fails if any auto-fixable step (101-106, 109-110) still has hits.
// Annotate-only steps (107, 108, 111) are reported but do not fail the build.
async function cmdVerify() {
  head("Verify (CI gate)");
  const AUTO = new Set([101, 102, 103, 104, 105, 106, 109, 110]);
  const results = await runSteps("audit");
  const failing = results.filter((r) => AUTO.has(r.step) && (r.hits ?? 0) > 0);
  const flagged = results.filter((r) => !AUTO.has(r.step) && (r.hits ?? 0) > 0);
  if (flagged.length) warn(`${flagged.length} manual-review step(s) still flagged (non-blocking)`);
  if (failing.length) {
    console.error(C.red(`✗ Auto-fixable regressions: ${failing.map((r) => r.step).join(", ")} — run: npm run dash:apply:fixes`));
    process.exit(1);
  }
  ok("No auto-fixable dashboard regressions");
}

function cmdHelp() {
  console.log(`
${C.bold("scaffold-dashboard-fixes.mjs")} — dashboard repairs per the audit

  list | audit | report | apply | verify | help

  --only=101,105   subset of steps
  --dry-run        apply: print only, write nothing (no backups)
  --force          overwrite without .bak backup
  --verbose        per-file detail
`);
}

(async function main() {
  switch (CMD) {
    case "list": return cmdList();
    case "audit": return void (await cmdAudit());
    case "report": return cmdReport();
    case "apply": return cmdApply();
    case "verify": return cmdVerify();
    default: return cmdHelp();
  }
})().catch((e) => die(e.stack ?? e.message));
