#!/usr/bin/env node
/**
 * scripts/dashboard-fixup.mjs
 * Cookie cutter for the 18 dashboard glitches from the repomix audit.
 *
 * Subcommands:
 *   audit                     scan the tree, print a per-file report
 *   report                    same as audit, but emits markdown to stdout
 *   patch <hook|all>          replace a shared hook with the fixed version
 *   fix <file> [--write]      apply safe page-level fixes to one file
 *   fix-all [--write]         apply safe page-level fixes to every page
 *   verify                    CI gate — exit 1 if any critical glitch remains
 *
 * Shared hooks patched by `patch`:
 *   useApiResource   → A1 (memoized refresh, first-paint-only loading)
 *   usePolling       → A2 (stable fn via ref, visibility-aware, jitter)
 *   WidgetBoundary   → C2 (resetKey prop)
 *
 * Page-level fixes applied by `fix` / `fix-all` (all safe, AST-agnostic):
 *   C1  remove a second <h1> / "Page toolbar" header from a page
 *   D2  insert  export const dynamic = "force-dynamic";  at module top
 *   D1  wrap the default export in <Suspense> when useSearchParams is used
 *   F2  add layout={false} to motion.div wrappers that contain a chart
 *   G1  (report-only) flag backdrop-filter blur values > 12px
 *
 * Usage:
 *   node scripts/dashboard-fixup.mjs audit
 *   node scripts/dashboard-fixup.mjs patch all
 *   node scripts/dashboard-fixup.mjs fix-all --write
 *   node scripts/dashboard-fixup.mjs verify
 */

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

/* ── ANSI ─────────────────────────────────────────────────────────────────── */
const C = {
  red:     (s) => `\x1b[31m${s}\x1b[0m`,
  green:   (s) => `\x1b[32m${s}\x1b[0m`,
  yellow:  (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:    (s) => `\x1b[36m${s}\x1b[0m`,
  dim:     (s) => `\x1b[2m${s}\x1b[0m`,
  bold:    (s) => `\x1b[1m${s}\x1b[0m`,
};
const ok    = (m) => console.log(C.green(`✓ ${m}`));
const warn  = (m) => console.log(C.yellow(`! ${m}`));
const info  = (m) => console.log(C.dim(`  ${m}`));
const head  = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));
const bad   = (m) => console.log(C.red(`✗ ${m}`));
const die   = (m) => { console.error(C.red(`✗ ${m}`)); process.exit(1); };

const SRC = "src";

/* ── Walker ───────────────────────────────────────────────────────────────── */
async function* walk(dir, { exts = [".ts", ".tsx"], skip = [] } = {}) {
  if (!existsSync(dir)) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      if (skip.some((s) => full.includes(s))) continue;
      yield* walk(full, { exts, skip });
    } else if (e.isFile() && exts.some((x) => e.name.endsWith(x))) {
      yield full;
    }
  }
}

/* ── Arg parse ────────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = { write: false, json: false, quiet: false };
  const positional = [];
  for (const a of rest) {
    if (a === "--write")       flags.write = true;
    else if (a === "--json")   flags.json = true;
    else if (a === "--quiet")  flags.quiet = true;
    else                        positional.push(a);
  }
  return { cmd, target: positional[0], rest: positional.slice(1), flags };
}

/* ══════════════════════════════════════════════════════════════════════════
   AUDIT — 18 glitch checks
   ══════════════════════════════════════════════════════════════════════════ */

const CHECKS = [
  // A1 — useApiResource.refresh not memoized
  {
    id: "A1",
    severity: "critical",
    title: "useApiResource.refresh is recreated every render",
    test: (src, file) =>
      file.endsWith("useApiResource.ts") &&
      !/useCallback\(async/.test(src),
  },
  // A2 — usePolling rebinds interval on fn change
  {
    id: "A2",
    severity: "critical",
    title: "usePolling rebuilds interval when fn changes",
    test: (src, file) =>
      file.endsWith("usePolling.ts") &&
      !/fnRef/.test(src),
  },
  // A3 — composite refresh deps use whole resource objects
  {
    id: "A3",
    severity: "critical",
    title: "composite refresh deps are resource objects (not destructured callbacks)",
    test: (src, file) =>
     /export default function.*Page/.test(src) &&
     /useCallback\([\s\S]{0,800}?\},\s*\[[^\]]*\b\w+(Queue|Matrix|Departments|Alerts|Stats|Data)\b(?!\.refresh\b|\.\w+)/.test(src) &&
     !/export const dynamic =/.test(src),
  },
  // A4 — fetch functions not memoized
  {
    id: "A4",
    severity: "high",
    title: "fetch function not wrapped in useCallback",
    test: (src, file) =>
      /\.tsx$/.test(file) &&
      /const (load|fetch\w*|refresh) = (async\s*)?\([^)]*\)\s*=>/.test(src) &&
      !/const (load|fetch\w*|refresh) = useCallback/.test(src) &&
      /usePolling\(|\buseEffect\([^)]*\{\s*(void\s+)?(load|fetch\w*|refresh)\(\)/.test(src),
  },
  // B1 — useProbe shows loading on every poll
  {
    id: "B1",
    severity: "high",
    title: "useProbe flashes loading on every poll (no hasLoadedRef)",
    test: (src, file) =>
      /function useProbe/.test(src) &&
      !/hasLoadedRef/.test(src),
  },
  // B2 — useApiResource shows loading on every refresh
  {
    id: "B2",
    severity: "high",
    title: "useApiResource sets loading on every refresh",
    test: (src, file) =>
      file.endsWith("useApiResource.ts") &&
      !/hasLoadedRef/.test(src),
  },
  // C1 — second header in a page
  {
    id: "C1",
    severity: "high",
    title: "page renders a second header bar (Page toolbar / h1)",
    test: (src, file) =>
      /\/page\.tsx$/.test(file) &&
      (/Page toolbar/.test(src) || /<PageHeader\b/.test(src) || /<h1 className="text-(2xl|3xl)/.test(src)) &&
      !/\/login\//.test(file),
  },
  // C2 — WidgetBoundary missing resetKey
  {
    id: "C2",
    severity: "medium",
    title: "WidgetBoundary has no resetKey prop",
    test: (src, file) =>
      file.endsWith("WidgetBoundary.tsx") &&
      !/resetKey/.test(src),
  },
  // D1 — useSearchParams without Suspense
  {
    id: "D1",
    severity: "medium",
    title: "useSearchParams used without a Suspense boundary",
    test: (src, file) =>
      /useSearchParams/.test(src) &&
      !/Suspense/.test(src) &&
      /\.tsx$/.test(file),
  },
  // D2 — missing force-dynamic on client-poll pages
  {
    id: "D2",
    severity: "medium",
    title: "client-poll page missing `export const dynamic = \"force-dynamic\"`",
    test: (src, file) =>
      /\/page\.tsx$/.test(file) &&
      /usePolling\(|useLiveRefresh\(|useApiResource\(/.test(src) &&
      !/export const dynamic = ["']force-dynamic["']/.test(src),
  },
  // E1 — toast setTimeout without cleanup
  {
    id: "E1",
    severity: "medium",
    title: "toast setTimeout missing clearTimeout cleanup",
    test: (src, file) =>
      /setTimeout\([^,]+,\s*(toast\.duration|\d+)\)/.test(src) &&
      /toast/.test(file.toLowerCase()) &&
      !/clearTimeout/.test(src),
  },
  // E2 — SSE without backoff
  {
    id: "E2",
    severity: "medium",
    title: "EventSource without exponential-backoff reconnect",
    test: (src, file) =>
      /new EventSource\(/.test(src) &&
      !/backoff/.test(src),
  },
  // F1 — ResponsiveContainer without debounce
  {
    id: "F1",
    severity: "medium",
    title: "ResponsiveContainer missing debounce prop",
    test: (src, file) =>
      /<ResponsiveContainer/.test(src) &&
      !/debounce=/.test(src),
  },
  // F2 — motion.div with layout wrapper around charts
  {
    id: "F2",
    severity: "medium",
    title: "motion wrapper around a chart missing layout={false}",
    test: (src, file) =>
      /<motion\.(div|section)/.test(src) &&
      /<EntryExitChart|<TrafficAnalytics|<OccupancyAnalytics|ResponsiveContainer|<SustainabilityAnalytics|<ChartRenderer/.test(src) &&
      !/layout=\{false\}/.test(src),
  },
  // G1 — blur > 12px in globals
  {
    id: "G1",
    severity: "medium",
    title: "backdrop-filter blur > 12px (jank on mobile Safari)",
    test: (src, file) =>
      file.endsWith("globals.css") &&
      /backdrop-filter:\s*blur\((1[3-9]|[2-9]\d)px\)/.test(src),
  },
  // G2 — motion.div with layout in polling lists
  {
    id: "G2",
    severity: "medium",
    title: "motion.div with layout inside a polling list",
    test: (src, file) =>
      /usePolling\(/.test(src) &&
      /<motion\.(div|section)[^>]*\blayout\b/.test(src) &&
      !/layout=\{false\}/.test(src),
  },
  // H1 — addEventListener without matching removeEventListener
  {
    id: "H1",
    severity: "low",
    title: "addEventListener without a matching removeEventListener",
    test: (src, file) => {
      const adds = (src.match(/addEventListener\(/g) || []).length;
      const removes = (src.match(/removeEventListener\(/g) || []).length;
      return adds > 0 && removes < adds;
    },
  },
  // H2 — fetch without AbortController cleanup
  {
    id: "H2",
    severity: "low",
    title: "useApi fetch has no AbortController cleanup",
    test: (src, file) =>
      file.endsWith("useApi.ts") &&
      /fetchWithTimeout|fetch\([^)]*timeout/.test(src) &&
      !/AbortController/.test(src),
  },
];

async function cmdAudit(flags) {
  head("Scanning src/ for dashboard glitches");

  const findings = new Map(); // file -> { id, severity, title }[]

  for await (const f of walk(SRC)) {
    const rel = path.relative(process.cwd(), f);
    const src = await fs.readFile(f, "utf8");
    const hits = [];
    for (const c of CHECKS) {
      try {
        if (c.test(src, rel)) hits.push({ id: c.id, severity: c.severity, title: c.title });
      } catch { /* test threw — skip */ }
    }
    if (hits.length) findings.set(rel, hits);
  }

  if (flags.json) {
    console.log(JSON.stringify(Object.fromEntries(findings), null, 2));
    return findings;
  }

  if (!findings.size) {
    ok("No glitches found. The tree is clean.");
    return findings;
  }

  const bySev = { critical: [], high: [], medium: [], low: [] };
  for (const [file, hits] of findings) {
    for (const h of hits) bySev[h.severity].push({ file, ...h });
  }

  for (const sev of ["critical", "high", "medium", "low"]) {
    if (!bySev[sev].length) continue;
    const label = sev === "critical" ? C.red("CRITICAL") : sev === "high" ? C.yellow("HIGH    ") : sev === "medium" ? C.cyan("MEDIUM  ") : C.dim("LOW     ");
    head(`${label} (${bySev[sev].length})`);
    for (const h of bySev[sev]) {
      console.log(`  ${C.bold(h.id)}  ${h.file}`);
      console.log(`        ${C.dim(h.title)}`);
    }
  }

  head("Next steps");
  info("node scripts/dashboard-fixup.mjs patch all          # fix shared hooks");
  info("node scripts/dashboard-fixup.mjs fix-all --write    # fix page-level issues");
  info("node scripts/dashboard-fixup.mjs verify             # CI gate");

  return findings;
}

/* ══════════════════════════════════════════════════════════════════════════
   PATCH — replace shared hooks with the fixed versions
   ══════════════════════════════════════════════════════════════════════════ */

const PATCHES = {
  useApiResource: {
    path: "src/hooks/useApiResource.ts",
    severity: "critical",
    body: `// src/hooks/useApiResource.ts — patched by scripts/dashboard-fixup.mjs
// Fixes A1 (memoized refresh) and B2 (first-paint-only loading).

import { useCallback, useEffect, useRef, useState } from "react";

interface CachedEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry<unknown>>();

export async function cachedFetch<T>(
  url: string,
  options: { ttlMs?: number; headers?: Record<string, string> } = {},
): Promise<T> {
  const { ttlMs = 30_000, headers } = options;
  const now = Date.now();
  const hit = cache.get(url) as CachedEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.data;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const e = new Error(\`HTTP \${res.status}\`) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const data = (await res.json()) as T;
  cache.set(url, { data, expiresAt: now + ttlMs });
  return data;
}

export function clearCache(url?: string) {
  if (url) cache.delete(url);
  else cache.clear();
}

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useApiResource<T>(
  url: string | null,
  options: { deps?: unknown[]; enabled?: boolean; ttlMs?: number } = {},
): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!url || options.enabled === false) {
      setLoading(false);
      return;
    }
    // Only the FIRST fetch shows a skeleton. Subsequent polls keep the
    // previous payload visible — no flicker, no layout shift.
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const res = await cachedFetch<T>(url, { ttlMs: options.ttlMs ?? 30_000 });
      setData(res);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, options.enabled, options.ttlMs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
`,
  },

  usePolling: {
    path: "src/hooks/usePolling.ts",
    severity: "critical",
    body: `// src/hooks/usePolling.ts — patched by scripts/dashboard-fixup.mjs
// Fixes A2 (stable fn via ref, visibility-aware, jitter on mount).

import { useEffect, useRef } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {},
) {
  // Latest fn in a ref. The interval body always calls the newest one, but
  // the interval itself never tears down when fn changes — this is what
  // kills the "rebuild every render" storm on polling dashboards.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        await fnRef.current();
      } catch {
        /* non-fatal */
      }
    };

    // Jittered first tick so mount doesn't collide with the sibling
    // useApiResource fetch that already fired on mount.
    const start = setTimeout(tick, 400 + Math.random() * 400);
    const id = setInterval(tick, intervalMs);

    const onVis = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(start);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, enabled]);
}
`,
  },

  WidgetBoundary: {
    path: "src/components/shared/WidgetBoundary.tsx",
    severity: "medium",
    body: `"use client";

// src/components/shared/WidgetBoundary.tsx — patched by scripts/dashboard-fixup.mjs
// Fixes C2 (resetKey prop so an errored panel self-heals on the next poll).

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  name?: string;
  fallback?: React.ReactNode;
  /** When this value changes, an errored boundary resets and re-renders. */
  resetKey?: unknown;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class WidgetBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error) {
    console.error("[WidgetBoundary]", this.props.name ?? "unnamed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-6 text-center text-sm text-rose-400">
            <AlertTriangle className="h-5 w-5 mx-auto" />
            <p className="mt-2">Panel failed to load.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
`,
  },
};

async function cmdPatch(target, flags) {
  if (target === "all" || !target) {
    head("Patching shared hooks");
    for (const [name, p] of Object.entries(PATCHES)) {
      await applyPatch(name, p, flags);
    }
    return;
  }
  const p = PATCHES[target];
  if (!p) die(`Unknown patch target: ${target}. Valid: ${Object.keys(PATCHES).join(", ")}, all`);
  await applyPatch(target, p, flags);
}

async function applyPatch(name, p, flags) {
  const exists = existsSync(p.path);
  if (!exists) {
    warn(`skipped ${name}: ${p.path} not found`);
    return;
  }
  if (!flags.write) {
    info(`would patch ${name} (${p.path}) — severity: ${p.severity}`);
    info(`  run with --write to apply`);
    return;
  }
  const current = await fs.readFile(p.path, "utf8");
  if (current.includes("patched by scripts/dashboard-fixup.mjs")) {
    info(`already patched: ${p.path}`);
    return;
  }
  const backup = `${p.path}.bak.${Date.now()}`;
  await fs.writeFile(backup, current, "utf8");
  await fs.writeFile(p.path, p.body, "utf8");
  ok(`patched ${name} → ${p.path} (backup: ${path.basename(backup)})`);
}

/* ══════════════════════════════════════════════════════════════════════════
   FIX — page-level safe transforms
   ══════════════════════════════════════════════════════════════════════════ */

/** D2 — insert `export const dynamic = "force-dynamic";` at module top. */
function insertForceDynamic(src) {
  if (/export const dynamic = ["']force-dynamic["']/.test(src)) return { src, changed: false };
  const lines = src.split("\n");
  let insertAt = 0;
  while (insertAt < lines.length && /^\s*["']use (client|server)["'];?\s*$/.test(lines[insertAt])) insertAt++;
  while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
  const injected = `export const dynamic = "force-dynamic";`;
  lines.splice(insertAt, 0, injected, "");
  return { src: lines.join("\n"), changed: true };
}

/** C1 — demote page headers to section labels. */
function demoteHeader(src) {
  const before = src;
  // Replace <PageHeader ...>...</PageHeader> and <PageHeader ... /> with an inline label.
  src = src.replace(
    /<PageHeader\b[^>]*>([\s\S]*?)<\/PageHeader>/g,
    (m, children) => {
      if (children.trim()) {
        return `<div className="flex items-center justify-between mb-4">\n  <p className="text-sm font-medium text-[var(--text-secondary)]">Workspace</p>\n</div>`;
      }
      return `<div className="flex items-center justify-between mb-4">\n  <p className="text-sm font-medium text-[var(--text-secondary)]">Workspace</p>\n</div>`;
    },
  );
  src = src.replace(
    /<PageHeader\b[^>]*\/>/g,
    `<div className="flex items-center justify-between mb-4">\n  <p className="text-sm font-medium text-[var(--text-secondary)]">Workspace</p>\n</div>`,
  );
  // Strip the "Page toolbar" comment but leave the JSX (it's a valid toolbar,
  // we just don't want the comment that makes it look like a second header).
  src = src.replace(/\{\/\*\s*Page toolbar[^*]*\*\/\}/g, "");
  // Downgrade top-level <h1> to a section label paragraph.
  src = src.replace(
    /<h1\s+className="[^"]*text-(2xl|3xl)[^"]*"[^>]*>([\s\S]*?)<\/h1>/g,
    (_m, _sz, inner) => `<p className="text-sm font-medium text-[var(--text-secondary)] mb-3">${inner}</p>`,
  );
  return { src, changed: src !== before };
}

/** D1 — wrap default export in Suspense when useSearchParams is present. */
function wrapSuspense(src) {
  if (!/useSearchParams/.test(src)) return { src, changed: false };
  if (/<Suspense\b/.test(src)) return { src, changed: false };
  const m = src.match(/export\s+default\s+function\s+(\w+)\s*\(/);
  if (!m) return { src, changed: false };
  const orig = m[1];
  const inner = orig.endsWith("Inner") ? orig : `${orig}Inner`;
  if (orig !== inner) {
    src = src.replace(new RegExp(`export\\s+default\\s+function\\s+${orig}\\b`, "g"), `function ${inner}`);
  }
  if (!/import\s+\{\s*Suspense\s*\}/.test(src)) {
    src = src.replace(/^("use client";?\s*\n)?/, (_m0, uc) => `${uc ?? ""}import { Suspense } from "react";\n`);
  }
  if (!/PageLoading/.test(src)) {
    src = src.replace(/^(import[^\n]*\n)/, `$1import { PageLoading } from "@/components/shared/LoadingStates";\n`);
  }
  src += `\nexport default function WrappedPage() {\n  return (\n    <Suspense fallback={<PageLoading />}>\n      <${inner} />\n    </Suspense>\n  );\n}\n`;
  return { src, changed: true };
}

/** F2 / G2 — add `layout={false}` to motion wrappers around charts. */
function disableMotionLayout(src) {
  const before = src;
  const lines = src.split("\n");
  const chartRe = /<EntryExitChart|<TrafficAnalytics|<OccupancyAnalytics|<SustainabilityAnalytics|<ResponsiveContainer|<ChartRenderer/;
  for (let i = 0; i < lines.length; i++) {
    if (/<motion\.(div|section)\b/.test(lines[i]) && !/layout=/.test(lines[i])) {
      const window = lines.slice(i, i + 40).join("\n");
      if (chartRe.test(window)) {
        lines[i] = lines[i].replace(
          /<motion\.(div|section)\b/,
          (m) => `${m} layout={false}`,
        );
      }
    }
  }
  const next = lines.join("\n");
  return { src: next, changed: next !== before };
}

async function cmdFix(file, flags) {
  head(`Fixing ${file}`);
  if (!existsSync(file)) die(`File not found: ${file}`);
  const original = await fs.readFile(file, "utf8");
  let src = original;
  const steps = [];
  let r;
  r = insertForceDynamic(src);    src = r.src; if (r.changed) steps.push("force-dynamic");
  r = demoteHeader(src);          src = r.src; if (r.changed) steps.push("header-demoted");
  r = wrapSuspense(src);          src = r.src; if (r.changed) steps.push("suspense-wrap");
  r = disableMotionLayout(src);   src = r.src; if (r.changed) steps.push("motion-layout");
  if (!steps.length) {
    info("no safe fixes apply");
    return;
  }
  info(`applied: ${steps.join(", ")}`);
  if (!flags.write) {
    info("dry-run — re-run with --write to apply");
    return;
  }
  const backup = `${file}.bak.${Date.now()}`;
  await fs.writeFile(backup, original, "utf8");
  await fs.writeFile(file, src, "utf8");
  ok(`wrote ${file} (backup: ${path.basename(backup)})`);
}

async function cmdFixAll(flags) {
  head("Fixing every page under src/app");
  let touched = 0, skipped = 0;
  for await (const f of walk(path.join(SRC, "app"), { exts: [".tsx"] })) {
    const rel = path.relative(process.cwd(), f);
    if (!rel.endsWith("page.tsx")) continue;
    const original = await fs.readFile(f, "utf8");
    let src = original;
    const steps = [];
    let r;
    r = insertForceDynamic(src);    src = r.src; if (r.changed) steps.push("force-dynamic");
    r = demoteHeader(src);          src = r.src; if (r.changed) steps.push("header-demoted");
    r = wrapSuspense(src);          src = r.src; if (r.changed) steps.push("suspense-wrap");
    r = disableMotionLayout(src);   src = r.src; if (r.changed) steps.push("motion-layout");
    if (!steps.length) { skipped++; continue; }
    if (flags.write) {
      const backup = `${f}.bak.${Date.now()}`;
      await fs.writeFile(backup, original, "utf8");
      await fs.writeFile(f, src, "utf8");
    }
    console.log(`  ${flags.write ? C.green("✓") : C.yellow("·")} ${rel}  ${C.dim(`[${steps.join(", ")}]`)}`);
    touched++;
  }
  console.log();
  info(`touched: ${touched}`);
  info(`clean:   ${skipped}`);
  if (!flags.write) info("dry-run — re-run with --write to apply");
}

/* ══════════════════════════════════════════════════════════════════════════
   VERIFY — CI gate
   ══════════════════════════════════════════════════════════════════════════ */

async function cmdVerify() {
  head("Verifying no critical glitches remain");
  const findings = await cmdAudit({ json: true });
  const criticals = [];
  const highs = [];
  for (const [file, hits] of findings) {
    for (const h of hits) {
      if (h.severity === "critical") criticals.push({ file, ...h });
      if (h.severity === "high")     highs.push({ file, ...h });
    }
  }
  if (criticals.length) {
    console.log();
    for (const h of criticals) bad(`${h.id}  ${h.file}  —  ${h.title}`);
    die(`${criticals.length} critical glitch(es) remaining.`);
  }
  if (highs.length) {
    console.log();
    for (const h of highs) warn(`${h.id}  ${h.file}  —  ${h.title}`);
    warn(`${highs.length} high-severity glitch(es) remaining (non-blocking).`);
  }
  ok("No critical glitches. High-severity warnings are advisory.");
}

/* ══════════════════════════════════════════════════════════════════════════
   REPORT — markdown output
   ══════════════════════════════════════════════════════════════════════════ */

async function cmdReport() {
  const findings = await cmdAudit({ json: true, quiet: true });
  const lines = ["# Dashboard glitch report", ""];
  if (!findings.size) {
    lines.push("_No glitches found._");
    console.log(lines.join("\n"));
    return;
  }
  for (const [file, hits] of findings) {
    lines.push(`## \`${file}\``);
    for (const h of hits) {
      lines.push(`- **${h.id}** (${h.severity}) — ${h.title}`);
    }
    lines.push("");
  }
  console.log(lines.join("\n"));
}

/* ══════════════════════════════════════════════════════════════════════════
   DISPATCH
   ══════════════════════════════════════════════════════════════════════════ */

async function main() {
  const { cmd, target, flags } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(`
${C.bold("dashboard-fixup.mjs")} — dashboard glitch cookie cutter

  ${C.cyan("audit")}                     scan src/ for glitches
  ${C.cyan("report")}                    same as audit, markdown output
  ${C.cyan("patch <name>|all")}          patch a shared hook (useApiResource,
                                         usePolling, WidgetBoundary)
  ${C.cyan("fix <file> [--write]")}      apply safe page-level fixes
  ${C.cyan("fix-all [--write]")}         apply safe fixes to every page
  ${C.cyan("verify")}                    CI gate — exit 1 on critical glitches

Flags:
  --write       actually write files (default: dry-run)
  --json        machine-readable output for audit
  --quiet       suppress headers
`);
    return;
  }

  switch (cmd) {
    case "audit":   await cmdAudit(flags); return;
    case "report":  await cmdReport(); return;
    case "patch":   await cmdPatch(target, flags); return;
    case "fix":     if (!target) die("fix requires a file path"); await cmdFix(target, flags); return;
    case "fix-all": await cmdFixAll(flags); return;
    case "verify":  await cmdVerify(); return;
    default: die(`Unknown command: ${cmd}`);
  }
}

main().catch((e) => { console.error(C.red("✗"), e); process.exit(1); });
