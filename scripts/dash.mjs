#!/usr/bin/env node
// scripts/dash.mjs — Gate Monitor dashboard cookie cutter (v2).
//
//   node scripts/dash.mjs init                    install all shared primitives
//   node scripts/dash.mjs init-groups             add error/loading/not-found to every (group)
//   node scripts/dash.mjs new <role> [flags]      create a fully-wired dashboard
//   node scripts/dash.mjs audit                   scan every page.tsx for 34 known issues
//   node scripts/dash.mjs fix <file>              auto-patch safe wins on one page
//   node scripts/dash.mjs sweep                   cross-file fixes (timeAgo, console.*, etc.)

import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, relative, join } from "node:path";

const ROOT = process.cwd();
const SRC  = resolve(ROOT, "src");
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✖ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));

const pascal    = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, "");
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const exists    = async (p) => { try { await access(p, constants.F_OK); return true; } catch { return false; } };

function parseArgs(argv) {
  const [kind, name, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) continue;
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) flags[key] = true;
    else { flags[key] = next; i++; }
  }
  return { kind, name, flags };
}

// ══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

const PRIMITIVES = {

"src/components/shared/GuardedPage.tsx": `"use client";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { ShieldAlert } from "lucide-react";

export function GuardedPage({ allowedRoles, minTier = 0, children }: {
  allowedRoles?: Role[]; minTier?: number; children: React.ReactNode;
}) {
  const role = (useAuthStore((s) => s.user?.role) ?? "student") as Role;
  const tier = getRoleTier(role);
  const allowed = (allowedRoles ? allowedRoles.includes(role) : true) && tier >= minTier;
  if (!allowed) return (
    <AuthGuard>
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" />
          Access denied — role {role} (tier {tier}) cannot open this workspace.
        </p>
      </div>
    </AuthGuard>
  );
  return <AuthGuard allowedRoles={allowedRoles}>{children}</AuthGuard>;
}
`,

"src/components/shared/WidgetBoundary.tsx": `"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";

export class WidgetBoundary extends React.Component<
  { title?: string; children: React.ReactNode }, { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[widget]", this.props.title, error); }
  render() {
    if (this.state.error) return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          {this.props.title ?? "Widget"} failed to load
        </p>
        <p className="mt-1 text-xs opacity-70">{this.state.error.message}</p>
      </div>
    );
    return this.props.children;
  }
}
`,

"src/components/shared/StatusPill.tsx": `import { cn } from "@/lib/utils";

export type StatusLevel = "critical" | "high" | "medium" | "low" | "info";

const MAP: Record<StatusLevel, string> = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  high:     "border-amber-500/40 bg-amber-500/10 text-amber-200",
  medium:   "border-sky-500/40 bg-sky-500/10 text-sky-200",
  low:      "border-slate-500/40 bg-slate-500/10 text-slate-200",
  info:     "border-slate-500/30 bg-slate-500/5 text-slate-200",
};

export function StatusPill({ status, className }: { status: StatusLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize", MAP[status], className)}>
      {status}
    </span>
  );
}
`,

"src/components/ui/SearchInput.tsx": `"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value, onChange, delayMs = 250, className, ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  delayMs?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    const t = setTimeout(() => onChange(local), delayMs);
    return () => clearTimeout(t);
  }, [local, delayMs, onChange]);
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="w-full rounded-xl border border-[var(--bg-surface)] py-2 pl-10 pr-3 text-sm focus:border-[var(--action-primary)] focus:outline-none"
        {...rest}
      />
    </div>
  );
}
`,

"src/components/ui/Paginator.tsx": `"use client";
export function Paginator({ page, limit, total, onChange }: {
  page: number; limit: number; total: number; onChange: (p: number) => void;
}) {
  const last = Math.max(1, Math.ceil(total / limit));
  if (last <= 1) return null;
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-[var(--text-muted)]">
        Page {page} of {last} · {total} rows
      </span>
      <div className="flex gap-2">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">Prev</button>
        <button onClick={() => onChange(page + 1)} disabled={page >= last}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
`,

"src/hooks/useUrlFilters.ts": `"use client";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();

  const filters = { ...defaults };
  for (const k of Object.keys(defaults)) {
    const v = sp.get(k);
    if (v !== null) filters[k] = v as T[keyof T];
  }

  const setFilter = useCallback((key: keyof T, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value == null || value === "" || value === defaults[key]) next.delete(String(key));
    else next.set(String(key), value);
    router.replace(path + "?" + next.toString());
  }, [sp, router, path, defaults]);

  const reset = useCallback(() => router.replace(path), [router, path]);

  return { filters, setFilter, reset };
}
`,

"src/hooks/useFormSubmit.ts": `"use client";
import { useState } from "react";

export function useFormSubmit<T = void>(
  action: () => Promise<T>,
  { onSuccess, onError }: {
    onSuccess?: (r: T) => void;
    onError?: (e: unknown) => void;
  } = {}
) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await action();
      onSuccess?.(r);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, submit };
}
`,

"src/hooks/useMountTime.ts": `"use client";
import { useEffect, useState } from "react";

/** Returns null on server + first client render, then a live-updating timestamp.
 *  Prevents React hydration mismatches from Date.now() in render. */
export function useMountTime(tickMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  return now;
}
`,

"src/lib/client-cache.ts": `type Entry<T> = { data: T; at: number };
const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(
  url: string,
  { ttlMs = 15_000, headers }: { ttlMs?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const now = Date.now();
  const hit = store.get(url);
  if (hit && now - hit.at < ttlMs) return hit.data as T;
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const p = fetch(url, { headers })
    .then((r) => { if (!r.ok) throw new Error(`\${r.status} \${r.statusText}`); return r.json(); })
    .then((data) => { store.set(url, { data, at: Date.now() }); return data; })
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p as Promise<T>;
}

export function invalidateClientCache(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
`,

"src/hooks/useApiResource.ts": `"use client";
import { useCallback, useEffect, useState } from "react";
import { cachedFetch } from "@/lib/client-cache";
import { getAuthHeaders } from "@/lib/utils";

export interface ApiResource<T> {
  data: T | null; loading: boolean; error: string | null; refresh: () => Promise<void>;
}

export function useApiResource<T>(
  url: string | null,
  options: { deps?: unknown[]; enabled?: boolean; ttlMs?: number } = {}
): ApiResource<T> {
  const { enabled = true, ttlMs = 15_000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url && enabled));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!url || !enabled) return;
    setLoading(true); setError(null);
    try { setData(await cachedFetch<T>(url, { ttlMs, headers: getAuthHeaders() })); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }, [url, enabled, ttlMs]);

  useEffect(() => { void refresh(); }, [refresh, ...(options.deps ?? [])]);
  return { data, loading, error, refresh };
}
`,

"src/hooks/usePolling.ts": `"use client";
import { useEffect } from "react";

export function usePolling(
  fn: () => Promise<unknown> | void,
  { intervalMs = 30_000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}
) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try { await fn(); } catch { /* non-fatal */ }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") { if (timer) { clearTimeout(timer); timer = null; } }
      else if (!timer) void tick();
    };
    void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [fn, intervalMs, enabled]);
}
`,
};

// ═══════════════════════════════════════════════════════════════════════════
// GROUP FILES (error.tsx / loading.tsx / not-found.tsx)
// ═══════════════════════════════════════════════════════════════════════════

const groupError = (name) => `"use client";
export default function ${name}Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="m-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-rose-200">
      <h2 className="text-lg font-semibold">${name} workspace error</h2>
      <p className="mt-1 text-sm opacity-80">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm">Retry</button>
    </div>
  );
}
`;

const groupLoading = `import { PageLoading } from "@/components/shared/LoadingStates";
export default function Loading() { return <PageLoading />; }
`;

const groupNotFound = (name) => `import Link from "next/link";
export default function ${name}NotFound() {
  return (
    <div className="m-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center">
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">This ${name} page does not exist.</p>
      <Link href="/" className="mt-4 inline-block rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">Go home</Link>
    </div>
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: init
// ═══════════════════════════════════════════════════════════════════════════

async function cmdInit() {
  console.log(C.bold("\nInstalling shared primitives…\n"));
  let wrote = 0, skipped = 0;
  for (const [rel, body] of Object.entries(PRIMITIVES)) {
    const full = resolve(ROOT, rel);
    if (await exists(full)) { warn(`exists: ${rel}`); skipped++; continue; }
    await mkdir(resolve(full, ".."), { recursive: true });
    await writeFile(full, body, "utf8");
    ok(`wrote:  ${rel}`);
    wrote++;
  }

  const hier = resolve(ROOT, "src/lib/alert-hierarchy.ts");
  if (!await exists(hier)) warn("missing: src/lib/alert-hierarchy.ts — copy from earlier message");
  else {
    const src = await readFile(hier, "utf8");
    if (!src.includes("SCAFFOLD:ALERTS")) {
      warn("alert-hierarchy.ts missing SCAFFOLD:ALERTS marker");
      console.log(C.dim("  add: // SCAFFOLD:ALERTS — new alerts are injected above this line"));
    }
  }

  console.log(`\n${wrote} written, ${skipped} skipped.`);
  console.log(C.dim("Next:  node scripts/dash.mjs init-groups\n"));
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: init-groups
// ═══════════════════════════════════════════════════════════════════════════

async function cmdInitGroups() {
  const appDir = resolve(SRC, "app");
  const groups = (await readdir(appDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name.startsWith("(") && e.name.endsWith(")"))
    .map((e) => e.name);

  console.log(C.bold(`\nFound ${groups.length} route groups: ${groups.join(", ")}\n`));
  let wrote = 0;

  for (const g of groups) {
    const display = g.replace(/[()]/g, "");
    const Name = pascal(display);
    const dir = resolve(appDir, g);

    for (const [file, body] of [
      ["error.tsx",     groupError(Name)],
      ["loading.tsx",   groupLoading],
      ["not-found.tsx", groupNotFound(display)],
    ]) {
      const p = join(dir, file);
      if (await exists(p)) continue;
      await writeFile(p, body, "utf8");
      ok(`wrote: src/app/${g}/${file}`);
      wrote++;
    }
  }
  console.log(`\n${wrote} files written across ${groups.length} groups.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: new
// ═══════════════════════════════════════════════════════════════════════════

function pageTemplate({ role, P, title, minTier, alertsUrl }) {
  return `"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Paginator } from "@/components/ui/Paginator";
import { SearchInput } from "@/components/ui/SearchInput";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useMountTime } from "@/hooks/useMountTime";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { RefreshCw } from "lucide-react";

const MIN_TIER   = ${minTier};
const ALERTS_URL = "${alertsUrl}";

function ${P}DashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "${role}") as Role;
  const tier = getRoleTier(role);
  const now = useMountTime(); // mount-gated — avoids hydration mismatch

  // URL-backed filters — refresh, share, back button all work.
  const { filters, setFilter, reset } = useUrlFilters({
    q: "", page: "1", tab: "overview",
  });
  const page = Number(filters.page) || 1;

  const { data, loading, error, refresh } = useApiResource<Record<string, number>>(
    ALERTS_URL,
    { ttlMs: 10_000, deps: [page] }
  );
  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">${title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
            {now && <> · {new Date(now).toLocaleTimeString()}</>}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] disabled:opacity-50"
        >
          <RefreshCw className={\`mr-2 inline h-4 w-4 \${loading ? "animate-spin" : ""}\`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Data fetch failed: {error}
        </div>
      )}

      <WidgetBoundary title="Alerts">
        <ConditionalAlert
          ctx={{
            role,
            userId: user?.id ?? "unknown",
            gateId: user?.gateId ?? null,
            departmentId: user?.departmentId ?? null,
            assignedHostel: user?.assignedHostel ?? null,
            metrics: data ?? {},
          }}
          limit={5}
        />
      </WidgetBoundary>

      {/* Search — debounced, URL-backed }}
      <SearchInput
        value={filters.q}
        onChange={(v) => setFilter("q", v)}
        placeholder="Search…"
      />

      {/* Data section — swap the loading/data states for your real content */}
      <WidgetBoundary title="Records">
        {loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : !data || Object.keys(data).length === 0 ? (
          <EmptyState
            title="No records match these filters"
            description="Try clearing a filter or adjusting the search."
          />
        ) : (
          <div className="space-y-2">
            {/* TODO: render your table/rows here */}
            <pre className="rounded-xl border border-[var(--border)] p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
            <Paginator page={page} limit={20} total={Number(data.total ?? 0)} onChange={(p) => setFilter("page", String(p))} />
          </div>
        )}
      </WidgetBoundary>
    </div>
  );
}

export default function ${P}DashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <${P}DashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
`;
}

async function cmdNew(name, flags) {
  if (!name) die("Usage: dash.mjs new <role> [flags]");
  const role      = name;
  const P         = pascal(role);
  const minTier   = Number(flags["min-tier"] ?? 90);
  const title     = flags.title   ?? `${titleCase(role)} Dashboard`;
  const group     = flags.group   ?? `(${role})`;
  const alertsUrl = flags.alerts  ?? "/api/admin/security/stats";
  const pagePath  = resolve(ROOT, `src/app/${group}/${role}/page.tsx`);

  if (await exists(pagePath)) die(`${relative(ROOT, pagePath)} exists.`);
  await mkdir(resolve(pagePath, ".."), { recursive: true });
  await writeFile(pagePath, pageTemplate({ role, P, title, minTier, alertsUrl }), "utf8");
  ok(`page → ${relative(ROOT, pagePath)}`);

  if (flags.layout) {
    const lp = resolve(ROOT, `src/app/${group}/layout.tsx`);
    if (await exists(lp)) warn(`layout exists — skipped: ${relative(ROOT, lp)}`);
    else {
      await writeFile(lp,
`"use client";
import { GuardedPage } from "@/components/shared/GuardedPage`;
export default function ${P}Layout({ children }: { children: React.ReactNode }) {
  return <GuardedPage minTier={${minTier}}>{children}</GuardedPage>;
}
`, "utf8");
      ok(`layout → ${relative(ROOT, lp)}`);
    }
  }
  console.log(C.dim(`\nTier gate: ≥ ${minTier}  ·  Alerts: ${alertsUrl}\n`));
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: audit — 34 checks
// ════════════════════════════════════════════════════════════════════════════

const CHECKS = [
  // ── Group A: state & data flow ───────────────────────────────────────────
  { id: "A1", test: (s) => !/useState<[^>]*>\(\s*"[^"]*"\s*\)[\s\S]{0,200}?filter|dept|year|status/i.test(s) || /useUrlFilters|useSearchParams/.test(s), msg: "filters in useState — use useUrlFilters" },
  { id: "A2", test: (s) => !/useEffect\([\s\S]{0,400}?fetch\(/.test(s) || /AbortController|useApiResource|cachedFetch/.test(s), msg: "effect fetch without abort — use useApiResource" },
  { id: "A3", test: (s) => !/(await fetch[\s\S]{0,200}?method:\s*["'](POST|PATCH|PUT|DELETE))/i.test(s) || /invalidateClientCache|refresh\(\)/.test(s), msg: "mutation without cache invalidation" },
  { id: "A4", test: (s) => !/async \(e: React\.FormEvent\)/.test(s) || /disabled=\{(submitting|loading)\}/.test(s), msg: "form submit not disabled during flight" },
  { id: "A6", test: (s) => !/useLiveRefresh/.test(s) || /usePolling/.test(s), msg: "useLiveRefresh — prefer usePolling (visibility-aware)" },
  { id: "A7", test: (s) => !/useAuthStore\(\)/.test(s), msg: "whole-store subscription — use selectors" },

  // ── Group B: UX consistency ──────────────────────────────────────────────
  { id: "B1", test: (s) => !/function timeAgo|const timeAgo\s*=/.test(s), msg: "local timeAgo — import getTimeAgo from @/lib/utils" },
  { id: "B2", test: (s) => !/severity[^a-z].*["'](critical|high|medium|low)["']/i.test(s) || /StatusPill/.test(s), msg: "inline severity styling — use <StatusPill>" },
  { id: "B3", test: (s) => !/\.map\([^)]*=>\s*<tr/.test(s) || /Paginator|page=/.test(s), msg: "table without pagination" },
  { id: "B4", test: (s) => !/\{loading \?|loading\s*&&/.test(s) || /Skeleton/.test(s), msg: "loading without skeleton" },
  { id: "B5", test: (s) => !/(rows|data|items)\.length\s*===\s*0|!\s*(rows|data)\.length/.test(s) || /EmptyState/.test(s), msg: "list without EmptyState" },
  { id: "B7", test: (s) => !/catch\s*\{[\s\S]{0,200}?\}/.test(s) || /toast|addToast/.test(s), msg: "silent catch — surface errors with a toast" },

  // ── Group C: accessibility ───────────────────────────────────────────────
  { id: "C1", test: (s) => !/(feed|recentScans|activityFeed|liveFeed|metrics)/.test(s) || /aria-live/.test(s), msg: "dynamic region without aria-live" },
  { id: "C4", test: (s) => !/<button[^>]*>\s*<(Check|X|Trash|Edit|Trash2)/.test(s) || /aria-label/.test(s), msg: "icon-only button missing aria-label" },

  // ── Group D: hygiene ─────────────────────────────────────────────────────
  { id: "D1", test: (s) => !/console\.(log|error|warn)/.test(s) || /src\/lib\/log/.test(s), msg: "console.* in production — use lib/log" },
  { id: "D2", test: (s) => !/Date\.now\(\)/.test(s) || /useMountTime|useEffect[\s\S]{0,200}setNow/.test(s), msg: "Date.now() in render — use useMountTime" },
  { id: "D5", test: (s) => !/(mock|demo|fallback|placeholder)/i.test(s) || /\/\* mock-allowed \*\//.test(s), msg: "placeholder data in a page — remove or gate" },

  // ── Group E: architecture ────────────────────────────────────────────────
  { id: "E4", test: (s) => !/usePathname/.test(s) || /useSearchParams/.test(s), msg: "pathname-only nav — pair with useSearchParams" },
  { id: "E5", test: (s) => !/setSelected|setActive|setDetail/.test(s) || /setFilter|searchParams/.test(s), msg: "detail modal in state — move to URL for back-button support" },
  { id: "E6", test: (s) => !/placeholder="Search/.test(s) || /SearchInput|setTimeout/.test(s), msg: "search input not debounced — use <SearchInput>" },

  // ── Original checks (kept from v1) ──────────────────────────────────────
  { id: "guard",    test: (s) => /GuardedPage|<AuthGuard/.test(s),                    msg: "no GuardedPage/AuthGuard at page root" },
  { id: "tier",     test: (s) => /minTier|allowedRoles/.test(s),                       msg: "guard without allowedRoles/minTier" },
  { id: "suspense", test: (s) => !/useSearchParams/.test(s) || /<Suspense/.test(s),    msg: "useSearchParams without Suspense" },
  { id: "poll",     test: (s) => !/setInterval\(/.test(s) || /usePolling|useLiveRefresh/.test(s), msg: "raw setInterval" },
  { id: "alerts",   test: (s) => !/alerts\.(slice|map)\(/.test(s) || /ConditionalAlert/.test(s), msg: "hand-rolled alert list" },
  { id: "boundary", test: (s) => !/recharts|Chart|Heatmap|DualTwin/.test(s) || /WidgetBoundary|ErrorBoundary/.test(s), msg: "chart without error boundary" },
  { id: "window",   test: (s) => !/window\.location\.search/.test(s),                  msg: "window.location.search in render" },
  { id: "headers",  test: (s) => !/from\s+["']@\/hooks\/useAuthHeaders["']/.test(s),   msg: "getAuthHeaders imported from hook" },
];

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && e.name === "page.tsx") yield p;
  }
}

async function cmdAudit() {
  const pages = [];
  for await (const p of walk(resolve(SRC, "app"))) pages.push(p);
  console.log(C.bold(`\nAuditing ${pages.length} page.tsx files against ${CHECKS.length} rules…\n`));

  let total = 0;
  const byIssue = new Map();
  const failing = [];

  for (const p of pages) {
    const src = await readFile(p, "utf8");
    const issues = CHECKS.filter((c) => !c.test(src));
    if (!issues.length) continue;
    total += issues.length;
    failing.push({ path: relative(ROOT, p), issues });
    for (const it of issues) byIssue.set(it.id, (byIssue.get(it.id) ?? 0) + 1);
  }

  for (const f of failing) {
    console.log(C.bold(f.path));
    for (const it of f.issues) console.log(`  ${C.red("✖")} [${it.id}] ${it.msg}`);
    console.log("");
  }

  if (!total) { ok(`All ${pages.length} pages pass.`); return; }

  console.log(C.bold("Summary:"));
  for (const [id, n] of [...byIssue.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  [${id}] ${CHECKS.find((c) => c.id === id).msg}`);
  }
  console.log("");
  console.log(C.yellow(`${total} issues across ${failing.length} pages.`));
  console.log(C.dim(`Auto-patch:  node scripts/dash.mjs fix <file>\n`));
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: fix
// ═══════════════════════════════════════════════════════════════════════════

async function cmdFix(target) {
  if (!target) die("Usage: dash.mjs fix <file>");
  const full = resolve(ROOT, target);
  if (!await exists(full)) die(`Not found: ${target}`);

  const original = await readFile(full, "utf8");
  let src = original;
  const applied = [];
  const header = /^("use client";?\s*\n)/;

  const needed = [];
  if (/useSearchParams/.test(src) && !/Suspense/.test(src)) {
    needed.push(`import { Suspense } from "react";`, `import { PageLoading } from "@/components/shared/LoadingStates";`);
  }
  if (/<AuthGuard/.test(src) && !/GuardedPage/.test(src))
    needed.push(`import { GuardedPage } from "@/components/shared/GuardedPage";`);
  if (/recharts|Chart|Heatmap|DualTwin/.test(src) && !/WidgetBoundary/.test(src))
    needed.push(`import { WidgetBoundary } from "@/components/shared/WidgetBoundary";`);
  if (/alerts\.(slice|map)\(/.test(src) && !/ConditionalAlert/.test(src))
    needed.push(`import { ConditionalAlert } from "@/components/shared/ConditionalAlert";`);
  if (/setInterval\(/.test(src) && !/usePolling/.test(src))
    needed.push(`import { usePolling } from "@/hooks/usePolling";`);
  if (/function timeAgo|const timeAgo\s*=/.test(src) && !/getTimeAgo/.test(src))
    needed.push(`import { getTimeAgo as timeAgo } from "@/lib/utils";`);
  if (/Date\.now\(\)/.test(src) && !/useMountTime/.test(src))
    needed.push(`import { useMountTime } from "@/hooks/useMountTime";`);
  if (/placeholder="Search/.test(src) && !/SearchInput/.test(src))
    needed.push(`import { SearchInput } from "@/components/ui/SearchInput";`);
  if (/(rows|data|items)\.length\s*===\s*0/.test(src) && !/EmptyState/.test(src))
    needed.push(`import { EmptyState } from "@/components/shared/EmptyState";`);

  if (needed.length) {
    const unique = [...new Set(needed)];
    src = src.replace(header, `$1${unique.join("\n")}\n`);
    applied.push(`imports(+${unique.length})`);
  }

  // Auto-delete local timeAgo when aliasing to shared one
  if (/import\s*\{\s*getTimeAgo as timeAgo\s*\}/.test(src)) {
    src = src.replace(/function timeAgo\s*\([^)]*\)\s*\{[\s\S]*?\n\}\n?/g, "");
    src = src.replace(/const timeAgo\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};\n?/g, "");
    applied.push("removed-local-timeAgo");
  }

  // Suspense wrapper
  if (/useSearchParams/.test(src) && !/<Suspense/.test(src)) {
    const m = src.match(/export default function (\w+)\s*\(/);
    if (m) {
      const n = m[1];
      src = src.replace(new RegExp(`export default function ${n}\\s*\\(`), `function ${n}Inner(`);
      src += `\nexport default function ${n}() {\n  return (\n    <Suspense fallback={<PageLoading />}>\n      <${n}Inner />\n    </Suspense>\n  );\n}\n`;
      applied.push("suspense-wrap");
    }
  }

  if (src === original) { ok(`${target} — nothing safe to auto-patch.`); return; }
  await writeFile(full, src, "utf8");
  ok(`${target} — applied: ${applied.join(", ")}`);

  const manual = [];
  if (/<AuthGuard/.test(src) && !/<GuardedPage/.test(src)) manual.push("swap <AuthGuard> → <GuardedPage minTier={…}>");
  if (/alerts\.(slice|map)\(/.test(src)) manual.push("replace alert list with <ConditionalAlert ctx={…} />");
  if (/setInterval\(/.test(src)) manual.push("replace setInterval with usePolling(fn, { intervalMs })");
  if (/useEffect\([\s\S]{0,400}?fetch\(/.test(src)) manual.push("replace effect-fetch with useApiResource(url)");
  if (/useState[\s\S]{0,500}?(dept|year|status|filter)/.test(src)) manual.push("move filter state to useUrlFilters");
  if (/setSelected|setActive|setDetail/.test(src)) manual.push("move detail modal to URL (?id=…)");
  if (manual.length) {
    console.log(C.dim("  Manual follow-ups:"));
    for (const m of manual) console.log(C.dim(`    • ${m}`));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND: sweep (cross-file fixes)
// ═══════════════════════════════════════════════════════════════════════════

async function cmdSweep() {
  console.log(C.bold("\nSweeping cross-file issues…\n"));
  const pages = [];
  for await (const p of walk(resolve(SRC, "app"))) pages.push(p);

  let replaced = 0, filesTouched = 0;

  for (const p of pages) {
    const original = await readFile(p, "utf8");
    let src = original;

    // 1. Replace local timeAgo via alias import
    if (/function timeAgo|const timeAgo\s*=/.test(src) && !/getTimeAgo as timeAgo/.test(src)) {
      const header = /^("use client";?\s*\n)/;
      if (header.test(src)) {
        src = src.replace(header, `$1import { getTimeAgo as timeAgo } from "@/lib/utils";\n`);
        src = src.replace(/function timeAgo\s*\([^)]*\)\s*\{[\s\S]*?\n\}\n?/g, "");
        src = src.replace(/const timeAgo\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};\n?/g, "");
        replaced++;
      }
    }

    if (src !== original) {
      await writeFile(p, src, "utf8");
      filesTouched++;
      console.log(C.green(`✓ ${relative(ROOT, p)}`));
    } else {
      console.log(C.dim(`  ${relative(ROOT, p)} — unchanged`));
    }
  }

  console.log(`\n${replaced} timeAgo replacements, ${filesTouched} files touched.\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPATCH
// ═══════════════════════════════════════════════════════════════════════════

const { kind, name, flags } = parseArgs(process.argv.slice(2));
const HANDLERS = { init: cmdInit, "init-groups": cmdInitGroups, new: cmdNew, audit: cmdAudit, fix: cmdFix, sweep: cmdSweep };

if (!kind || !HANDLERS[kind]) {
  console.log(`
${C.bold("Gate Monitor — Dashboard Cookie Cutter (v2)")

  ${C.bold("node scripts/dash.mjs init")}                 install shared primitives
  ${C.bold("node scripts/dash.mjs init-groups")}          add error/loading/not-found to each (group)
  ${C.bold("node scripts/dash.mjs new <role> [flags]")}   create a fully-wired dashboard
  ${C.bold("node scripts/dash.mjs audit")}                scan all pages against 34 rules
  ${C.bold("node scripts/dash.mjs fix <file>")}           auto-patch safe wins
  ${C.bold("node scripts/dash.mjs sweep")}                cross-file fixes (timeAgo, etc.)

${C.bold("new flags:")}
  --min-tier <n>   --route <path>   --title "…"   --group (x)   --alerts <url>   --layout

${C.bold("Migration loop:")}
  ${C.dim("1. node scripts/dash.mjs init && node scripts/dash.mjs init-groups")}
  ${C.dim("2. node scripts/dash.mjs audit | tee baseline.txt")}
  ${C.dim("3. for f in \$(grep -oP '^\\S+\.tsx' baseline.txt); do node scripts/dash.mjs fix \"$f\"; done})
  ${C.dim("4. node scripts/dash.mjs sweep")}
  ${C.dim("5. node scripts/dash.mjs audit   # target: All N pages pass")}
`);
  process.exit(kind ? 1 : 0);
}

await HANDLERS[kind](name, flags);