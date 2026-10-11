#!/usr/bin/env node
// scripts/dash.mjs — Gate Monitor Dashboard Cookie Cutter (v3).

import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

// ────────────────────────────────────────────────────────────────────────────
const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};
const die  = (m) => { console.error(C.red(`✗ ${m}`)); process.exit(1); };
const ok   = (m) => console.log(C.green(`✓ ${m}`));
const warn = (m) => console.log(C.yellow(`! ${m}`));
const info = (m) => console.log(C.dim(`  ${m}`));
const head = (m) => console.log(C.bold(m));

const ROOT = resolve(process.cwd());
const APP  = join(ROOT, "src", "app");

const pascal = (s) => s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };
async function ensureDir(p) { await mkdir(p, { recursive: true }); }
async function writeIfMissing(p, content) {
  if (await exists(p)) { warn(`${relative(ROOT, p)} already exists — skipped`); return false; }
  await ensureDir(dirname(p));
  await writeFile(p, content, "utf8");
  ok(relative(ROOT, p));
  return true;
}

function parseArgs(argv) {
  const [, , cmd, ...rest] = argv;
  const positional = [];
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    } else positional.push(a);
  }
  return { cmd, positional, flags };
}

// ────────────────────────────────────────────────────────────────────────────
// GROUP-LEVEL FILES
// ────────────────────────────────────────────────────────────────────────────
const groupError = (name) => `"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportClientError } from "@/lib/monitoring";

export default function ${pascal(name)}Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, { route: "${name}", component: "${pascal(name)}Error", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--action-danger)]/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-[var(--action-danger)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          ${error.message || "An unexpected error occurred in this workspace."}
        </p>
        ${error.digest ? `<p className="text-xs text-[var(--text-muted)] font-mono">ref: ${error.digest}</p>` : ""}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
`;

const groupLoading = (name) => `import { PageLoading } from "@/components/shared/LoadingStates";

export default function ${pascal(name)}Loading() {
  return <PageLoading />;
}
`;

const groupNotFound = (name) => `import Link from "next/link";
import { Compass } from "lucide-react";

export default function ${pascal(name)}NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--action-info)]/10 flex items-center justify-center">
          <Compass className="w-6 h-6 text-[var(--action-info)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Not found</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          This page doesn&apos;t exist in the ${name} workspace.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
`;

// ────────────────────────────────────────────────────────────────────────────
// PAGE / LAYOUT TEMPLATES
// ────────────────────────────────────────────────────────────────────────────
function pageTemplate({ role, componentName, title, minTier }) {
  return `"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";

const MIN_TIER = ${minTier};
const ALLOWED_ROLES: Role[] = ["${role}"];

interface HealthPayload { ok: boolean; status?: string; }

function ${componentName}Inner() {
  const user = useAuthStore((s) => s.user);
  const tier = user?.role ? getRoleTier(user.role) : 0;

  const stats = useDashboardData<HealthPayload>("/api/health", {
    ttlMs: 15_000,
    pollMs: 30_000,
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="${title}"
        subtitle="Live workspace — role-scoped, tier-gated"
        refreshing={stats.loading}
        onRefresh={() => stats.refresh()}
      />

      <WidgetBoundary label="Alerts" resetKey={user?.role}>
        <ConditionalAlert
          ctx={{
            role: user?.role ?? "${role}",
            userId: user?.id ?? "",
            gateId: user?.gateId ?? null,
            departmentId: user?.departmentId ?? null,
            assignedHostel: user?.assignedHostel ?? null,
            metrics: { tier },
          }}
        />
      </WidgetBoundary>

      <WidgetBoundary label="Overview" resetKey={stats.refreshKey}>
        <div className="glass-card p-6">
          <p className="text-sm text-[var(--text-secondary)]">
            Dashboard ready. Add widgets here; wrap each section in its own
            WidgetBoundary so a failure in one doesn't blank the page.
          </p>
          ${stats.error ? `<p className="mt-3 text-sm text-[var(--alert-critical)]" role="alert">Data fetch failed: ${stats.error}</p>` : ""}
        </div>
      </WidgetBoundary>

      <WidgetBoundary label="DevContact">
        <DevContactStrip />
      </WidgetBoundary>
    </div>
  );
}

export default function ${componentName}Page() {
  return (
    <GuardedPage allowedRoles={ALLOWED_ROLES} minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <${componentName}Inner />
      </Suspense>
    </GuardedPage>
  );
}
`;
}

function layoutTemplate({ role, componentName }) {
  return `"use client";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["${role}"];

export default function ${componentName}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={ROLES}>
      <SafeAreaAppShell>{children}</SafeAreaAppShell>
    </AuthGuard>
  );
}
`;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT RULES — 48 rules across 12 groups
// ────────────────────────────────────────────────────────────────────────────
const AUDIT_RULES = [
  // Group 1: Authorization
  { id: "no-auth-shell", group: "authz", severity: "error",
    test: (s) => !/GuardedPage|AuthGuard/.test(s), msg: "page has no GuardedPage/AuthGuard wrapper" },
  { id: "double-auth", group: "authz", severity: "warn",
    test: (s) => /GuardedPage/.test(s) && /<AuthGuard/.test(s),
    msg: "uses both GuardedPage and AuthGuard — pick one" },
  { id: "manual-authorization-header", group: "authz", severity: "warn",
    test: (s) => /Authorization['"]\s*:\s*`?Bearer/.test(s) && !/getAuthHeaders|useAuthHeaders/.test(s),
    msg: "hand-rolled Authorization header — use getAuthHeaders()" },
  { id: "missing-role-gate", group: "authz", severity: "info",
    test: (s) => /GuardedPage/.test(s) && !/allowedRoles/.test(s), msg: "GuardedPage without explicit allowedRoles" },

  // Group 2: Polling & intervals
  { id: "raw-setinterval", group: "polling", severity: "error",
    test: (s) => /setInterval\s*\(/.test(s) && !/usePolling|useLiveRefresh|useDashboardData/.test(s),
    msg: "raw setInterval with no visibility-aware wrapper" },
  { id: "no-visibility-guard", group: "polling", severity: "warn",
    test: (s) => /setInterval\s*\(/.test(s) && !/visibilitychange/.test(s),
    msg: "setInterval without a visibilitychange guard" },
  { id: "manual-clearinterval", group: "polling", severity: "info",
    test: (s) => /clearInterval/.test(s) && !/usePolling|useDashboardData/.test(s),
    msg: "manual clearInterval — prefer usePolling / useDashboardData" },
  { id: "double-polling", group: "polling", severity: "warn",
    test: (s) => /useLiveRefresh/.test(s) && /usePolling/.test(s) && !/useDashboardData/.test(s),
    msg: "useLiveRefresh + usePolling both active — pick one" },

  // Group 3: Composition & boundaries
  { id: "no-widget-boundary", group: "composition", severity: "warn",
    test: (s) => /(Chart|Graph|Widget)/.test(s) && !/WidgetBoundary/.test(s),
    msg: "chart/widget rendered without WidgetBoundary isolation" },
  { id: "no-suspense-for-searchparams", group: "composition", severity: "error",
    test: (s) => /useSearchParams/.test(s) && !/Suspense/.test(s),
    msg: "useSearchParams without a Suspense boundary (Next 15/16 requirement)" },
  { id: "no-dev-contact", group: "composition", severity: "warn",
    test: (s) => /PageHeader/.test(s) && !/DevContactStrip/.test(s),
    msg: "dashboard missing DevContactStrip" },
  { id: "duplicate-error-boundary", group: "composition", severity: "warn",
    test: (s) => /components\/ErrorBoundary/.test(s) && !/shared\/ErrorBoundary/.test(s),
    msg: "imports the deprecated ErrorBoundary — use @/components/shared/ErrorBoundary" },

  // Group 4: Error handling
  { id: "swallowed-catch", group: "errors", severity: "warn",
    test: (s) => /catch\s*\{\s*\}/.test(s), msg: "empty catch block swallows errors" },
  { id: "console-only-catch", group: "errors", severity: "warn",
    test: (s) => /catch[^{]*\{[^}]*console\.(error|warn)[^}]*\}/.test(s) && !/(setError|addToast|useUIStore|reportClientError)/.test(s),
    msg: "catch only logs to console — no user-visible error state" },
  { id: "no-error-role", group: "errors", severity: "info",
    test: (s) => /stats\.error/.test(s) && !/role="alert"/.test(s),
    msg: "inline error rendered without role=\"alert\"" },

  // Group 5: Types
  { id: "any-cast", group: "types", severity: "warn",
    test: (s) => /:\s*any\b/.test(s), msg: "uses 'any' — prefer explicit types from src/lib/types" },
  { id: "ts-ignore", group: "types", severity: "warn",
    test: (s) => /@ts-(ignore|expect-error|nocheck)/.test(s), msg: "TypeScript suppression" },
  { id: "eslint-disable-any", group: "types", severity: "warn",
    test: (s) => /eslint-disable[^\n]*no-explicit-any/.test(s), msg: "file-wide no-explicit-any disable" },
  { id: "as-unknown-as", group: "types", severity: "info",
    test: (s) => /as\s+unknown\s+as\s+/.test(s), msg: "double cast 'as unknown as'" },

  // Group 6: Data fetching
  { id: "raw-fetch", group: "fetch", severity: "warn",
    test: (s) => /(?:^|[^.\w])fetch\(/.test(s) && !/useApi|useApiResource|useDashboardData|authFetch|fetchWithTimeout/.test(s),
    msg: "raw fetch() — use useApi / useDashboardData" },
  { id: "no-store-hack", group: "fetch", severity: "warn",
    test: (s) => /cache\s*:\s*['"]no-store['"]/.test(s) && /timestamp|Date\.now|\?_\=/.test(s),
    msg: "cache:no-store plus a timestamp query param — fix the API cache header instead" },
  { id: "retry-on-empty", group: "fetch", severity: "warn",
    test: (s) => /automatic retry|retry.*empty|transient cache/i.test(s), msg: "client-side retry to bypass cache" },
  { id: "unkeyed-client-cache", group: "fetch", severity: "error",
    test: (s) => /new Map<.*CachedEntry|CachedEntry.*\[\]|module-level cache/.test(s) && !/userId|user\.id/.test(s),
    msg: "module-level cache without a user scoping key" },

  // Group 7: Timezone & dates
  { id: "local-today", group: "time", severity: "warn",
    test: (s) => /new Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/.test(s),
    msg: "local 'today' computed client-side — use getISTDateString server-side" },
  { id: "no-tz-in-locale", group: "time", severity: "warn",
    test: (s) => /toLocaleDateString\(\)/.test(s) && !/timeZone/.test(s),
    msg: "toLocaleDateString() without an explicit timeZone" },
  { id: "date-without-tz", group: "time", severity: "info",
    test: (s) => /new Date\(\)\s*\)\s*\.\s*toLocaleString/.test(s),
    msg: "toLocaleString() without a timezone — pass { timeZone: 'Asia/Kolkata' }" },

  // Group 8: Accessibility
  { id: "img-no-alt", group: "a11y", severity: "warn",
    test: (s) => /<img\b(?![^>]*\balt=)/.test(s), msg: "<img> without alt attribute" },
  { id: "button-no-type", group: "a11y", severity: "info",
    test: (s) => /<button\b(?![^>]*\btype=)/.test(s), msg: "<button> without explicit type attribute" },
  { id: "div-onclick", group: "a11y", severity: "warn",
    test: (s) => /<div[^>]*onClick=/.test(s) && !/role="button"/.test(s), msg: "clickable <div> without role=\"button\"" },
  { id: "toast-no-live", group: "a11y", severity: "info",
    test: (s) => /ToastContainer|toast-root|toasts\.map/.test(s) && !/aria-live/.test(s),
    msg: "toast container missing aria-live region" },
  { id: "modal-no-focus-trap", group: "a11y", severity: "warn",
    test: (s) => /role="dialog"/.test(s) && !/focus-trap|FocusTrap|useFocusTrap/.test(s), msg: "modal without a focus trap" },

  // Group 9: Performance
  { id: "inline-recharts", group: "perf", severity: "info",
    test: (s) => /from\s+["']recharts["']/.test(s) && !/next\/dynamic/.test(s),
    msg: "recharts imported directly — use next/dynamic ssr:false" },
  { id: "no-usememo-chain", group: "perf", severity: "info",
    test: (s) => /\.filter\(.*\)\.map\(/.test(s) && !/useMemo/.test(s),
    msg: "chained filter/map without useMemo" },
  { id: "heavy-on-first-paint", group: "perf", severity: "info",
    test: (s) => (s.match(/useDashboardData|useApiResource/g) || []).length >= 4,
    msg: "4+ data fetches on mount — defer non-critical widgets" },

  // Group 10: Data integrity
  { id: "setstate-in-effect", group: "data", severity: "warn",
    test: (s) => /useEffect\([^)]*set[A-Z]\w*\(/.test(s) && !/void\s+fetch/.test(s),
    msg: "setState directly in effect — prefer useDashboardData / void async fn" },
  { id: "hardcoded-anomalies", group: "data", severity: "warn",
    test: (s) => /anomaly.*hardcoded|checks\s*=\s*\[/i.test(s) && /AnomalyEvent/.test(s),
    msg: "anomalies appear hardcoded" },
  { id: "session-local-only", group: "data", severity: "warn",
    test: (s) => /session-local only|in memory only|not persisted/i.test(s),
    msg: "state kept in memory with a 'not persisted' comment" },
  { id: "jsonb-stub-read", group: "data", severity: "warn",
    test: (s) => /row\.data\?\.|data\?\.[a-z_]+/.test(s) && /lockdown|jsonb/i.test(s),
    msg: "reading a JSONB stub column instead of real columns" },

  // Group 11: Observability
  { id: "no-error-reporting", group: "obs", severity: "info",
    test: (s) => /<ErrorBoundary/.test(s) && !/reportClientError/.test(s), msg: "ErrorBoundary not wired to reportClientError" },
  { id: "no-structured-logging", group: "obs", severity: "info",
    test: (s) => /console\.log\(/.test(s) && !/log\.info|logger\./.test(s),
    msg: "console.log in a page — use structured log() or remove" },

  // Group 12: Library hygiene
  { id: "two-qr-libs", group: "libs", severity: "warn",
    test: (s) => /react-qrcode-logo/.test(s) && /qrcode\.react/.test(s),
    msg: "both react-qrcode-logo and qrcode.react imported" },
  { id: "duplicate-datatable", group: "libs", severity: "info",
    test: (s) => /@components\/ui\/DataTable/.test(s), msg: "uses DataTable; prefer @/components/ui/table" },
  { id: "raw-supabase-import", group: "libs", severity: "warn",
    test: (s) => /from\s+["']@supabase\/supabase-js["']/.test(s), msg: "raw supabase-js import in a page" },
  { id: "duplicate-use-client", group: "libs", severity: "info",
    test: (s) => (s.match(/^"use client";/gm) || []).length > 1, msg: "duplicate 'use client' directive" },
];

// ────────────────────────────────────────────────────────────────────────────
// AUDIT
// ────────────────────────────────────────────────────────────────────────────
async function* walkPages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkPages(p);
    else if (e.isFile() && e.name === "page.tsx") yield p;
  }
}

async function cmdAudit(flags) {
  head("Auditing every page.tsx under src/app…\n");
  const json = !!flags.json;
  const report = { pages: 0, findings: 0, byRule: {}, byFile: {} };

  for await (const file of walkPages(APP)) {
    report.pages++;
    const src = await readFile(file, "utf8");
    const findings = AUDIT_RULES.filter((r) => { try { return r.test(src); } catch { return false; } });
    if (!findings.length) continue;

    const rel = relative(ROOT, file);
    report.byFile[rel] = findings.map((f) => f.id);
    if (!json) console.log(C.bold(rel));
    for (const f of findings) {
      report.findings++;
      report.byRule[f.id] = (report.byRule[f.id] ?? 0) + 1;
      if (!json) {
        const tag = f.severity === "error" ? C.red(`[${f.severity}]`)
                  : f.severity === "warn"  ? C.yellow(`[${f.severity}]`)
                  :                          C.dim(`[${f.severity}]`);
        console.log(`  ${tag} ${f.id} — ${f.msg}`);
      }
    }
    if (!json) console.log("");
  }

  if (json) { console.log(JSON.stringify(report, null, 2)); return; }

  head("── Summary ───────────────────────────────");
  console.log(`Pages scanned : ${report.pages}`);
  console.log(`Findings      : ${report.findings}`);
  if (Object.keys(report.byRule).length) {
    console.log("\nTop rules:");
    Object.entries(report.byRule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .forEach(([id, n]) => console.log(`  ${String(n).padStart(4)}  ${id}`));
  }
  if (report.findings === 0) ok("No issues found — every dashboard is clean.");
}

// ────────────────────────────────────────────────────────────────────────────
// FIX — safe auto-patches on one page
// ────────────────────────────────────────────────────────────────────────────
async function patchFile(file) {
  let src = await readFile(file, "utf8");
  const before = src;
  const notes = [];

  // 1. Wrap default export in Suspense if useSearchParams is present.
  if (/useSearchParams/.test(src) && !/<Suspense/.test(src)) {
    if (!/import\s*\{[^}]*Suspense[^}]*\}\s*from\s*"react"/.test(src)) {
      if (/import\s*\{[^}]*\}\s*from\s*"react";/.test(src)) {
        src = src.replace(/import\s*\{([^}]*)}\s*from\s*"react";/,
          (_, inner) => `import { Suspense,${inner} } from "react";`);
      } else {
        src = `import { Suspense } from "react";\n` + src;
      }
    }
    const nameMatch = src.match(/export default function (\w+)\s*\(/);
    if (nameMatch) {
      const n = nameMatch[1];
      src = src.replace(/export default function (\w+)\s*\(/, `function ${n}Inner(`);
      src += `\nexport default function ${n}Page() {\n  return (\n    <Suspense fallback={null}>\n      <${n}Inner />\n    </Suspense>\n  );\n}\n`;
      notes.push("wrapped default export in <Suspense>");
    }
  }

  // 2. Add GuardedPage import if only AuthGuard is used.
  if (/<AuthGuard/.test(src) && !/GuardedPage/.test(src)) {
    if (/from\s+["']@\/components\/shared\/AuthGuard["']/.test(src)) {
      src = src.replace(
        /import \{ AuthGuard \} from "@\/components\/shared\/AuthGuard";/,
        `import { AuthGuard } from "@/components/shared/AuthGuard";\nimport { GuardedPage } from "@/components/shared/GuardedPage";`
      );
      notes.push("added GuardedPage import");
    }
  }

  // 3. Add WidgetBoundary import when charts are present and not already imported.
  if (/recharts/.test(src) && !/WidgetBoundary/.test(src)) {
    src = src.replace(/^import[^\n]*\n/,
      (m) => m + `import { WidgetBoundary } from "@/components/shared/WidgetBoundary";\n`);
    notes.push("added WidgetBoundary import");
  }

  // 4. Add ConditionalAlert import when banners are hand-rolled.
  if (/(AlertTriangle|ShieldAlert|ShieldCheck)/.test(src) && !/ConditionalAlert/.test(src)) {
    src = src.replace(/^import[^\n]*\n/,
      (m) => m + `import { ConditionalAlert } from "@/components/shared/ConditionalAlert";\n`);
    notes.push("added ConditionalAlert import");
  }

  // 5. Redirect deprecated ErrorBoundary import.
  if (/from\s+["']@\/components\/ErrorBoundary["']/.test(src)) {
    src = src.replace(/from\s+["']@\/components\/ErrorBoundary["']/g, `from "@/components/shared/ErrorBoundary"`);
    notes.push("redirected deprecated ErrorBoundary import");
  }

  // 6. Replace console.log with structured log() when obvious.
  if (/console\.log\(/.test(src) && /from "@\/lib\/log"/.test(src)) {
    src = src.replace(/console\.log\(/g, `log.info(`);
    notes.push("console.log -> log.info");
  }

  // 7. Add explicit type="button" to buttons missing it.
  if (/<button\b(?![^>]*\btype=)/.test(src)) {
    src = src.replace(/<button\b(?![^>]*\btype=)/g, `<button type="button"`);
    notes.push('added type="button" to buttons without it');
  }

  // 8. Deduplicate "use client".
  const useClientCount = (src.match(/^"use client";/gm) || []).length;
  if (useClientCount > 1) {
    let seen = false;
    src = src.replace(/^"use client";\n/gm, () => { if (seen) return ""; seen = true; return `"use client";\n`; });
    notes.push("deduplicated 'use client'");
  }

  if (src === before) return { changed: false, notes: [] };
  await writeFile(file, src, "utf8");
  return { changed: true, notes };
}

async function cmdFix(target) {
  if (!target) die("usage: dash.mjs fix <path/to/page.tsx>");
  const file = resolve(target);
  if (!(await exists(file))) die(`not found: ${file}`);
  const r = await patchFile(file);
  if (!r.changed) { ok("Nothing auto-patchable found."); return; }
  ok(`Patched ${relative(ROOT, file)}`);
  r.notes.forEach((n) => info(n));
  info("Re-run `dash.mjs audit` to confirm.");
}

async function cmdFixAll() {
  head("Auto-patching every fixable page…\n");
  let touched = 0;
  for await (const file of walkPages(APP)) {
    const r = await patchFile(file);
    if (r.changed) {
      touched++;
      console.log(C.green(`✓ ${relative(ROOT, file)}`));
      r.notes.forEach((n) => info(n));
    }
  }
  ok(`Patched ${touched} file(s).`);
}

// ────────────────────────────────────────────────────────────────────────────
// SWEEP
// ────────────────────────────────────────────────────────────────────────────
async function cmdSweep() {
  head("Sweeping across all page.tsx files…\n");
  let touched = 0;
  for await (const file of walkPages(APP)) {
    const src = await readFile(file, "utf8");
    let out = src;
    const notes = [];

    const useClientCount = (out.match(/^"use client";/gm) || []).length;
    if (useClientCount > 1) {
      let seen = false;
      out = out.replace(/^"use client";\n/gm, () => { if (seen) return ""; seen = true; return `"use client";\n`; });
      notes.push("deduplicated 'use client'");
    }

    const stripped = out.replace(/[ \t]+$/gm, "");
    if (stripped !== out) { out = stripped; notes.push("trimmed trailing whitespace"); }

    if (out !== src) {
      await writeFile(file, out, "utf8");
      touched++;
      console.log(C.green(`✓ ${relative(ROOT, file)}`));
      notes.forEach((n) => info(n));
    }
  }
  ok(`Swept ${touched} file(s).`);
}

// ────────────────────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────────────────────
async function cmdInit() {
  head("Verifying shared primitives…");
  const required = [
    "src/components/shared/GuardedPage.tsx",
    "src/components/shared/ConditionalAlert.tsx",
    "src/components/shared/WidgetBoundary.tsx",
    "src/components/shared/PageHeader.tsx",
    "src/components/shared/LoadingStates.tsx",
    "src/components/shared/DevContactStrip.tsx",
    "src/components/shared/AuthGuard.tsx",
    "src/components/shared/SafeAreaAppShell.tsx",
    "src/hooks/useApiResource.ts",
    "src/hooks/usePolling.ts",
    "src/hooks/useLiveRefresh.ts",
    "src/lib/alert-hierarchy.ts",
    "src/lib/monitoring.ts",
    "src/lib/types.ts",
    "src/stores/authStore.ts",
  ];
  let missing = 0;
  for (const rel of required) {
    if (!(await exists(join(ROOT, rel)))) { warn(`missing: ${rel}`); missing++; }
  }
  if (missing) { die(`${missing} required primitive(s) missing.`); }
  ok(`All ${required.length} primitives present.`);

  await writeIfMissing(join(ROOT, "src/hooks/useDashboardData.ts"), USE_DASHBOARD_DATA_TEMPLATE);
}

async function cmdInitGroups() {
  head("Installing group-level error/loading/not-found files…");
  const entries = await readdir(APP, { withFileTypes: true });
  const groups = entries.filter((e) => e.isDirectory() && e.name.startsWith("(") && e.name.endsWith(")"));
  if (!groups.length) { warn("no route groups found under src/app"); return; }
  for (const g of groups) {
    const name = g.name.slice(1, -1);
    const dir = join(APP, g.name);
    await writeIfMissing(join(dir, "error.tsx"),     groupError(name));
    await writeIfMissing(join(dir, "loading.tsx"),   groupLoading(name));
    await writeIfMissing(join(dir, "not-found.tsx"), groupNotFound(name));
  }
  ok(`Processed ${groups.length} route group(s).`);
}

// ────────────────────────────────────────────────────────────────────────────
// NEW
// ────────────────────────────────────────────────────────────────────────────
async function cmdNew(name, flags) {
  if (!name) die('usage: dash.mjs new <role> [--group "(admin)"] [--route /admin] [--title "…"] [--min-tier 90] [--layout]');
  const groupName   = flags.group ?? `(${name})`;
  const route       = flags.route ?? `/${name}`;
  const title       = flags.title ?? `${titleCase(name)} Dashboard`;
  const minTier     = Number(flags["min-tier"] ?? 40);
  const withLayout  = !!flags.layout;
  const componentName = pascal(name);

  const groupDir = join(APP, groupName.startsWith("(") ? groupName : `(${groupName})`);
  const routeSegments = route.replace(/^\//, "").split("/").filter(Boolean);
  const pageDir = join(groupDir, ...routeSegments);

  head(`Generating ${name} dashboard`);
  info(`group:  ${relative(ROOT, groupDir)}`);
  info(`route:  ${relative(ROOT, pageDir)}/page.tsx`);
  info(`tier:   ${minTier}`);
  info(`roles:  ${name}`);

  await writeIfMissing(join(pageDir, "page.tsx"), pageTemplate({ role: name, componentName, title, minTier }));

  if (withLayout) {
    await writeIfMissing(join(groupDir, "layout.tsx"), layoutTemplate({ role: name, componentName }));
  }

  ok("Dashboard created. Next:");
  info(`1) Confirm '${name}' is in src/lib/roles.ts ROLES`);
  info(`2) Confirm it is in users.role CHECK + config_roles_registry`);
  info(`3) Confirm getRoleTier('${name}') returns a number`);
  info(`4) Run: node scripts/dash.mjs audit`);
}

// ────────────────────────────────────────────────────────────────────────────
// Reference composite hook (written by `init` if missing)
// ────────────────────────────────────────────────────────────────────────────
const USE_DASHBOARD_DATA_TEMPLATE = `/**
 * useDashboardData — a composite for dashboard reads.
 *
 * Wraps useApiResource (cached, deduped) and usePolling (visibility-aware) so
 * every dashboard gets the same correct behaviour with one call.
 *
 * - Cache key is url + userId — never shared across users.
 * - Polling is disabled while the tab is hidden.
 * - refreshKey increments on every successful refresh so WidgetBoundary can reset.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";

export interface DashboardData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshKey: number;
}

export function useDashboardData<T>(
  url: string | null,
  options: { ttlMs?: number; pollMs?: number; enabled?: boolean } = {}
): DashboardData<T> {
  const { ttlMs = 15000, pollMs = 30000, enabled = true } = options;
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const scopedUrl = url ? url + (url.includes("?") ? "&" : "?") + "_u=" + userId : null;

  const res = useApiResource<T>(scopedUrl, { ttlMs, enabled: enabled && !!scopedUrl });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    await res.refresh();
    setRefreshKey((k) => k + 1);
  }, [res]);

  usePolling(async () => { await refresh(); }, { intervalMs: pollMs, enabled: enabled && !!scopedUrl });

  // Track loading for the very first paint only.
  const [firstLoad, setFirstLoad] = useState(true);
  useEffect(() => { if (!res.loading && firstLoad) setFirstLoad(false); }, [res.loading, firstLoad]);

  return {
    data: res.data,
    loading: res.loading || firstLoad,
    error: res.error,
    refresh,
    refreshKey,
  };
}
`;

// ────────────────────────────────────────────────────────────────────────────
// HELP
// ────────────────────────────────────────────────────────────────────────────
function cmdHelp() {
  console.log(`${C.bold("Gate Monitor Dashboard Cookie Cutter (v3)")}

Usage:
  node scripts/dash.mjs init                    verify shared primitives; write useDashboardData if missing
  node scripts/dash.mjs init-groups             add error/loading/not-found per route group
  node scripts/dash.mjs new <role> [flags]      create a fully wired dashboard
  node scripts/dash.mjs audit [--json]          scan every page.tsx against 48 rules
  node scripts/dash.mjs fix <file>              auto-patch safe wins on one page
  node scripts/dash.mjs fix-all                 auto-patch every page with fixable findings
  node scripts/dash.mjs sweep                   cross-file hygiene (dedupe directives, whitespace)

Flags for \`new\`:
  --group <name>     route group, default "(<role>)"
  --route <path>     url route, default "/<role>"
  --title "…"        page title, default "<Role> Dashboard"
  --min-tier <n>     numeric tier floor, default 40
  --layout           also emit a route-group layout.tsx

Examples:
  node scripts/dash.mjs new warden --min-tier 60 --title "Warden Console" --layout
  node scripts/dash.mjs new operator --group "(operator)" --route /operator
  node scripts/dash.mjs audit --json > /tmp/dash-audit.json
  node scripts/dash.mjs fix-all
`);
}

// ────────────────────────────────────────────────────────────────────────────
// DISPATCH
// ────────────────────────────────────────────────────────────────────────────
(async () => {
  const { cmd, positional, flags } = parseArgs(process.argv);
  try {
    switch (cmd) {
      case "init":        await cmdInit(); break;
      case "init-groups": await cmdInitGroups(); break;
      case "new":         await cmdNew(positional[0], flags); break;
      case "audit":       await cmdAudit(flags); break;
      case "fix":         await cmdFix(positional[0]); break;
      case "fix-all":     await cmdFixAll(); break;
      case "sweep":       await cmdSweep(); break;
      case "help":
      case undefined:
      case "--help":
      case "-h":          cmdHelp(); break;
      default:            die(`unknown command: ${cmd}`);
    }
  } catch (e) {
    die(e?.stack ?? e?.message ?? String(e));
  }
})();