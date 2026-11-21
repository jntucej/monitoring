"use client";

/**
 * InspectOverlay — a developer inspect mode for Gate Monitor.
 *
 * Click any element and it shows the page route, the button label (when
 * clicked on a button), the capability that gates it, and what the data
 * calls are. It reads the same .app-map.json that /sysadmin/app-map
 * renders, so the inspect panel and the map page never drift apart.
 *
 * Safety (per the plan):
 *   - DEV-ONLY: the component no-ops in production builds
 *     (process.env.NODE_ENV !== "development" → returns null immediately).
 *   - Gated: it only activates when the URL carries ?inspect (or the hash
 *     #inspect), so a sysadmin has to deliberately open it. It can never
 *     show up in a user's normal session.
 *   - Read-only: it intercepts clicks to read labels, but does NOT prevent
 *     the default action or stop propagation — the app behaves exactly as
 *     normal; the panel is a passive overlay.
 *   - No secrets: it only shows route / label / capability id. It never
 *     reads, prints, or exfiltrates tokens, credentials, or data values.
 *   - Zero impact: it is a fixed bottom panel + a 1-line status bar; no
 *     layout shift, no re-render of app state.
 */

import { useEffect, useMemo, useState } from "react";

interface ButtonEntry {
  label: string;
  handler: string | null;
  action: string | null;
  capability: string | null;
}
interface PageEntry {
  route: string;
  title: string | null;
  role: string | null;
  fetches: { method: string; url: string }[];
  buttons: ButtonEntry[];
  capabilities: string[];
}
interface AppMap {
  pages: PageEntry[];
}

interface InspectHit {
  route: string;
  pageTitle: string | null;
  role: string | null;
  elementTag: string;
  elementLabel: string | null;
  matchedButton: ButtonEntry | null;
  matchedCapability: string | null;
  fetches: { method: string; url: string }[];
}

/** Strip whitespace + truncate for the panel. */
function shortLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > 80 ? t.slice(0, 80) + "…" : t;
}

/** Does this element's text match a button entry in the page map? */
function matchButton(
  elementLabel: string | null,
  buttons: ButtonEntry[],
): { button: ButtonEntry | null; capability: string | null } {
  if (!elementLabel) return { button: null, capability: null };
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, " ").trim();
  const target = norm(elementLabel);
  // Exact match first.
  const exact = buttons.find((b) => norm(b.label) === target);
  if (exact) return { button: exact, capability: exact.capability };
  // Fuzzy: the element label contains the button label (or vice versa).
  const fuzzy = buttons.find((b) => {
    const bl = norm(b.label);
    if (!bl) return false;
    return target.includes(bl) || bl.includes(target);
  });
  return { button: fuzzy ?? null, capability: fuzzy?.capability ?? null };
}

export function InspectOverlay() {
  const [active, setActive] = useState(false);
  const [hit, setHit] = useState<InspectHit | null>(null);
  const [copied, setCopied] = useState(false);

  // Dev-only + gated: bail out immediately in production or without ?inspect.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const q = new URLSearchParams(window.location.search).get("inspect");
    const hashInspect = window.location.hash.includes("inspect");
    setActive(!!q || hashInspect);
  }, []);

  // Load the app-map once when active.
  const map = useMemo<AppMap | null>(() => null, []);
  const [mapData, setMapData] = useState<AppMap | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch("/api/dev/app-map")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.pages)) setMapData(json);
      })
      .catch(() => {
        /* read-only; ignore */
      });
    return () => {
      cancelled = true;
    };
    void map;
  }, [active, map]);

  // Click interceptor — passive (does not preventDefault / stopPropagation).
  useEffect(() => {
    if (!active || !mapData) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const route = window.location.pathname;
      const page = mapData.pages.find((p) => p.route === route);
      if (!page) return;
      // Walk up to the nearest button-like element to capture its label.
      let btnEl: HTMLElement | null = null;
      let el: HTMLElement | null = target;
      while (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === "button" || el.getAttribute("role") === "button") {
          btnEl = el;
          break;
        }
        el = el.parentElement;
      }
      const elementLabel =
        btnEl?.textContent ??
        target.textContent ??
        target.getAttribute("aria-label") ??
        null;
      const { button, capability } = matchButton(
        shortLabel(elementLabel),
        page.buttons,
      );
      setHit({
        route,
        pageTitle: page.title,
        role: page.role,
        elementTag: target.tagName.toLowerCase(),
        elementLabel: shortLabel(elementLabel),
        matchedButton: button,
        matchedCapability: capability ?? page.capabilities[0] ?? null,
        fetches: page.fetches,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, mapData]);

  // Copy-to-clipboard for the "where do I go" handoff.
  const copySnippet = () => {
    if (!hit) return;
    const lines = [
      `Route: ${hit.route} (${hit.role ?? "unknown role"})`,
      hit.pageTitle ? `Page: ${hit.pageTitle}` : "",
      hit.elementLabel ? `Clicked: <${hit.elementTag}> "${hit.elementLabel}"` : "",
      hit.matchedCapability ? `Gated by capability: ${hit.matchedCapability}` : "",
      hit.matchedButton?.action
        ? `Action: ${hit.matchedButton.action}`
        : "Action: (describe me — add @action \"...\" above the handler)",
      hit.fetches.length
        ? `Data: ${hit.fetches.map((f) => `${f.method} ${f.url}`).join(", ")}`
        : "",
    ].filter(Boolean);
    navigator.clipboard
      ?.writeText(lines.join("\n"))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  // Dev-only gate: production never renders anything.
  if (process.env.NODE_ENV !== "development" || !active) return null;

  return (
    <>
      {/* Status bar (top-right, 1 line) */}
      <div
        className="fixed top-2 right-2 z-[100] rounded-full bg-slate-900/90 px-3 py-1 text-xs text-white shadow-lg"
        role="status"
        aria-live="polite"
      >
        inspect mode ·{" "}
        <button
          type="button"
          onClick={() => setActive(false)}
          className="ml-1 text-slate-300 underline hover:text-white"
        >
          off
        </button>
      </div>

      {/* Panel (bottom, shown on click) */}
      {hit && (
        <div
          className="fixed bottom-3 left-1/2 z-[100] w-[min(560px,92vw)] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 shadow-2xl"
          role="dialog"
          aria-label="Inspect panel"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-slate-400">{hit.route}</div>
              <div className="font-medium">
                {hit.pageTitle ?? "(no title)"}{" "}
                <span className="text-xs text-slate-400">
                  · role: {hit.role ?? "unassigned"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={copySnippet}
              className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>

          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-400">clicked</dt>
              <dd className="font-mono">
                {"<"}
                {hit.elementTag}
                {hit.elementLabel ? ` “${hit.elementLabel}”` : ""}
                {">"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-400">capability</dt>
              <dd>
                {hit.matchedCapability ? (
                  <code className="text-amber-300">{hit.matchedCapability}</code>
                ) : (
                  <span className="text-slate-500">none</span>
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-400">action</dt>
              <dd>
                {hit.matchedButton?.action ? (
                  <span>{hit.matchedButton.action}</span>
                ) : (
                  <span className="italic text-slate-500">
                    (describe me — add @action “...” above the handler)
                  </span>
                )}
              </dd>
            </div>
            {hit.fetches.length > 0 && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-400">data</dt>
                <dd className="font-mono text-slate-300">
                  {hit.fetches.map((f) => `${f.method} ${f.url}`).join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </>
  );
}

export default InspectOverlay;
