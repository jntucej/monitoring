"use client";

/**
 * EntityLink — a slimmer, URL-synced variant of EntityReference.
 *
 * Instead of managing its own fetch + inline inspector (EntityReference's
 * pattern), EntityLink is thin: it writes `?inspect=<kind>:<id>` to the URL
 * and lets the GlobalEntityInspector (mounted in the role shell) read that
 * param, fetch, and render the drawer.
 *
 * This means:
 *   - The record can be deep-linked: copy the URL, share it, Cmd+Click opens
 *     the full page.
 *   - No per-page state is needed; the URL is the source of truth.
 *
 * Usage:
 *   <EntityLink kind="gate" id="g-1" label="Main Gate" sublabel="g-1" />
 *   <EntityLink kind="case" id="abc" label="Case abc" mode="navigate" />
 */

import { useCallback, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  canInspectEntity,
  getFullPageRoute,
  type EntityKind,
} from "@/lib/entity-access";

export interface EntityLinkProps {
  /** The entity kind (must match a registered resolver or ENTITY_ACCESS key). */
  kind: string;
  /** The entity's primary key / code. */
  id: string;
  /** Human-readable label shown in the chip. */
  label: string;
  /** Optional secondary label (mono, muted) shown below/beside the label. */
  sublabel?: string;
  /**
   * "peek" (default): click sets `?inspect=kind:id` in the URL; the
   * GlobalEntityInspector reads it and opens the drawer.
   *
   * "navigate": click routes to the full-page detail via `getFullPageRoute`.
   * If no full route is available, falls back to peek.
   *
   * Cmd/Ctrl/Meta+Click ALWAYS promotes to the full-page route regardless
   * of `mode`.
   */
  mode?: "peek" | "navigate";
  /** Optional className for the chip wrapper. */
  className?: string;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/**
 * Build the new URL preserving existing query params, replacing/adding the
 * `inspect` param.
 */
function withInspectParam(
  pathname: string,
  searchParams: URLSearchParams,
  inspectValue: string,
): string {
  const params = new URLSearchParams(searchParams);
  params.set("inspect", inspectValue);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}


/* ── main component ─────────────────────────────────────────────────────── */

export function EntityLink({
  kind,
  id,
  label,
  sublabel,
  mode = "peek",
  className,
}: EntityLinkProps) {
  const role = useAuthStore((s) => s.role);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kindAsEntity = kind as EntityKind;
  const allowed = canInspectEntity(role ?? null, kindAsEntity);

  // Resolve the full-page route once (used for navigate mode / Cmd+Click).
  const fullRoute = allowed ? getFullPageRoute(role ?? null, kindAsEntity, id) : null;

  /** Write the inspect param to the URL (peek behavior).
   *  Uses router.push so browser Back closes the drawer without leaving the page. */
  const peek = useCallback(() => {
    const next = withInspectParam(pathname, searchParams, `${kind}:${id}`);
    router.push(next, { scroll: false });
  }, [pathname, searchParams, kind, id, router]);

  /** Navigate to the full-page route (or fall back to peek). */
  const navigate = useCallback(() => {
    if (fullRoute) {
      router.push(fullRoute);
    } else {
      peek();
    }
  }, [fullRoute, router, peek]);

  /** Unified click handler: modifier keys always promote to full page. */
  const handleClick = useCallback(
    (e: MouseEvent) => {
      // Cmd/Ctrl/Meta+Click → always full-page, regardless of mode.
      if (e.metaKey || e.ctrlKey || e.altKey) {
        navigate();
        return;
      }
      if (mode === "navigate") {
        navigate();
      } else {
        peek();
      }
    },
    [mode, navigate, peek],
  );

  // ── Role-gated fallback (mirror EntityReference's muted chip) ─────────
  if (!allowed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted cursor-default opacity-70",
          className,
        )}
        title="Not available for your role"
      >
        <span className="font-mono text-[10px] uppercase shrink-0">{kind}</span>
        <span className="truncate max-w-40">{label}</span>
        {sublabel ? (
          <span className="font-mono text-[10px] text-text-muted shrink-0">{sublabel}</span>
        ) : null}
      </span>
    );
  }

  // ── Navigate mode with a full route: render as <a> ─────────────────────
  if (mode === "navigate" && fullRoute) {
    return (
      <a
        href={fullRoute}
        onClick={(e) => {
          // Let the browser handle Cmd/Ctrl+Click natively (new tab).
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          e.preventDefault();
          navigate();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:bg-bg-elevated transition focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none",
          className,
        )}
        aria-label={`Open ${kind} ${label} full detail page`}
      >
        <span className="font-mono text-text-muted uppercase text-[10px] shrink-0">{kind}</span>
        <span className="text-text-primary font-medium truncate max-w-40">{label}</span>
        {sublabel ? (
          <span className="font-mono text-[10px] text-text-secondary shrink-0">{sublabel}</span>
        ) : null}
      </a>
    );
  }

  // ── Peek mode (or navigate mode without a full route): render as <button> ──
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:bg-bg-elevated transition focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none cursor-pointer",
        className,
      )}
      aria-label={`Peek at ${kind} ${label}`}
      title={fullRoute ? "Click to peek; Cmd/Ctrl+Click for full page" : "Click to peek"}
    >
      <span className="font-mono text-text-muted uppercase text-[10px] shrink-0">{kind}</span>
      <span className="text-text-primary font-medium truncate max-w-40">{label}</span>
      {sublabel ? (
        <span className="font-mono text-[10px] text-text-secondary shrink-0">{sublabel}</span>
      ) : null}
    </button>
  );
}
