#!/usr/bin/env ts-node
/**
 * scripts/build-app-map.ts — scan src/app and emit .app-map.json.
 *
 * One place that lists every page, who sees it, what data it loads, and what
 * each button does — in plain English. The scan is heuristic (regex); it
 * covers ~80-90% of pages well enough to SEE the app. Read the existing
 * code; it stays current automatically and becomes one fewer thing to
 * maintain by hand.
 *
 * Output shape (one entry per page.tsx):
 *   {
 *     route: "/student/passes",
 *     file:  "src/app/(student)/student/passes/page.tsx",
 *     title: "My Passes" | null,
 *     subtitle: "..." | null,
 *     role:  "student" | "supervisor" | ... (from the route group),
 *     fetches: [{method, url}],
 *     buttons: [{label, handler, action}],
 *     capabilities: ["hostel.leave.apply", ...],
 *     navEntry: {label, href} | null,
 *   }
 *
 * Run: npx tsx scripts/build-app-map.ts   (writes .app-map.json)
 */

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FetchCall {
  method: string;
  url: string;
}
interface ButtonEntry {
  label: string;
  handler: string | null;
  /** plain-English from a `@action "..."` comment above the handler. */
  action: string | null;
  /** the capability id that gates this button, when annotated. */
  capability: string | null;
}
interface PageEntry {
  route: string;
  file: string;
  title: string | null;
  subtitle: string | null;
  role: string | null;
  fetches: FetchCall[];
  buttons: ButtonEntry[];
  capabilities: string[];
  navEntry: { label: string; href: string } | null;
}
interface AppMap {
  generatedAt: string;
  pageCount: number;
  pages: PageEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Walk a dir, return all .tsx page files (relative to root). */
function findPageFiles(root: string, dir: string = ""): string[] {
  const full = join(root, dir);
  const entries = readdirSync(full).map((name) => join(full, name));
  const out: string[] = [];
  for (const entry of entries) {
    let st;
    try {
      st = statSync(entry);
    } catch {
      continue;
    }
    const rel = join(dir, entry.split("/").pop() ?? "");
    if (st.isDirectory()) {
      // Skip api/ (route handlers, not pages) and hidden dirs.
      const dirName = entry.split("/").pop() ?? "";
      if (dirName === "api" || dirName.startsWith(".")) continue;
      out.push(...findPageFiles(root, rel));
    } else if (entry.endsWith("page.tsx")) {
      out.push(rel);
    }
  }
  return out;
}

/** Derive the route from the file path (strip (group) + /page.tsx). */
function deriveRoute(file: string): string {
  // file looks like "src/app/(student)/student/passes/page.tsx"
  let p = file.replace(/^src\/app\//, "").replace(/\/page\.tsx$/, "");
  // Remove route-group segments "(...)"
  p = p.replace(/\([^)]*\)\//g, "").replace(/\([^)]*\)$/g, "");
  return "/" + p;
}

/** Derive the role from the route group "((student))" or "((approver))". */
function deriveRole(file: string): string | null {
  const m = file.match(/src\/app\/\(([^)]*)\)/);
  if (m) return m[1];
  // Fallback: second path segment after src/app/.
  const seg = file.split("/")[2];
  return seg && !seg.startsWith("(") ? seg : null;
}

/** Map a role-group name to a readable label. */
const ROLE_LABELS: Record<string, string> = {
  student: "Students",
  supervisor: "Supervisors",
  operator: "Gate Operators",
  principal: "Principal / Warden",
  hod: "HODs / Academics",
  faculty: "Faculty",
  staff: "Staff",
  visitor: "Visitors",
  worker: "Workers",
  guardian: "Guardians / Parents",
  mess: "Mess",
  approver: "Approvers",
  sysadmin: "SysAdmin",
  exam: "Examinations",
  "exam-branch": "Exam Branch",
  "exam-superintendent": "Exam Superintendent",
};
function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Extract fetch URLs from a page's source (regex, heuristic). */
function extractFetches(src: string): FetchCall[] {
  const out: FetchCall[] = [];
  const seen = new Set<string>();
  // fetch("/api/...") — GET default; fetch("url", {method: "POST"}) explicit
  const re = /fetch\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\{[^}]*method:\s*["'`]([A-Z]+)["'`])?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const url = m[1];
    const method = m[2] ?? "GET";
    const key = method + " " + url;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ method, url });
    }
  }
  // useApiResource / useApi hooks
  const useRe = /useApi(?:Resource)?\(\s*["'`]([^"'`]+)["'`]/g;
  while ((m = useRe.exec(src)) !== null) {
    const url = m[1];
    const key = "GET " + url;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ method: "GET", url });
    }
  }
  return out;
}

/** Extract button labels + handlers + @action annotations. */
function extractButtons(src: string): ButtonEntry[] {
  const out: ButtonEntry[] = [];
  const lines = src.split("\n");

  // Pass 1: collect @action annotations by line number.
  const actionByLine = new Map<number, string>();
  const capByLine = new Map<number, string>();
  lines.forEach((line, i) => {
    const a = line.match(/@action\s+["']([^"']+)["']/);
    if (a) actionByLine.set(i, a[1]);
    const c = line.match(/@capability\s+["']([^"']+)["']/);
    if (c) capByLine.set(i, c[1]);
  });

  // Pass 2: find <button>Label</button> and <Button ...>Label</Button> with
  // an onClick. The label is the text content; the handler is the onClick
  // prop; the @action is the nearest comment above.
  const btnRe = /<button[^>]*>([\s\S]*?)<\/button>|<Button[^>]*>([\s\S]*?)<\/Button>/g;
  let m: RegExpExecArray | null;
  while ((m = btnRe.exec(src)) !== null) {
    const raw = m[0];
    const label = (m[1] ?? m[2])?.trim() || null;
    // The label may itself contain nested JSX; take the first text run.
    const cleanLabel = label?.replace(/\s+/g, " ").slice(0, 60) || null;
    // handler
    const onClick = raw.match(/onClick=\{?(\w+|[^\s}]+)\}?/)
      ? raw.match(/onClick=\{?(\w+|[^\s}]+)\}?/)![1]
      : null;
    // nearest @action / @capability above this button (within ~5 lines)
    const btnLine = src.slice(0, m.index).split("\n").length;
    let action: string | null = null;
    let capability: string | null = null;
    for (let d = 1; d <= 6; d++) {
      const above = btnLine - d;
      if (actionByLine.has(above)) action = actionByLine.get(above)!;
      if (capByLine.has(above)) capability = capByLine.get(above)!;
      if (action && capability) break;
    }
    if (cleanLabel) {
      out.push({ label: cleanLabel, handler: onClick, action, capability });
    }
  }
  return out.slice(0, 12); // cap at 12 per page (the map stays readable)
}

/** Extract capability ids from the page (GuardedPage / RoleGate / when()). */
function extractCapabilities(src: string): string[] {
  const out = new Set<string>();
  const capRe = /(?:capability|feature)=["']([a-z0-9._-]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(src)) !== null) out.add(m[1]);
  // @capability annotations
  const annRe = /@capability\s+["']([^"']+)["']/g;
  while ((m = annRe.exec(src)) !== null) out.add(m[1]);
  return [...out];
}

/** Extract title/subtitle from PageHeader / title= / <h1>. */
function extractTitleSubtitle(src: string): { title: string | null; subtitle: string | null } {
  // PageHeader title="..." subtitle="..."
  const ph = src.match(/<PageHeader[^>]*title=["']([^"']+)["'][^>]*>/s);
  const ps = src.match(/<PageHeader[^>]*subtitle=["']([^"']+)["'][^>]*>/s);
  let title: string | null = ph ? ph[1] : null;
  let subtitle: string | null = ps ? ps[1] : null;

  // Fallback: a standalone title="..." on the first component
  if (!title) {
    const t = src.match(/\btitle=["']([^"']+)["']/);
    title = t ? t[1] : null;
  }
  // Fallback: <h1>text</h1>
  if (!title) {
    const h1 = src.match(/<h1[^>]*>([^<]+)<\/h1>/);
    title = h1 ? h1[1].trim() : null;
  }
  return { title, subtitle };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const root = process.cwd();
  const srcApp = join(root, "src", "app");
  const files = findPageFiles(root, "src/app");
  const pages: PageEntry[] = [];
  for (const file of files) {
    const full = join(root, file);
    let src: string;
    try {
      src = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    const { title, subtitle } = extractTitleSubtitle(src);
    const entry: PageEntry = {
      route: deriveRoute(file),
      file: file,
      title,
      subtitle,
      role: deriveRole(file),
      fetches: extractFetches(src),
      buttons: extractButtons(src),
      capabilities: extractCapabilities(src),
      navEntry: null, // filled in by a second pass over _shell/nav.ts
    };
    pages.push(entry);
  }

  // Second pass: link each page to its _shell/nav.ts entry (if any).
  const navFiles = new Set<string>();
  // collect all nav hrefs from the _shell/nav.ts files
  const navByHref = new Map<string, { label: string; href: string }>();
  const allDirs = findPageFiles(root, "src"); // walk src, not just pages
  for (const f of allDirs) {
    if (f.endsWith("_shell/nav.ts")) {
      const full = join(root, f);
      let src = "";
      try {
        src = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      navFiles.add(f);
      const hrefRe = /href:\s*["'](\/[^"']+)["']\s*,?\s*label:\s*["']([^"']+)["']/g;
      let m: RegExpExecArray | null;
      while ((m = hrefRe.exec(src)) !== null) {
        navByHref.set(m[1], { label: m[2], href: m[1] });
      }
      // also the reverse order (label before href) — our nav.ts uses href first
    }
  }
  for (const p of pages) {
    const match = navByHref.get(p.route);
    if (match) p.navEntry = match;
  }

  const map: AppMap = {
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
  };

  const outPath = join(root, ".app-map.json");
  writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`[app-map] scanned ${pages.length} pages → ${outPath}`);
}

export { findPageFiles, deriveRoute, deriveRole, extractFetches, extractButtons, extractCapabilities, extractTitleSubtitle };
export type { PageEntry, AppMap, ButtonEntry, FetchCall };

// When run as a script (npx tsx scripts/build-app-map.ts), build the map.
// (import.meta.url check is the ESM-safe way; tsx handles it.)
if (typeof require !== "undefined" && require.main === module) {
  main();
} else if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
