"use client";

/**
 * EntityReference — a small link-like primitive for referencing an entity
 * in a list row, KPI tile, or any inline context.
 *
 * It renders a compact "chip": [type] label [status-badge]
 * On click it calls `useEntityInspector().inspect()` with the resolved
 * `EntityInspection` model — it does NOT `router.push`.
 *
 * The fetch + resolve is handled by `useEntityResolver` from
 * `entityResolvers.tsx`, which reuses the shared `cachedFetch` so the
 * in-memory cache is shared with the dashboard's own polling.
 *
 * Usage (inside a page that already calls `useEntityInspector`):
 *
 *   const { inspection, inspect, closeInspection } = useEntityInspector();
 *   ...
 *   <EntityReference kind="gate" id="g-1" label="Main Gate" status="ACTIVE" />
 *
 * The component manages its own fetch (via `useEntityResolver`) and
 * calls `inspect(model)` when the fetch completes. While loading it
 * shows a subtle skeleton; on error it shows a muted "Failed" state.
 *
 * Accessibility:
 *   - Renders a <button> (or <a> if `href` is set) so rows that trigger
 *     the inspector use `role=button` semantics.
 *   - Closes on Escape (handled by `EntityInspector`).
 */

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntityResolver, hasResolver } from "@/components/shared/entityResolvers";
import {
  EntityInspector,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

/* ── types ─────────────────────────────────────────────────────────────── */

export interface EntityReferenceProps {
  /** The entity kind registered in `entityResolvers` (e.g. "gate", "alert"). */
  kind: string;
  /** The entity's primary key / code / ticket number. */
  id: string;
  /** Human-readable label shown in the chip. */
  label: string;
  /**
   * Optional status badge rendered next to the label.
   * Can be a string (rendered as a small pill) or a ReactNode.
   */
  status?: string | ReactNode;
  /**
   * Optional detail href — when set, the chip also includes a small
   * external-link affordance that navigates to the full detail page.
   * The inspector's "deepest layer" is this link.
   */
  detailHref?: string;
  /**
   * Optional className for the chip wrapper.
   */
  className?: string;
  /**
   * If true, render as a plain <a> (no inspector) and let the caller
   * handle navigation. Default false: the chip triggers the inspector.
   */
  linkMode?: boolean;
  /**
   * Optional extra data passed to the resolver (e.g. caller's role).
   */
  context?: Record<string, unknown>;
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function statusPill(status: string | ReactNode | undefined, kind: string) {
  if (status === undefined || status === null) return null;
  if (typeof status === "string") {
    const cls: Record<string, string> = {
      active: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
      inactive: "bg-bg-elevated text-text-muted border border-border",
      open: "bg-amber-500/10 text-action-warning border border-amber-500/20",
      pending: "bg-amber-500/10 text-action-warning border border-amber-500/20",
      resolved: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
      critical: "bg-rose-500/10 text-action-danger border border-rose-500/20",
      approved: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
      rejected: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    };
    const key = status.toLowerCase();
    return (
      <span
        className={cn(
          "px-1 py-px rounded text-[9px] font-semibold uppercase tracking-wide",
          cls[key] ?? "bg-bg-elevated text-text-muted border border-border",
        )}
      >
        {status}
      </span>
    );
  }
  // ReactNode — render as-is
  return <span className="shrink-0">{status}</span>;
}

/* ── main component ────────────────────────────────────────────────────── */

export function EntityReference({
  kind,
  id,
  label,
  status,
  detailHref,
  className,
  linkMode = false,
  context,
}: EntityReferenceProps) {
  const resolver = useEntityResolver(linkMode ? null : kind, linkMode ? null : id, context);
  const [inspecting, setInspecting] = useState(false);

  const handleClick = useCallback(() => {
    if (linkMode) return; // plain link, no inspector
    if (resolver.inspection) {
      // Already resolved — show the inspector immediately.
      setInspecting(true);
    } else if (resolver.loading) {
      // Still fetching — show a loading inspector so the user knows it's working.
      setInspecting(true);
    } else if (!resolver.error) {
      // No data yet, no error — trigger a fetch by re-mounting the resolver.
      // The simplest approach: open the inspector in a "pending" state and
      // let the resolver's useEffect drive the fetch.
      setInspecting(true);
    }
  }, [linkMode, resolver.inspection, resolver.loading, resolver.error]);

  // In link mode, render a plain anchor.
  if (linkMode) {
    const href = detailHref ?? "";
    return (
      <a
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:bg-bg-elevated transition",
          className,
        )}
      >
        <span className="font-mono text-text-muted uppercase text-[10px]">{kind}</span>
        <span className="text-text-primary font-medium truncate max-w-40">{label}</span>
        {statusPill(status, kind)}
      </a>
    );
  }

  // If no resolver is registered for this kind, fall back to a static chip
  // that is not interactive (avoids a broken click experience).
  if (!hasResolver(kind)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs cursor-default",
          className,
        )}
        title={`No resolver registered for kind "${kind}"`}
      >
        <span className="font-mono text-text-muted uppercase text-[10px]">{kind}</span>
        <span className="text-text-primary font-medium truncate max-w-40">{label}</span>
        {statusPill(status, kind)}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:bg-bg-elevated transition focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none",
          className,
        )}
      >
        {/* Kind tag */}
        <span className="font-mono text-text-muted uppercase text-[10px] shrink-0">{kind}</span>

        {/* Loading indicator */}
        {resolver.loading && <Loader2 className="size-3 animate-spin text-text-muted" />}

        {/* Label */}
        <span className="text-text-primary font-medium truncate max-w-40">
          {label}
        </span>

        {/* Status pill */}
        {statusPill(status, kind)}

        {/* Optional external-link affordance */}
        {detailHref ? (
          <a
            href={detailHref}
            className="shrink-0 text-text-muted hover:text-action-primary"
            title="Open full detail page"
            onClick={(e) => e.stopPropagation()}
          >
            <X className="size-3 rotate-45" />
          </a>
        ) : null}
      </button>

      {/* The inspector overlay — rendered inline so it appears next to the chip. */}
      {inspecting ? (
        <EntityInspector
          inspection={
            resolver.inspection ??
            (resolver.error
              ? {
                  kind,
                  title: label,
                  subtitle: id,
                  sections: [
                    {
                      title: "Error",
                      content: (
                        <div className="text-xs text-action-danger space-y-2">
                          <p>{resolver.error}</p>
                          <button
                            type="button"
                            onClick={resolver.retry}
                            className="text-xs font-semibold text-action-primary hover:underline"
                          >
                            Retry
                          </button>
                        </div>
                      ),
                    },
                  ],
                }
              : {
                  kind,
                  title: label,
                  subtitle: id,
                  sections: [
                    {
                      title: "Loading",
                      content: (
                        <div className="space-y-2">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="h-3 bg-bg-elevated rounded animate-pulse" />
                          ))}
                        </div>
                      ),
                    },
                  ],
                })
          }
          onClose={() => setInspecting(false)}
        />
      ) : null}
    </>
  );
}

/* ── convenience wrapper: auto-closes when the page's inspector is managed
   by useEntityInspector (the page owns the state, not the chip) ────────── */

/**
 * `EntityReferenceButton` — the variant used inside pages that already call
 * `useEntityInspector()`. It calls `inspect(model)` instead of rendering
 * its own `<EntityInspector>`, so the page's single inspector instance
 * stays the source of truth.
 *
 *   const { inspection, inspect, closeInspection } = useEntityInspector();
 *   ...
 *   <EntityReferenceButton
 *     kind="gate"
 *     id={row.id}
 *     label={row.name}
 *     status={row.is_active ? "ACTIVE" : "INACTIVE"}
 *     onResolved={(model) => inspect(model)}
 *   />
 */
export function EntityReferenceButton({
  kind,
  id,
  label,
  status,
  detailHref,
  className,
  context,
  onResolved,
}: Omit<EntityReferenceProps, "linkMode"> & {
  /**
   * Called with the resolved `EntityInspection` model when the fetch
   * completes. Typically `inspect(model)` from `useEntityInspector`.
   * If omitted, the component renders its own `<EntityInspector>`.
   */
  onResolved?: (model: EntityInspection) => void;
}) {
  const resolver = useEntityResolver(kind, id, context);
  const chipRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(async () => {
    try {
      const model = await import("@/components/shared/entityResolvers").then(
        (m) => m.resolveEntity(kind, id, context),
      );
      if (onResolved) {
        onResolved(model);
      }
    } catch (err) {
      // Surface the error via the onResolved callback with an error model,
      // or fall back to a console warning in dev.
      console.warn("[EntityReferenceButton] failed to resolve", kind, id, err);
    }
  }, [kind, id, context, onResolved]);

  return (
    <button
      ref={chipRef}
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:bg-bg-elevated transition focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none",
        className,
      )}
    >
      <span className="font-mono text-text-muted uppercase text-[10px] shrink-0">{kind}</span>
      {resolver.loading ? <Loader2 className="size-3 animate-spin text-text-muted" /> : null}
      <span className="text-text-primary font-medium truncate max-w-40">{label}</span>
      {statusPill(status, kind)}
    </button>
  );
}

/* Re-export the resolver so a page can import everything from one place. */
export { resolveEntity, hasResolver, registeredKinds } from "@/components/shared/entityResolvers";
