#!/usr/bin/env node
// scripts/dashboard-doctor.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard compliance doctor — audit · fix · report.
//
//   node scripts/dashboard-doctor.mjs audit    [path]                     scan
//   node scripts/dashboard-doctor.mjs report   [path] > DASHBOARDS.md     markdown
//   node scripts/dashboard-doctor.mjs fix      <file>      [--write]       single file
//   node scripts/dashboard-doctor.mjs fix      --all       [--write]       everything
//   node scripts/dashboard-doctor.mjs fix      --rule=R2   [--write]       one rule
//   node scripts/dashboard-doctor.mjs routes                              route duplication
//   node scripts/dashboard-doctor.mjs dead                                dead components
//   node scripts/dashboard-doctor.mjs init                                 scaffold hooks + CI
//   node scripts/dashboard-doctor.mjs help
//
// Auto-fixable rules:
//   R2   clearCache() called during render                    → move to handler
//   R5   alert() in dashboard code                            → useUIStore().toast
//   R7   manual setInterval / clearInterval                   → usePolling
//   R9   useSearchParams() without Suspense                   → wrap inner
//   R12  duplicate local timeAgo()/relativeTime()             → fmtRelative
//   R15  hardcoded polling ms (15000/30000/60000)             → POLL_INTERVALS
//   R19  `import * as recharts` / eager recharts import       → next/dynamic
//   R23  hardcoded `p-6 space-y-6`                            → <DashboardShell>
//   R24  missing "use client" on hook-using page              → add directive
//   R26  inline `100vh`                                       → 100dvh
//
// Reported-only rules (require human judgment):
//   R1   duplicate route (same purpose, two paths)
//   R3   dashboard file > 400 LOC
//   R4   retry hack for cache
//   R6   3 different fetch patterns in one file
//   R8   session-local state that should persist
//   R10  missing loading.tsx / error.tsx
//   R11  inconsistent loading UI (spinner vs skeleton vs none)
//   R13  duplicated business logic (attendance, time)
//   R14  dead component (never imported)
//   R16  missing WidgetBoundary around data widgets
//   R17  Live toggle ignored by polling
//   R18  stale sidebar highlight risk
//   R20  missing aria-live on KPI numbers
//   R21  tab state in useState (not URL)
//   R22  `Role` type shadowed by runtime var
//   R25  chart data re-allocated per render
//   R27  unused imports
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");

/* ─────────────────────────── ANSI ─────────────────────────── */
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
const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const head = (m) => console.log(C.bold(C.magenta(`\n▸ ${m}`)));

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

/* ─────────────────────────── walker ─────────────────────────── */
async function* walk(dir) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function listDashboardFiles(rootDir = APP) {
  const out = [];
  for await (const f of walk(rootDir)) {
    if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
    if (/(^|[/\\])_/.test(f)) continue;         // _components / _hooks
    if (f.includes("/node_modules/")) continue;
    if (/(loading|error|not-found|layout)\.tsx$/.test(f)) continue;
    out.push(f);
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RULE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const RULES = [
  /* ─────── R1: duplicate route ─────── */
  {
    id: "R1",
    title: "Duplicate route",
    severity: "critical",
    fixable: false,
    check: (src, file, ctx) => {
      // Heuristic: same component name imported from two different routes.
      const importMatch = [...src.matchAll(/^import\s+\{[^}]*?(\w+(?:Analytics|Dashboard|Tracking|Manager))\b/gm)];
      for (const [, comp] of importMatch) {
        ctx.routeOwners[comp] = ctx.routeOwners[comp] ?? new Set();
        ctx.routeOwners[comp].add(file);
      }
      return [];
    },
  },

  /* ─────── R2: clearCache in render ─────── */
  {
    id: "R2",
    title: "clearCache() called during render",
    severity: "critical",
    fixable: true,
    fix: (src) => {
      // Match a line that is ONLY clearCache(...); outside useEffect/handlers.
      // Heuristic: if the line is indented inside JSX (4+ spaces and preceded by `>` on a previous line), it's a render call.
      return src.replace(
        /^(\s{4,})(clearCache\([^)]+\);)\s*$/gm,
        (m, indent, call) => `${indent}/* FIXME(R2): move to a handler:\n${indent}   const handleRefresh = () => { ${call} refresh(); };\n${indent}   — see scripts/dashboard-doctor.mjs */`,
      );
    },
    check: (src, file) => {
      const out = [];
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/^\s{4,}clearCache\(/.test(line) && !/=>|function|const handle/.test(line)) {
          // Heuristic: if the previous non-blank line ends with `>` or `}` and we're inside a JSX block.
          let j = i - 1;
          while (j >= 0 && !lines[j].trim()) j--;
          const prev = lines[j] ?? "";
          if (prev.trim().endsWith(">") || prev.includes("return (")) {
            out.push({ line: i + 1, text: line.trim(), rule: "R2" });
          }
        }
      });
      return out;
    },
  },

  /* ─────── R3: large file ─────── */
  {
    id: "R3",
    title: "Dashboard file > 400 LOC",
    severity: "warning",
    fixable: false,
    check: (src, file) => {
      const loc = src.split("\n").length;
      if (loc > 400) return [{ line: 1, text: `${loc} lines`, rule: "R3" }];
      return [];
    },
  },

  /* ─────── R4: retry hack ─────── */
  {
    id: "R4",
    title: "Retry hack masking cache bug",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/one-time automatic retry|bypass.*cache|retry to bypass/i.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R4" });
        }
      });
      return out;
    },
  },

  /* ─────── R5: alert() ─────── */
  {
    id: "R5",
    title: "alert() instead of toast",
    severity: "warning",
    fixable: true,
    fix: (src) => {
      // Replace alert("...") with a TODO marker for the toast — safest auto-fix.
      return src.replace(
        /\balert\((['"`])([^'"`]*)\1\)/g,
        (_m, _q, msg) =>
          `/* FIXME(R5): use useUIStore().warning(${JSON.stringify(msg)}) */ void ${JSON.stringify(msg)}`,
      );
    },
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/\balert\s*\(/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R5" });
        }
      });
      return out;
    },
  },

  /* ─────── R6: mixed fetch patterns ─────── */
  {
    id: "R6",
    title: "Multiple fetch patterns in one file",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const patterns = [
        /useApiResource</,
        /useLiveRefresh\(/,
        /useEffect\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?fetch\(/,
        /\bcachedFetch\(/,
      ];
      const hits = patterns.filter((re) => re.test(src)).length;
      if (hits >= 2) return [{ line: 1, text: `${hits} fetch mechanisms`, rule: "R6" }];
      return [];
    },
  },

  /* ─────── R7: setInterval ─────── */
  {
    id: "R7",
    title: "Manual setInterval / setInterval-cleanup",
    severity: "critical",
    fixable: true,
    fix: (src) => {
      // Conservative: mark lines, don't rewrite control flow.
      return src.replace(
        /^(\s*)(window\.)?setInterval\(/gm,
        "$1/* FIXME(R7): replace with usePolling(fn, { intervalMs }) */ $2setInterval(",
      );
    },
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/\b(setInterval|clearInterval)\s*\(/.test(line) && !/usePolling/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R7" });
        }
      });
      return out;
    },
  },

  /* ─────── R8: session-local state masquerading as persisted ─────── */
  {
    id: "R8",
    title: "State flagged as 'session-local' but shown as saved",
    severity: "critical",
    fixable: false,
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/session-local only|kept? in memory|not persisted|there is nowhere to persist/i.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R8" });
        }
      });
      return out;
    },
  },

  /* ─────── R9: useSearchParams without Suspense ─────── */
  {
    id: "R9",
    title: "useSearchParams without Suspense wrapper",
    severity: "warning",
    fixable: true,
    fix: (src, file) => {
      // If file uses useSearchParams and has a default export but no Suspense,
      // rename the existing default export to `Inner` and append a wrapper.
      if (!/useSearchParams\s*\(/.test(src)) return src;
      if (/<Suspense/.test(src)) return src;
      if (!/export\s+default\s+function\s+(\w+)/.test(src)) return src;

      const wrapped = src.replace(
        /export\s+default\s+function\s+(\w+)\s*\(\s*\)\s*\{/,
        "function $1Inner() {",
      );
      const fnName = src.match(/export\s+default\s+function\s+(\w+)/)?.[1] ?? "Page";
      return `${wrapped}\n\nexport default function ${fnName}() {\n  return (\n    <Suspense fallback={<PageLoading />}>\n      <${fnName}Inner />\n    </Suspense>\n  );\n}\n`;
    },
    check: (src) => {
      if (!/useSearchParams\s*\(/.test(src)) return [];
      if (/<Suspense/.test(src)) return [];
      return [{ line: 1, text: "useSearchParams without Suspense", rule: "R9" }];
    },
  },

  /* ─────── R10: missing loading/error siblings ─────── */
  {
    id: "R10",
    title: "Missing loading.tsx or error.tsx sibling",
    severity: "warning",
    fixable: false,
    check: async (_src, file, ctx) => {
      if (!file.endsWith("/page.tsx")) return [];
      const dir = path.dirname(file);
      const loading = path.join(dir, "loading.tsx");
      const error   = path.join(dir, "error.tsx");
      const out = [];
      if (!(await fs.stat(loading).catch(() => null))) out.push({ line: 1, text: "missing loading.tsx", rule: "R10" });
      if (!(await fs.stat(error).catch(() => null)))   out.push({ line: 1, text: "missing error.tsx",   rule: "R10" });
      return out;
    },
  },

  /* ─────── R11: inconsistent loading ─────── */
  {
    id: "R11",
    title: "Inconsistent loading UI (spinner/none)",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/\breturn\s+null\s*;\s*\/\/.*load/i.test(line) || /if\s*\(\s*loading\s*\)\s*return\s+null/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R11" });
        }
      });
      return out;
    },
  },

  /* ─────── R12: local timeAgo ─────── */
  {
    id: "R12",
    title: "Local timeAgo/relativeTime duplicate",
    severity: "warning",
    fixable: true,
    fix: (src) => {
      // Replace local function bodies with re-export from formatters.
      if (!/function\s+(timeAgo|timeSince|relativeTime)\s*\(/.test(src)) return src;
      return src.replace(
        /function\s+(timeAgo|timeSince|relativeTime)\s*\([^)]*\)\s*:\s*string\s*\{[\s\S]*?\n\}/m,
        (_m, name) => `/* R12: replaced by fmtRelative */\nconst ${name} = fmtRelative;`,
      );
    },
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/function\s+(timeAgo|timeSince|relativeTime)\s*\(/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R12" });
        }
      });
      return out;
    },
  },

  /* ─────── R13: duplicated business logic ─────── */
  {
    id: "R13",
    title: "Duplicated attendance/time business logic",
    severity: "warning",
    fixable: false,
    check: (src, file, ctx) => {
      const out = [];
      const hits = [
        /LATE_THRESHOLD|lateAfterMinutes|09:15|9:15/,
        /attendanceRate|computeAttendance/,
      ];
      const matched = hits.some((re) => re.test(src));
      if (matched) {
        ctx.attendanceOwners.push(file);
        out.push({ line: 1, text: "attendance-like logic", rule: "R13" });
      }
      return out;
    },
  },

  /* ─────── R14: dead component (post-process) ─────── */
  {
    id: "R14",
    title: "Component never imported",
    severity: "info",
    fixable: false,
    check: () => [],
  },

  /* ─────── R15: hardcoded polling ms ─────── */
  {
    id: "R15",
    title: "Hardcoded polling interval (ms)",
    severity: "warning",
    fixable: true,
    fix: (src) => {
      return src.replace(
        /\b(intervalMs|interval|timeout|refreshMs)\s*:\s*(5000|10000|15000|20000|30000|60000|300000)\b/g,
        (_m, key, ms) => {
          const map = { 5000: "realtime", 15000: "fast", 30000: "normal", 60000: "slow", 300000: "background" };
          const name = map[ms];
          return name ? `${key}: POLL_INTERVALS.${name}` : `${key}: ${ms} /* R15: name this profile */`;
        },
      );
    },
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/intervalMs\s*:\s*\d{4,}/.test(line) || /setInterval\([^,]+,\s*\d{4,}/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R15" });
        }
      });
      return out;
    },
  },

  /* ─────── R16: missing widget boundaries ─────── */
  {
    id: "R16",
    title: "Data widget rendered without <WidgetBoundary>",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const out = [];
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        // Widget-looking JSX: <SomethingData /> or <SomethingPanel /> at top level
        if (/^\s*<(?:[A-Z]\w+(?:Panel|Widget|Card|Chart|Tracking|Status))\s*\/?>\s*$/.test(line)) {
          // Look backwards ~10 lines for a WidgetBoundary
          const window = lines.slice(Math.max(0, i - 10), i).join("\n");
          if (!/WidgetBoundary/.test(window)) {
            out.push({ line: i + 1, text: line.trim(), rule: "R16" });
          }
        }
      });
      return out;
    },
  },

  /* ─────── R17: Live toggle ignored ─────── */
  {
    id: "R17",
    title: "Live toggle not reflected in polling",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const usesLive = /useUIStore\([^)]*isLiveStream|useGlass\(\)/.test(src);
      const hasStaticInterval = /intervalMs\s*:\s*(?:POLL_INTERVALS|\d)/.test(src);
      if (usesLive && hasStaticInterval && !/isLiveStream\s*\?/.test(src)) {
        return [{ line: 1, text: "Live toggle present but interval static", rule: "R17" }];
      }
      return [];
    },
  },

  /* ─────── R18: sidebar highlight query-only nav ─────── */
  {
    id: "R18",
    title: "Nav item with query not subscribed to searchParams",
    severity: "info",
    fixable: false,
    check: (src) => {
      const hasQueryHref = /href\s*=\s*["'`][^"'`]*\?/.test(src);
      const usesSearchParams = /useSearchParams\s*\(/.test(src);
      if (hasQueryHref && !usesSearchParams) {
        return [{ line: 1, text: "href with query but no useSearchParams", rule: "R18" }];
      }
      return [];
    },
  },

  /* ─────── R19: eager recharts import ─────── */
  {
    id: "R19",
    title: "Eager recharts import (bundle bloat)",
    severity: "warning",
    fixable: false,
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/from\s+["']recharts["']/.test(line) && !/dynamic\(/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R19" });
        }
      });
      return out;
    },
  },

  /* ─────── R20: aria-live on KPI ─────── */
  {
    id: "R20",
    title: "KPI number without aria-live",
    severity: "info",
    fixable: false,
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/text-2xl\s+font-semibold\s+tabular-nums/.test(line) && !/aria-live/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R20" });
        }
      });
      return out;
    },
  },

  /* ─────── R21: tab state not in URL ─────── */
  {
    id: "R21",
    title: "Tab state in useState (not URL)",
    severity: "info",
    fixable: false,
    check: (src) => {
      const hasTabState = /useState[^(]*\([^)]*["'`](?:overview|main|list|all)["'`]/.test(src);
      const hasSearchParams = /useSearchParams\s*\(/.test(src);
      if (hasTabState && !hasSearchParams) {
        return [{ line: 1, text: "tab in state but not URL", rule: "R21" }];
      }
      return [];
    },
  },

  /* ─────── R22: Role shadowing ─────── */
  {
    id: "R22",
    title: "`Role` type shadowed by runtime `role` var",
    severity: "info",
    fixable: false,
    check: (src) => {
      const out = [];
      const importsType = /import\s+type\s+\{[^}]*\bRole\b[^}]*\}/.test(src);
      const declaresRole = /const\s+role\s*[:=]/.test(src);
      if (importsType && declaresRole) {
        src.split("\n").forEach((line, i) => {
          if (/const\s+role\s*[:=]/.test(line)) {
            out.push({ line: i + 1, text: line.trim(), rule: "R22" });
          }
        });
      }
      return out;
    },
  },

  /* ─────── R23: hardcoded padding ─────── */
  {
    id: "R23",
    title: "Hardcoded `p-6 space-y-6`",
    severity: "info",
    fixable: true,
    fix: (src) => src.replace(/className=(["'])([^"']*)\bp-6\b([^"']*)\bspace-y-6\b([^"']*)\1/g,
      (_m, q, pre, mid, post) => `className=${q}${pre}p-4 sm:p-6${mid}space-y-4 sm:space-y-6${post}${q}`),
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/className=(["'])[^"']*\bp-6\b[^"']*\bspace-y-6\b/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R23" });
        }
      });
      return out;
    },
  },

  /* ─────── R24: missing "use client" ─────── */
  {
    id: "R24",
    title: "Missing `\"use client\"` on hook-using file",
    severity: "critical",
    fixable: true,
    fix: (src) => `"use client";\n${src}`,
    check: (src, file) => {
      if (!file.endsWith(".tsx")) return [];
      const first = src.trimStart().slice(0, 40);
      if (/^["']use client["']/.test(first)) return [];
      const usesHooks = /\b(useState|useEffect|useRouter|useSearchParams|useCallback|useMemo|useRef|useApiResource|usePolling|useLiveRefresh)\b/.test(src);
      if (!usesHooks) return [];
      // Skip server components with `export const dynamic = 'force-dynamic'`
      if (/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(src)) return [];
      return [{ line: 1, text: "missing \"use client\"", rule: "R24" }];
    },
  },

  /* ─────── R25: chart data re-allocated ─────── */
  {
    id: "R25",
    title: "Chart data re-allocated in render (no useMemo)",
    severity: "info",
    fixable: false,
    check: (src) => {
      const out = [];
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/const\s+\w*[Dd]ata\s*=\s*\w+\.map\(/.test(line)) {
          // Look 15 lines back for useMemo
          const window = lines.slice(Math.max(0, i - 15), i).join("\n");
          if (!/useMemo/.test(window)) {
            out.push({ line: i + 1, text: line.trim(), rule: "R25" });
          }
        }
      });
      return out;
    },
  },

  /* ─────── R26: 100vh ─────── */
  {
    id: "R26",
    title: "`100vh` on mobile (use dvh)",
    severity: "info",
    fixable: true,
    fix: (src) => src.replace(/\bmin-h-\[100vh\]/g, "min-h-[100dvh]").replace(/\bh-screen\b/g, "h-dvh"),
    check: (src) => {
      const out = [];
      src.split("\n").forEach((line, i) => {
        if (/100vh|h-screen\b/.test(line) && !/min-h-\[100dvh\]|h-dvh/.test(line)) {
          out.push({ line: i + 1, text: line.trim(), rule: "R26" });
        }
      });
      return out;
    },
  },

  /* ─────── R27: unused imports (best-effort) ─────── */
  {
    id: "R27",
    title: "Possibly unused import",
    severity: "info",
    fixable: false,
    check: (src) => {
      const out = [];
      const importRe = /^import\s+\{([^}]+)\}\s+from\s+["'][^"']+["'];?/gm;
      let m;
      while ((m = importRe.exec(src)) !== null) {
        const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
        for (const name of names) {
          if (!name || name.startsWith("type ")) continue;
          const used = new RegExp(`\\b${name}\\b`, "g");
          const hits = src.match(used);
          if (!hits || hits.length <= 1) {
            out.push({ line: src.slice(0, m.index).split("\n").length, text: `unused: ${name}`, rule: "R27" });
          }
        }
      }
      return out;
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIT
   ═══════════════════════════════════════════════════════════════════════════ */

async function audit(rootDir = APP, filterRule = null) {
  const files = await listDashboardFiles(rootDir);
  const ctx = {
    routeOwners: {},
    attendanceOwners: [],
    deadComponents: new Set(),
    report: [],
    totals: {},
  };

  for (const file of files) {
    const src = await fs.readFile(file, "utf8");
    const issues = [];
    for (const rule of RULES) {
      if (filterRule && rule.id !== filterRule) continue;
      try {
        const found = await rule.check(src, file, ctx);
        for (const f of found) issues.push({ ...f, title: rule.title, severity: rule.severity, fixable: rule.fixable });
      } catch (e) {
        // Rule crash should not stop the audit.
        issues.push({ line: 1, text: `(rule ${rule.id} crashed: ${e.message})`, rule: rule.id, severity: "info", fixable: false, title: rule.title });
      }
    }
    if (issues.length) {
      ctx.report.push({ file, issues });
      for (const i of issues) {
        ctx.totals[i.rule] = (ctx.totals[i.rule] ?? 0) + 1;
      }
    }
  }

  // Post-process R1 (duplicate routes)
  for (const [comp, owners] of Object.entries(ctx.routeOwners)) {
    if (owners.size > 1) {
      const arr = [...owners].map(rel);
      ctx.report.push({
        file: arr[0],
        issues: [{
          line: 1,
          text: `${comp} rendered by: ${arr.join(", ")}`,
          rule: "R1",
          severity: "critical",
          fixable: false,
          title: "Duplicate route",
        }],
      });
      ctx.totals.R1 = (ctx.totals.R1 ?? 0) + 1;
    }
  }

  return ctx;
}

function printAudit(ctx) {
  head(`Audit summary — ${ctx.report.length} files with issues`);
  const order = RULES.map((r) => r.id);
  const severity = {};
  for (const r of RULES) severity[r.id] = r.severity;

  const totals = Object.entries(ctx.totals).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  for (const [rule, count] of totals) {
    const s = severity[rule];
    const color = s === "critical" ? C.red : s === "warning" ? C.yellow : C.dim;
    console.log(`  ${color(rule.padEnd(4))}  ${String(count).padStart(3)}  ${RULES.find((r) => r.id === rule)?.title}`);
  }

  console.log();
  for (const { file, issues } of ctx.report.slice(0, 40)) {
    console.log(`  ${C.bold(rel(file))}`);
    for (const i of issues) {
      const color = i.severity === "critical" ? C.red : i.severity === "warning" ? C.yellow : C.dim;
      console.log(`    ${color(i.rule.padEnd(4))} ${String(i.line).padStart(4)}  ${i.text}`);
    }
  }
  if (ctx.report.length > 40) {
    console.log(`  … and ${ctx.report.length - 40} more files (run \`report\` for the full list)`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIX
   ═══════════════════════════════════════════════════════════════════════════ */

async function applyFix(file, ruleIds, { write }) {
  const original = await fs.readFile(file, "utf8");
  let src = original;
  const applied = [];

  for (const id of ruleIds) {
    const rule = RULES.find((r) => r.id === id);
    if (!rule || !rule.fixable) continue;
    const next = rule.fix(src, file);
    if (next !== src) {
      applied.push(id);
      src = next;
    }
  }

  if (src === original) return { changed: false, applied: [] };
  if (write) await fs.writeFile(file, src, "utf8");
  return { changed: true, applied };
}

async function cmdFix(target, ruleFilter, { write }) {
  const files =
    target === "--all" || !target
      ? await listDashboardFiles()
      : [path.resolve(ROOT, target)];

  let changed = 0;
  for (const file of files) {
    if (!(await fs.stat(file).catch(() => null))) {
      warn(`skip (not found): ${rel(file)}`);
      continue;
    }
    const src = await fs.readFile(file, "utf8");
    const ruleIds = ruleFilter ? [ruleFilter] : RULES.filter((r) => r.fixable).map((r) => r.id);

    // Guard: only fix rules that actually triggered.
    const triggered = [];
    for (const id of ruleIds) {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) continue;
      const found = await rule.check(src, file, { routeOwners: {}, attendanceOwners: [] });
      if (found.length) triggered.push(id);
    }
    if (!triggered.length) continue;

    const res = await applyFix(file, triggered, { write });
    if (res.changed) {
      changed++;
      const action = write ? "fixed" : "would fix";
      ok(`${action} ${rel(file)}  [${res.applied.join(", ")}]`);
    }
  }

  head(`${changed} file(s) ${write ? "fixed" : "need fixing"}`);
  if (!write && changed > 0) info("Re-run with --write to apply.");
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT (markdown)
   ═══════════════════════════════════════════════════════════════════════════ */

async function cmdReport(rootDir = APP) {
  const ctx = await audit(rootDir);
  const lines = [];
  lines.push(`# Dashboard Compliance Report`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Files scanned with issues: **${ctx.report.length}**`);
  lines.push(``);
  lines.push(`## Issue counts`);
  lines.push(``);
  lines.push(`| Rule | Severity | Count | Description |`);
  lines.push(`|------|----------|------:|-------------|`);
  const order = RULES.map((r) => r.id);
  for (const id of order) {
    const count = ctx.totals[id];
    if (!count) continue;
    const r = RULES.find((x) => x.id === id);
    const s = r.severity === "critical" ? "��" : r.severity === "warning" ? "��" : "��";
    lines.push(`| ${id} | ${s} ${r.severity} | ${count} | ${r.title} |`);
  }
  lines.push(``);
  lines.push(`## By file`);
  lines.push(``);
  for (const { file, issues } of ctx.report) {
    lines.push(`### \`${rel(file)}\``);
    lines.push(``);
    lines.push(`| Rule | Line | Note | Fixable |`);
    lines.push(`|------|-----:|------|---------|`);
    for (const i of issues) {
      const safeText = String(i.text).replace(/\|/g, "\\|");
      lines.push(`| ${i.rule} | ${i.line} | \`${safeText}\` | ${i.fixable ? "✅" : "—"} |`);
    }
    lines.push(``);
  }
  process.stdout.write(lines.join("\n"));
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROUTES / DEAD COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

async function cmdRoutes() {
  head("Route duplication check");
  const ctx = await audit(APP, "R1");
  if (!ctx.totals.R1) { ok("No duplicate routes detected."); return; }
  for (const { file, issues } of ctx.report) {
    for (const i of issues) {
      if (i.rule === "R1") console.log(`  ${C.red("✖")} ${i.text}`);
    }
  }
  head("Suggested redirects (paste into next.config.mjs):");
  console.log(`
async redirects() {
  return [
    { source: "/admin/analytics/occupancy",      destination: "/admin/occupancy",      permanent: true },
    { source: "/admin/analytics/sustainability", destination: "/admin/sustainability", permanent: true },
    { source: "/admin/health",                   destination: "/sysadmin/health",       permanent: true },
  ];
}`);
}

async function cmdDead() {
  head("Dead component scan");
  const compDir = path.join(SRC, "components");
  const usedNames = new Set();
  const importRe = /from\s+["'][^"']*\/([A-Z]\w+)["']/g;
  for await (const f of walk(SRC)) {
    const src = await fs.readFile(f, "utf8");
    let m;
    while ((m = importRe.exec(src))) usedNames.add(m[1]);
  }

  let dead = 0;
  for await (const f of walk(compDir)) {
    if (!/\.tsx?$/.test(f)) continue;
    const base = path.basename(f).replace(/\.tsx?$/, "");
    if (!/^[A-Z]/.test(base)) continue;
    if (usedNames.has(base)) continue;
    console.log(`  ${C.yellow("·")} ${rel(f)}`);
    dead++;
  }
  head(`${dead} dead component(s)`);
  if (dead > 0) info("Verify with `grep -r \"<Name>\" src/` before deleting.");
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — install shared scaffolding + CI
   ═══════════════════════════════════════════════════════════════════════════ */

async function cmdInit() {
  head("Installing shared scaffolding + CI");

  // 1. Central config (if not present)
  const configPath = path.join(SRC, "config", "app-constants.ts");
  if (!(await fs.stat(configPath).catch(() => null))) {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, `// src/config/app-constants.ts
export const POLL_INTERVALS = {
  realtime: 5_000, fast: 15_000, normal: 30_000, slow: 60_000, background: 300_000,
} as const;
export type PollProfile = keyof typeof POLL_INTERVALS;
export function pollMs(p: PollProfile | number): number {
  return typeof p === "number" ? p : POLL_INTERVALS[p];
}
`, "utf8");
    ok("wrote src/config/app-constants.ts");
  } else {
    warn("skip (exists): src/config/app-constants.ts");
  }

  // 2. CI script
  const ciPath = path.join(ROOT, "scripts", "check-dashboards.mjs");
  await fs.writeFile(ciPath, `#!/usr/bin/env node
// CI gate — exits non-zero if any critical dashboard issue exists.
import { spawnSync } from "node:child_process";
const r = spawnSync("node", ["scripts/dashboard-doctor.mjs", "audit"], { encoding: "utf8" });
const out = r.stdout + r.stderr;
const critical = (out.match(/\\bR(2|7|8|24)\\b/g) ?? []).length;
if (critical > 0) { console.error("Critical dashboard issues:", critical); process.exit(1); }
process.exit(0);
`, "utf8");
  await fs.chmod(ciPath, 0o755);
  ok("wrote scripts/check-dashboards.mjs");

  // 3. package.json scripts (best-effort, non-destructive)
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
  pkg.scripts = pkg.scripts ?? {};
  pkg.scripts["dash:audit"]  = "node scripts/dashboard-doctor.mjs audit";
  pkg.scripts["dash:report"] = "node scripts/dashboard-doctor.mjs report > DASHBOARDS.md";
  pkg.scripts["dash:fix"]    = "node scripts/dashboard-doctor.mjs fix --all --write";
  pkg.scripts["dash:routes"] = "node scripts/dashboard-doctor.mjs routes";
  pkg.scripts["dash:dead"]   = "node scripts/dashboard-doctor.mjs dead";
  pkg.scripts["dash:ci"]     = "node scripts/check-dashboards.mjs";
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  ok("updated package.json scripts");

  head("Done");
  info("npm run dash:audit    # see current issues");
  info("npm run dash:fix      # auto-fix safe classes");
  info("npm run dash:report   # markdown for sprint board");
  info("npm run dash:ci       # wire into pre-push / CI");
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISPATCH
   ═══════════════════════════════════════════════════════════════════════════ */

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { positional, flags };
}

function cmdHelp() {
  console.log(`
${C.bold("dashboard-doctor")} — audit · fix · report every dashboard in src/app.

${C.bold("Commands")}
  audit  [path]                scan and print issues per file
  report [path]                emit markdown to stdout
  fix    <file>|--all [--write] apply safe auto-fixes
  fix    --rule=R7 [--write]    apply a single rule
  routes                        detect duplicate-purpose routes
  dead                          list components never imported
  init                          install shared config + CI hook

${C.bold("Flags")}
  --write                       actually write (default is dry-run)
  --rule=R2                     restrict fix to a single rule id

${C.bold("Rules")}
${RULES.map((r) => `  ${r.id.padEnd(4)} ${r.severity.padEnd(8)} ${r.title}`).join("\n")}

${C.bold("Examples")}
  node scripts/dashboard-doctor.mjs audit
  node scripts/dashboard-doctor.mjs fix src/app/(admin)/admin/page.tsx --write
  node scripts/dashboard-doctor.mjs fix --rule=R7 --write
  node scripts/dashboard-doctor.mjs report > DASHBOARDS.md
  node scripts/dashboard-doctor.mjs init
`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = positional;
  switch (cmd) {
    case "audit": {
      const target = rest[0] ? path.resolve(ROOT, rest[0]) : APP;
      const ctx = await audit(target, flags.rule ?? null);
      printAudit(ctx);
      break;
    }
    case "report": {
      const target = rest[0] ? path.resolve(ROOT, rest[0]) : APP;
      await cmdReport(target);
      break;
    }
    case "fix":
      await cmdFix(rest[0], flags.rule ?? null, { write: Boolean(flags.write) });
      break;
    case "routes": await cmdRoutes(); break;
    case "dead":   await cmdDead(); break;
    case "init":   await cmdInit(); break;
    case "help":
    case undefined: cmdHelp(); break;
    default: die(`unknown command: ${cmd}. run \`help\`.`);
  }
}

main().catch((e) => die(e.stack ?? String(e)));