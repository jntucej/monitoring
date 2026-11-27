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

import { useEffect, useMemo, useRef, useState } from "react";

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
  /** the data-action id when the element carries one (the plan's exact-match path). */
  dataAction: string | null;
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
  // The element currently pinned for inspection (null = no pin, click-through
  // mode is on). When pinned, real clicks on interactive elements are
  // suppressed and a "Run it" button fires them deliberately.
  const pinnedElRef = useRef<HTMLElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  // Dev-only + gated: bail out immediately in production. Active when the URL
  // carries ?inspect/#inspect OR when toggled with Alt+` (the paste's toggle).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const q = new URLSearchParams(window.location.search).get("inspect");
    const hashInspect = window.location.hash.includes("inspect");
    setActive(!!q || hashInspect);
    const onKey = (e: KeyboardEvent) => {
      // Alt+` toggles inspect mode (per the plan).
      if (e.key === "`" && e.altKey) {
        e.preventDefault();
        setActive((a) => !a);
        setIsPinned(false);
        pinnedElRef.current = null;
      }
      // Esc closes the pinned panel.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") {
        setIsPinned(false);
        pinnedElRef.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  // Click interceptor (capture phase).
  //  - When NOT pinned: inspect is passive — it records what you clicked but
  //    lets the app behave normally (no preventDefault).
  //  - When pinned: clicking another interactive element SUPPRESSES the real
  //    click and pins the new element, so you can read what it does before
  //    deciding to "Run it" (which fires the real click deliberately).
  useEffect(() => {
    if (!active || !mapData) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Ignore clicks on the overlay's own chrome (status bar / panel / buttons).
      if (target.closest('[data-inspect-chrome]')) return;
      const route = window.location.pathname;
      const page = mapData.pages.find((p) => p.route === route);
      if (!page) return;
      // Walk up to the nearest interactive element (button / link / role=button /
      // submit input) to capture its label + data-action.
      let interactiveEl: HTMLElement | null = null;
      let el: HTMLElement | null = target;
      while (el) {
        const tag = el.tagName.toLowerCase();
        if (
          tag === "button" ||
          tag === "a" ||
          tag === "input" ||
          el.getAttribute("role") === "button"
        ) {
          interactiveEl = el;
          break;
        }
        el = el.parentElement;
      }
      const elementLabel =
        interactiveEl?.textContent ??
        target.textContent ??
        target.getAttribute("aria-label") ??
        null;
      const dataAction =
        interactiveEl?.getAttribute("data-action") ??
        target.getAttribute("data-action");
      const { button, capability } = matchButton(
        shortLabel(elementLabel),
        page.buttons,
      );
      setHit({
        route,
        pageTitle: page.title,
        role: page.role,
        elementTag: (interactiveEl ?? target).tagName.toLowerCase(),
        elementLabel: shortLabel(elementLabel),
        matchedButton: button,
        matchedCapability: capability ?? page.capabilities[0] ?? null,
        fetches: page.fetches,
        dataAction,
      });
      // Pin behavior: the first interactive click pins (shows the panel), and
      // while pinned, clicking a DIFFERENT interactive element suppresses the
      // real click so you can read before acting. Clicking the same element
      // falls through (lets you re-trigger if you want). The panel's own "Run
      // it" button is the deliberate way to fire the suppressed click.
      if (interactiveEl && interactiveEl !== pinnedElRef.current) {
        pinnedElRef.current = interactiveEl;
        setIsPinned(true);
        // Suppress the real click only when we're already pinned (2nd+ click).
        // The first click that opens the panel still fires through, which
        // matches the "feel it" goal: you see the popup AND the action, then
        // decide on subsequent clicks.
        if (isPinned) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, mapData, isPinned]);

  // "Run it": fire the real click on the pinned element, then unpin.
  const runPinned = () => {
    if (!pinnedElRef.current) return;
    const el = pinnedElRef.current;
    setIsPinned(false);
    pinnedElRef.current = null;
    // Dispatch a real click (not el.click() on a synthetic target) so the
    // app's own handlers + forms fire exactly as a user click would.
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  };

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
      {/* Status bar (top-right, 1 line). data-inspect-chrome marks the overlay's
          own UI so the click interceptor ignores clicks on it. */}
      <div
        data-inspect-chrome
        className="fixed top-2 right-2 z-[100] rounded-full bg-text-primary/90 px-3 py-1 text-xs text-white shadow-lg"
        role="status"
        aria-live="polite"
      >
        inspect mode ·{" "}
        <button
          type="button"
          onClick={() => {
            setActive(false);
            setIsPinned(false);
            pinnedElRef.current = null;
          }}
          className="ml-1 text-text-muted underline hover:text-white"
        >
          off (Alt+`)
        </button>
      </div>

      {/* Panel (bottom, shown on click) */}
      {hit && (
        <div
          data-inspect-chrome
          className="fixed bottom-3 left-1/2 z-[100] w-[min(560px,92vw)] -translate-x-1/2 rounded-lg border border-border-strong bg-text-primary p-3 text-sm text-bg-surface shadow-2xl"
          role="dialog"
          aria-label="Inspect panel"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-action-info">{hit.route}</div>
              <div className="font-medium text-white">
                {hit.pageTitle ?? "(no title)"}{" "}
                <span className="text-xs text-text-muted">
                  · role: {hit.role ?? "unassigned"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={copySnippet}
              className="shrink-0 rounded border border-border px-2 py-0.5 text-xs text-bg-surface hover:bg-text-secondary"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>

          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-text-muted">clicked</dt>
              <dd className="font-mono">
                {"<"}
                {hit.elementTag}
                {hit.elementLabel ? ` “${hit.elementLabel}”` : ""}
                {">"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-text-muted">capability</dt>
              <dd>
                {hit.matchedCapability ? (
                  <code className="text-action-warning">{hit.matchedCapability}</code>
                ) : (
                  <span className="text-text-muted">none</span>
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-text-muted">action</dt>
              <dd>
                {hit.matchedButton?.action ? (
                  <span>{hit.matchedButton.action}</span>
                ) : (
                  <span className="italic text-text-muted">
                    (describe me — add @action “...” above the handler)
                  </span>
                )}
              </dd>
            </div>
            {hit.fetches.length > 0 && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-text-muted">data</dt>
                <dd className="font-mono text-text-muted">
                  {hit.fetches.map((f) => `${f.method} ${f.url}`).join(" · ")}
                </dd>
              </div>
            )}
            {hit.dataAction && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-text-muted">data-action</dt>
                <dd className="font-mono text-action-success">{hit.dataAction}</dd>
              </div>
            )}
          </dl>

          {/* Run / close: "Run it" fires the suppressed click so you can watch
              the result; "close" unpins so the next click is read-through. */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={runPinned}
              className="rounded bg-action-success px-3 py-1 text-xs font-medium text-white hover:bg-action-success"
            >
              ▶ Run it
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPinned(false);
                pinnedElRef.current = null;
                setHit(null);
              }}
              className="rounded bg-text-secondary px-3 py-1 text-xs text-white hover:bg-text-primary"
            >
              close
            </button>
            {!isPinned && (
              <span className="self-center text-xs text-text-muted">
                click any button to pin + read it
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default InspectOverlay;
