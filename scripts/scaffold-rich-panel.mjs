#!/usr/bin/env node
// scripts/scaffold-rich-panel.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Rich sysadmin panel cookie cutter. Emits a fully-structured page:
//
//   PageHeader
//     └ KPI strip (N cards, configurable)
//     └ Main grid (2/3 + 1/3)
//         ├ List column (expandable cards: impact bar, reasoning, diff, actions)
//         └ Side rail (filter · model · activity — each togglable)
//     └ DevContactStrip
//     └ ConfirmDialog (apply/delete actions)
//
// Generated files per `new <feature>`:
//   1. src/app/(group)/<role>/<feature>/page.tsx
//   2. src/app/(group)/<role>/<feature>/loading.tsx
//   3. src/app/(group)/<role>/<feature>/error.tsx
//   4. src/components/<role>/<Pascal>Panel.tsx
//   5. src/app/api/admin/<feature>/route.ts          (only with --with-api)
//   6. tests/<role>-<feature>.spec.ts
//
// Compliance baked in (from audit passes 1 + 2):
//   ✓ "use client" unconditionally
//   ✓ GuardedPage + Suspense + WidgetBoundary + ConfirmDialog
//   ✓ useApiResource + usePolling (visibility-aware; no setInterval)
//   ✓ POLL_INTERVALS from @/config/app-constants (no magic numbers)
//   ✓ toasts, never alert()
//   ✓ typed interfaces (no any, no file-scope eslint-disable)
//   ✓ aria-* on every interactive element
//   ✓ fail-loud Playwright (test.fixme if creds missing)
//   ✓ API route: withAuthorization → CSRF → rate-limit → handler
//   ✓ Standard ok()/fail() envelope (no raw NextResponse.json)
//   ✓ requireTrustedHeaders guard on every route
//
// Usage:
//   node scripts/scaffold-rich-panel.mjs new <feature> [flags]
//   node scripts/scaffold-rich-panel.mjs list
//   node scripts/scaffold-rich-panel.mjs help
//
// Flags:
//   --title "AI Smart Scheduling Assistant"     display title
//   --subtitle "..."                            header subtitle
//   --role sysadmin                             role (drives route + component dir)
//   --group (sysadmin)                          route group
//   --min-tier 100                              GuardedPage tier floor
//   --icon Sparkles                             header/list icon
//   --kpis 4                                    number of KPI cards (3–6)
//   --categories gate_hours:Gate Hours:DoorOpen,operator_shifts:Operator Shifts:Users
//                                               comma-separated code:Label:Icon
//   --side-rail model,activity                  sections (model|activity|legend|stats)
//   --api-endpoint /api/admin/<feature>         read endpoint
//   --apply-endpoint /api/admin/<feature>/apply apply endpoint
//   --with-api                                  also emit the API route
//   --force                                     overwrite existing files
//   --dry-run                                   print only, write nothing
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ─────────────────────────── ANSI ─────────────────────────── */
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✔ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(C.cyan(`\n▸ ${m}`)));

/* ─────────────────────────── helpers ──────────────────────── */
const pascal    = (s) => s.replace(/(^|[-_/\s])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const camel     = (s) => { const p = pascal(s); return p.charAt(0).toLowerCase() + p.slice(1); };
const kebab     = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "");
const titleCase = (s) => s.replace(/(^|[-_/\s])([a-z0-9])/g, (_, sp, c) => (sp ? " " : "") + c.toUpperCase()).trim();
const upper     = (s) => s.replace(/[-_/\s]/g, "_").toUpperCase();

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
async function writeFileSafe(absPath, content, { force, dryRun }) {
  if (await exists(absPath) && !force) {
    warn(`skip (exists): ${path.relative(ROOT, absPath)}`);
    return "skipped";
  }
  if (dryRun) { info(`would write: ${path.relative(ROOT, absPath)}`); return "dry"; }
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content, "utf8");
  ok(`wrote: ${path.relative(ROOT, absPath)}`);
  return "written";
}
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) { flags[key] = true; }
      else { flags[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, flags };
}

/** Token substitution — cleaner than nested template literals for JSX/TS output. */
function render(lines, ctx) {
  const flat = Array.isArray(lines) ? lines.join("\n") : lines;
  return flat.replace(/__([A-Z][A-Z0-9_]*)__/g, (_, key) => {
    const v = ctx[key];
    if (v === undefined) return `__${key}__`;
    return String(v);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT BUILDER
   ═══════════════════════════════════════════════════════════════════════════ */

function buildContext(feature, flags) {
  const pascalName = pascal(feature);
  const role       = String(flags.role ?? "sysadmin");
  const group      = String(flags.group ?? `(${role})`);
  const title      = String(flags.title ?? `${titleCase(feature)} Assistant`);
  const subtitle   = String(flags.subtitle ?? `Machine-learning recommendations · updated just now`);
  const minTier    = Number(flags["min-tier"] ?? 100);
  const icon       = String(flags.icon ?? "Sparkles");
  const kpiCount   = Math.min(Math.max(Number(flags.kpis ?? 4), 3), 6);
  const sideRail   = String(flags["side-rail"] ?? "model,activity")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const apiEndpoint   = String(flags["api-endpoint"]   ?? `/api/admin/${kebab(feature)}`);
  const applyEndpoint = String(flags["apply-endpoint"] ?? `/api/admin/${kebab(feature)}/apply`);
  const withApi       = Boolean(flags["with-api"]);

  // Categories: "code:Label:IconCode" or defaults.
  const rawCats = String(
    flags.categories
      ?? "gate_hours:Gate Hours:DoorOpen,operator_shifts:Operator Shifts:Users,curfew_adjustment:Curfew Adjustment:Moon",
  );
  const categories = rawCats.split(",").map((part) => {
    const [code, label, iconName] = part.split(":").map((s) => s.trim());
    return {
      code: code || "general",
      label: label || titleCase(code || "general"),
      icon: iconName || "Sparkles",
    };
  });

  const categoryCodes = categories.map((c) => c.code);

  return {
    feature,
    featureKebab: kebab(feature),
    featureSnake: feature.replace(/-/g, "_"),
    pascalName,
    camelName: camel(feature),
    upperName: upper(feature),
    role,
    group,
    title,
    subtitle,
    minTier,
    icon,
    kpiCount,
    sideRail,
    apiEndpoint,
    applyEndpoint,
    withApi,
    categories,
    categoryCodes,
    componentDir: role, // src/components/<role>/
    appDir: path.join(ROOT, "src", "app", group, role, featureKebab(feature)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE: COMPONENT (the "most-described" rich panel)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildComponent(ctx) {
  const categoryMeta = ctx.categories
    .map(
      (c) => `  ${c.code}: {
    label: "${c.label}",
    description: "Adjust ${c.label.toLowerCase()} based on observed patterns.",
    icon: ${c.icon},
    accent: "text-emerald-400",
    surface: "bg-emerald-500/10 border-emerald-500/30",
  },`,
    )
    .join("\n");

  const categoryType = ctx.categoryCodes.map((c) => `"${c}"`).join(" | ");

  const byCategoryInit = ctx.categories
    .map((c) => `${c.code}: 0`)
    .join(", ");

  const categoryIconImports = Array.from(
    new Set([ctx.icon, ...ctx.categories.map((c) => c.icon)]),
  ).join(", ");

  const sideRailBlocks = buildSideRailBlocks(ctx);

  const kpiBlock = buildKpiBlock(ctx);

  return render(
    [
      `"use client";`,
      `// src/components/__COMPONENT_DIR__/__PASCAL_NAME__Panel.tsx`,
      `// ─────────────────────────────────────────────────────────────────────────────`,
      `// __TITLE__ — rich sysadmin panel.`,
      `//`,
      `// Hierarchy:`,
      `//   PageHeader`,
      `//     └ KPI strip (__KPI_COUNT__ cards)`,
      `//     └ Main grid (2/3 list + 1/3 side rail)`,
      `//     └ DevContactStrip + ConfirmDialog`,
      `//`,
      `// Compliance: GuardedPage-wrapped · Suspense-safe · useApiResource +`,
      `// usePolling (visibility-aware) · WidgetBoundary per widget · toasts (no`,
      `// alert()) · typed interfaces (no any) · aria-* on every action ·`,
      `// no file-scope eslint-disable.`,
      `//`,
      `// Generated by scripts/scaffold-rich-panel.mjs — SCAFFOLD:RICH-PANEL`,
      `// ─────────────────────────────────────────────────────────────────────────────`,
      ``,
      `import { useCallback, useMemo, useState } from "react";`,
      `import {`,
      `  ${categoryIconImports},`,
      `  RefreshCw, Check, ChevronDown, ChevronRight,`,
      `  TrendingUp, Target, Brain, AlertTriangle, Filter, Info,`,
      `  CheckCircle2, History, ShieldCheck, Activity, ArrowRight,`,
      `  Loader2, Eye,`,
      `} from "lucide-react";`,
      ``,
      `import { WidgetBoundary } from "@/components/shared/WidgetBoundary";`,
      `import { PageHeader } from "@/components/shared/PageHeader";`,
      `import { DevContactStrip } from "@/components/shared/DevContactStrip";`,
      `import { ConfirmDialog } from "@/components/shared/ConfirmDialog";`,
      `import { EmptyState } from "@/components/shared/EmptyState";`,
      ``,
      `import { useApiResource, clearCache } from "@/hooks/useApiResource";`,
      `import { usePolling } from "@/hooks/usePolling";`,
      `import { useAuthStore } from "@/stores/authStore";`,
      `import { useUIStore } from "@/stores/uiStore";`,
      ``,
      `import { POLL_INTERVALS } from "@/config/app-constants";`,
      `import { getAuthHeaders } from "@/lib/utils";`,
      `import { fmtInt, fmtRelative } from "@/lib/formatters";`,
      ``,
      `import type { __PASCAL_NAME__Item } from "@/lib/__FEATURE_KEBAB__";`,
      ``,
      `/* ─────────────────────────── Meta ─────────────────────────── */`,
      ``,
      `type CategoryKey = ${categoryType};`,
      ``,
      `const CATEGORY_META: Record<`,
      `  CategoryKey,`,
      `  { label: string; description: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; accent: string; surface: string }`,
      `> = {`,
      categoryMeta,
      `} as const;`,
      ``,
      `interface ImpactTier {`,
      `  label: string;`,
      `  accent: string;`,
      `  bar: string;`,
      `}`,
      ``,
      `function impactTier(score: number): ImpactTier {`,
      `  if (score >= 80) return { label: "Critical", accent: "text-rose-400",    bar: "bg-rose-500" };`,
      `  if (score >= 60) return { label: "High",     accent: "text-amber-400",   bar: "bg-amber-500" };`,
      `  if (score >= 40) return { label: "Medium",   accent: "text-sky-400",     bar: "bg-sky-500" };`,
      `  return               { label: "Low",      accent: "text-slate-400",   bar: "bg-slate-500" };`,
      `}`,
      ``,
      `/* ─────────────────────────── Types ─────────────────────────── */`,
      ``,
      `interface SuggestionsResponse {`,
      `  suggestions: __PASCAL_NAME__Item[];`,
      `  generatedAt: string;`,
      `  model: { name: string; version: string; samples: number };`,
      `}`,
      ``,
      `interface AppliedEntry {`,
      `  id: string;`,
      `  title: string;`,
      `  category: CategoryKey;`,
      `  appliedAt: string;`,
      `  actor: string;`,
      `}`,
      ``,
      `interface ApplyResponse {`,
      `  success: boolean;`,
      `  applied?: boolean;`,
      `  error?: string;`,
      `}`,
      ``,
      `/* ─────────────────────────── Component ─────────────────────────── */`,
      ``,
      `export function __PASCAL_NAME__Panel() {`,
      `  const user = useAuthStore((s) => s.user);`,
      `  const addToast = useUIStore((s) => s.error);`,
      `  const addSuccess = useUIStore((s) => s.success);`,
      ``,
      `  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "all">("all");`,
      `  const [minImpact, setMinImpact] = useState(0);`,
      `  const [expanded, setExpanded] = useState<Set<string>>(new Set());`,
      `  const [pendingApply, setPendingApply] = useState<__PASCAL_NAME__Item | null>(null);`,
      `  const [applying, setApplying] = useState<string | null>(null);`,
      `  const [applied, setApplied] = useState<AppliedEntry[]>([]);`,
      ``,
      `  const suggestions = useApiResource<SuggestionsResponse>(`,
      `    "__API_ENDPOINT__",`,
      `    { ttlMs: 30_000 },`,
      `  );`,
      ``,
      `  usePolling(`,
      `    async () => {`,
      `      try { await suggestions.refresh(); }`,
      `      catch (e) { addToast(e instanceof Error ? e.message : "Refresh failed"); }`,
      `    },`,
      `    { intervalMs: POLL_INTERVALS.slow, enabled: true },`,
      `  );`,
      ``,
      `  const rows = useMemo(() => {`,
      `    const all = suggestions.data?.suggestions ?? [];`,
      `    return all`,
      `      .filter((s) => categoryFilter === "all" || s.category === categoryFilter)`,
      `      .filter((s) => s.impact_score >= minImpact)`,
      `      .sort((a, b) => b.impact_score - a.impact_score);`,
      `  }, [suggestions.data, categoryFilter, minImpact]);`,
      ``,
      `  const stats = useMemo(() => {`,
      `    const all = suggestions.data?.suggestions ?? [];`,
      `    const avgImpact = all.length`,
      `      ? Math.round(all.reduce((s, x) => s + x.impact_score, 0) / all.length)`,
      `      : 0;`,
      `    const highPriority = all.filter((s) => s.impact_score >= 60).length;`,
      `    const byCategory: Record<CategoryKey, number> = { ${byCategoryInit} };`,
      `    for (const s of all) byCategory[s.category]++;`,
      `    return { total: all.length, avgImpact, highPriority, byCategory };`,
      `  }, [suggestions.data]);`,
      ``,
      `  const lastUpdated = suggestions.data?.generatedAt`,
      `    ? fmtRelative(suggestions.data.generatedAt)`,
      `    : "—";`,
      ``,
      `  const toggleExpand = useCallback((id: string) => {`,
      `    setExpanded((prev) => {`,
      `      const next = new Set(prev);`,
      `      if (next.has(id)) next.delete(id);`,
      `      else next.add(id);`,
      `      return next;`,
      `    });`,
      `  }, []);`,
      ``,
      `  const requestApply = useCallback((s: __PASCAL_NAME__Item) => setPendingApply(s), []);`,
      ``,
      `  const confirmApply = useCallback(async () => {`,
      `    const target = pendingApply;`,
      `    if (!target) return;`,
      `    setPendingApply(null);`,
      `    setApplying(target.id);`,
      `    try {`,
      `      const res = await fetch("__APPLY_ENDPOINT__", {`,
      `        method: "POST",`,
      `        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },`,
      `        body: JSON.stringify({ suggestionId: target.id }),`,
      `      });`,
      `      const body = (await res.json().catch(() => ({}))) as ApplyResponse;`,
      `      if (!res.ok || body.success === false) {`,
      `        throw new Error(body.error ?? \`Apply failed (\${res.status})\`);`,
      `      }`,
      `      setApplied((prev) => [`,
      `        {`,
      `          id: target.id,`,
      `          title: target.title,`,
      `          category: target.category,`,
      `          appliedAt: new Date().toISOString(),`,
      `          actor: user?.name ?? "System Admin",`,
      `        },`,
      `        ...prev,`,
      `      ]);`,
      `      addSuccess(\`Applied: \${target.title}\`);`,
      `      clearCache("__API_ENDPOINT__");`,
      `      await suggestions.refresh();`,
      `    } catch (e) {`,
      `      addToast(e instanceof Error ? e.message : "Could not apply suggestion");`,
      `    } finally {`,
      `      setApplying(null);`,
      `    }`,
      `  }, [pendingApply, suggestions, addSuccess, addToast, user]);`,
      ``,
      `  return (`,
      `    <div className="space-y-6 p-4 sm:p-6">`,
      `      <PageHeader`,
      `        title="__TITLE__"`,
      `        subtitle={\`__SUBTITLE__ · Updated \${lastUpdated}\`}`,
      `        onRefresh={() => suggestions.refresh()}`,
      `        refreshing={suggestions.loading}`,
      `      />`,
      ``,
      `      {suggestions.error ? (`,
      `        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">`,
      `          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />`,
      `          <div>`,
      `            <p className="font-medium">Could not load __TITLE_LOWER__</p>`,
      `            <p className="text-rose-300/80">{suggestions.error}</p>`,
      `          </div>`,
      `        </div>`,
      `      ) : null}`,
      ``,
      kpiBlock,
      ``,
      `      <div className="grid gap-4 lg:grid-cols-3">`,
      `        <div className="lg:col-span-2">`,
      `          <WidgetBoundary label="items-list">`,
      `            <section aria-label="Recommendations" className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">`,
      `              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">`,
      `                <div className="flex items-center gap-2">`,
      `                  <__ICON__ className="h-4 w-4 text-[var(--action-primary)]" aria-hidden />`,
      `                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recommendations</h2>`,
      `                  <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs tabular-nums text-[var(--text-muted)]">`,
      `                    {rows.length} of {stats.total}`,
      `                  </span>`,
      `                </div>`,
      `              </header>`,
      ``,
      `              <div className="p-2">`,
      `                {suggestions.loading && !suggestions.data ? (`,
      `                  <div className="space-y-2 p-2" aria-busy="true">`,
      `                    {Array.from({ length: 3 }).map((_, i) => (`,
      `                      <div key={i} className="h-24 animate-pulse rounded-lg bg-[var(--bg-elevated)]" />`,
      `                    ))}`,
      `                  </div>`,
      `                ) : rows.length === 0 ? (`,
      `                  <EmptyState`,
      `                    title="No recommendations match your filters"`,
      `                    description="Adjust the category or impact threshold, or refresh to re-analyze."`,
      `                    icon={<__ICON__ className="h-6 w-6" />}`,
      `                  />`,
      `                ) : (`,
      `                  <ul className="space-y-2" role="list">`,
      `                    {rows.map((s) => (`,
      `                      <li key={s.id}>`,
      `                        <ItemCard`,
      `                          item={s}`,
      `                          expanded={expanded.has(s.id)}`,
      `                          onToggle={() => toggleExpand(s.id)}`,
      `                          onApply={() => requestApply(s)}`,
      `                          applying={applying === s.id}`,
      `                        />`,
      `                      </li>`,
      `                    ))}`,
      `                  </ul>`,
      `                )}`,
      `              </div>`,
      `            </section>`,
      `          </WidgetBoundary>`,
      `        </div>`,
      ``,
      `        <aside className="space-y-4 lg:col-span-1">`,
      sideRailBlocks,
      `        </aside>`,
      `      </div>`,
      ``,
      `      <DevContactStrip />`,
      ``,
      `      <ConfirmDialog`,
      `        open={pendingApply !== null}`,
      `        onClose={() => setPendingApply(null)}`,
      `        onConfirm={confirmApply}`,
      `        title="Apply this change?"`,
      `        body={pendingApply ? \`\${pendingApply.title}\\n\\n\${pendingApply.recommendation}\\n\\nThis writes an audit-logged change.\` : ""}`,
      `        confirmText="Apply change"`,
      `        cancelText="Cancel"`,
      `        variant="primary"`,
      `      />`,
      `    </div>`,
      `  );`,
      `}`,
      ``,
      `/* ─────────────────────────── Sub-components ─────────────────────────── */`,
      ``,
      `function KpiCard({`,
      `  icon: Icon,`,
      `  label,`,
      `  value,`,
      `  suffix,`,
      `  hint,`,
      `  accent,`,
      `}: {`,
      `  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;`,
      `  label: string;`,
      `  value: number;`,
      `  suffix?: string;`,
      `  hint: string;`,
      `  accent: string;`,
      `}) {`,
      `  return (`,
      `    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">`,
      `      <div className="flex items-center justify-between">`,
      `        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>`,
      `        <Icon className={\`h-4 w-4 \${accent}\`} aria-hidden />`,
      `      </div>`,
      `      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">`,
      `        {fmtInt(value)}`,
      `        {suffix ? <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">{suffix}</span> : null}`,
      `      </p>`,
      `      <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">{hint}</p>`,
      `    </div>`,
      `  );`,
      `}`,
      ``,
      `function ItemCard({`,
      `  item,`,
      `  expanded,`,
      `  onToggle,`,
      `  onApply,`,
      `  applying,`,
      `}: {`,
      `  item: __PASCAL_NAME__Item;`,
      `  expanded: boolean;`,
      `  onToggle: () => void;`,
      `  onApply: () => void;`,
      `  applying: boolean;`,
      `}) {`,
      `  const meta = CATEGORY_META[item.category];`,
      `  const tier = impactTier(item.impact_score);`,
      `  const Icon = meta.icon;`,
      `  const Chevron = expanded ? ChevronDown : ChevronRight;`,
      ``,
      `  return (`,
      `    <article className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] transition-colors hover:border-[var(--border-strong)]">`,
      `      <header className="flex items-start gap-3 p-3">`,
      `        <button`,
      `          type="button"`,
      `          onClick={onToggle}`,
      `          aria-label={expanded ? "Collapse item" : "Expand item"}`,
      `          aria-expanded={expanded}`,
      `          className="mt-0.5 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"`,
      `        >`,
      `          <Chevron className="h-4 w-4" aria-hidden />`,
      `        </button>`,
      ``,
      `        <div className={\`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border \${meta.surface}\`}>`,
      `          <Icon className={\`h-4 w-4 \${meta.accent}\`} aria-hidden />`,
      `        </div>`,
      ``,
      `        <div className="min-w-0 flex-1">`,
      `          <div className="flex flex-wrap items-center gap-2">`,
      `            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3>`,
      `            <span className={\`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide \${meta.surface} \${meta.accent}\`}>`,
      `              {meta.label}`,
      `            </span>`,
      `          </div>`,
      `          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{item.recommendation}</p>`,
      ``,
      `          <div className="mt-2 flex items-center gap-2">`,
      `            <div`,
      `              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-surface)]"`,
      `              role="progressbar"`,
      `              aria-valuenow={item.impact_score}`,
      `              aria-valuemin={0}`,
      `              aria-valuemax={100}`,
      `              aria-label="Impact score"`,
      `            >`,
      `              <div className={\`h-full rounded-full \${tier.bar}\`} style={{ width: \`\${item.impact_score}%\` }} />`,
      `            </div>`,
      `            <span className={\`text-xs font-medium tabular-nums \${tier.accent}\`}>{item.impact_score}</span>`,
      `            <span className={\`text-[10px] uppercase tracking-wide \${tier.accent}\`}>{tier.label}</span>`,
      `          </div>`,
      `        </div>`,
      ``,
      `        <div className="flex shrink-0 items-center gap-1">`,
      `          <button`,
      `            type="button"`,
      `            onClick={onToggle}`,
      `            aria-label="Preview reasoning"`,
      `            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"`,
      `          >`,
      `            <Eye className="h-4 w-4" aria-hidden />`,
      `          </button>`,
      `          <button`