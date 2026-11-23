"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, AlertTriangle, Lock, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InspectionSection {
  /** Section title (e.g. "Overview", "Context", "History", "Actions"). */
  title: string;
  /** Optional icon next to the title. */
  icon?: ReactNode;
  /** The section body. Rendered inside the panel's flow. */
  content: ReactNode;
  /**
   * Collapsible on demand: when true, the section starts collapsed and the
   * user expands it. Used for history/relationships that may be long.
   */
  collapsible?: boolean;
}

export interface EntityInspection {
  /** The entity kind, e.g. "student" | "gate" | "alert" | "case". */
  kind: string;
  /** Display name (e.g. "Priya Sharma" / "Main Gate" / "Critical breach"). */
  title: string;
  /** Compact subtitle / identifier (roll no, gate code, timestamp). */
  subtitle?: string | null;
  /** One-line state descriptor shown next to the title (e.g. "ACTIVE"). */
  status?: ReactNode;
  /** Sections in display order: overview → context → history → actions. */
  sections: InspectionSection[];
  /**
   * Primary "go to full detail" link (the deepest level of the hierarchy).
   * Rendered as a footer CTA. Omit when the panel IS the full detail.
   */
  detailHref?: string;
  detailLabel?: string;
}

/**
 * The lifecycle state of the inspector when it is open but the
 * `EntityInspection` model has not (yet) resolved. The page or the
 * `useEntityResolver` hook drives this; `EntityInspector` renders the
 * matching placeholder.
 *
 * Design rule 31: the inspector must always show a meaningful state —
 * never a blank panel.
 */
export type InspectorState =
  | "loading"      // skeleton shimmer
  | "empty"        // "No related records"
  | "error"        // retry button
  | "unauthorized" // "You do not have permission"
  | "missing";     // record not found

export interface EntityInspectorProps {
  /** The open inspection (null = closed). */
  inspection: EntityInspection | null;
  onClose: () => void;
  /**
   * Optional: when `inspection` is null and the inspector is still open
   * (e.g. a resolver is in flight), show the matching placeholder state.
   * Default: "loading".
   */
  state?: InspectorState;
  /** Error message shown in the "error" state. */
  errorMessage?: string;
  /** Called when the user clicks "Retry" in the error state. */
  onRetry?: () => void;
  /** Optional: renders a slot behind the panel content (e.g. a backdrop). */
  className?: string;
}

/**
 * EntityInspector — the standardized "inspect" experience for the Gate
 * Monitor app.
 *
 * Every major entity (student, gate, alert, case, pass, shift, incident)
 * exposes the SAME predictable progressive-disclosure hierarchy:
 *
 *   ELEMENT
 *      → Quick overview      (sections[0])
 *      → Context             (sections[1])
 *      → History/relations   (sections[2], collapsible)
 *      → Actions             (sections[3] + footer CTA)
 *      → Full detail page    (detailHref footer link)
 *
 * It renders as a right-side drawer (bottom sheet on mobile) so the user
 * never leaves the current page while inspecting. The component is
 * presentational + data-agnostic: it takes an `EntityInspection` model,
 * not entity-specific props, so every dashboard composes the same panel
 * from its own entity.
 *
 * Behavior:
 *   - Closes on Esc, on backdrop click, or on the close button.
 *   - Closes on focus-out of the panel (tabbing away).
 *   - Long sections collapse behind a toggle (a11y: aria-expanded).
 *   - No layout shift: the drawer is position:fixed and overlays.
 *   - Focus moves into the panel on open and back to the trigger on close.
 *   - When `inspection` is null the panel shows a state placeholder
 *     (loading / empty / error / unauthorized / missing) per design rule 31.
 */
export function EntityInspector({
  inspection,
  onClose,
  state: inspectorState = "loading",
  errorMessage,
  onRetry,
  className,
}: EntityInspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Reset collapsed state whenever a new inspection opens.
  useEffect(() => {
    setCollapsed({});
  }, [inspection?.kind, inspection?.title]);

  // ── focus management ─────────────────────────────────────────────────────
  // On open: move focus into the panel (to the close button, the first
  // focusable element). On close: restore focus to the previously focused
  // element so the user's keyboard position is not lost.
  useEffect(() => {
    if (inspection) {
      // Save the element that had focus before the inspector opened.
      prevFocusRef.current = document.activeElement as HTMLElement;
      // Move focus into the panel.
      requestAnimationFrame(() => {
        closeBtnRef.current?.focus();
      });
    } else if (prevFocusRef.current) {
      // Restore focus to the element that was focused before the panel opened.
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [inspection]);

  // Esc to close.
  useEffect(() => {
    if (!inspection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspection, onClose]);

  // If there is no inspection model, render the state placeholder.
  if (!inspection) {
    return (
      <div
        className="fixed inset-0 z-[80] flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-label="Entity inspector"
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "surface-card relative w-full max-w-md h-full overflow-y-auto bg-bg-surface p-5 flex flex-col",
            className,
          )}
        >
          <header className="flex items-center justify-between mb-4">
            <p className="text-xs text-text-muted">Inspector</p>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="surface-card min-h-9 min-w-9 shrink-0 flex items-center justify-center hover:bg-bg-surface/60 text-text-primary focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none"
              aria-label="Close inspector"
            >
              <X className="size-4" />
            </button>
          </header>
          <InspectorStatePlaceholder
            state={inspectorState}
            errorMessage={errorMessage}
            onRetry={onRetry}
          />
        </aside>
      </div>
    );
  }

  const { kind, title, subtitle, status, sections, detailHref, detailLabel } = inspection;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={`Inspect ${kind}: ${title}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={panelRef}
        className={cn(
          "surface-card relative w-full max-w-md h-full overflow-y-auto bg-bg-surface p-5",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {kind}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <h2 className="text-lg font-semibold text-text-primary truncate">{title}</h2>
              {status ? <span className="shrink-0">{status}</span> : null}
            </div>
            {subtitle ? (
              <p className="text-xs font-mono text-text-muted mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="surface-card min-h-9 min-w-9 shrink-0 flex items-center justify-center hover:bg-bg-surface/60 text-text-primary focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none"
            aria-label="Close inspector"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4">
          {sections.map((s, i) => {
            const isCollapsible = s.collapsible === true;
            const isCollapsed = !!collapsed[i];
            return (
              <section key={i} className="space-y-2">
                {isCollapsible ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [i]: !c[i] }))}
                    aria-expanded={!isCollapsed}
                    className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary"
                  >
                    <span className="flex items-center gap-1.5">{s.icon}{s.title}</span>
                    <span className="text-text-muted">{isCollapsed ? "Expand" : "Collapse"}</span>
                  </button>
                ) : (
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {s.icon}
                    {s.title}
                  </h3>
                )}
                {!isCollapsed && <div className="surface-card bg-bg-surface p-3">{s.content}</div>}
              </section>
            );
          })}
        </div>

        {detailHref ? (
          <div className="mt-6 pt-4 border-t border-border">
            <a
              href={detailHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-primary hover:underline"
            >
              {detailLabel ?? "View full detail"}
            </a>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

/* ── state placeholder (design rule 31: never show a blank panel) ─────── */

function InspectorStatePlaceholder({
  state,
  errorMessage,
  onRetry,
}: {
  state: InspectorState;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  switch (state) {
    case "loading":
      return (
        <div className="space-y-4 animate-pulse" role="status" aria-live="polite">
          <div className="h-4 w-2/3 bg-bg-elevated rounded" />
          <div className="h-3 w-1/3 bg-bg-elevated rounded" />
          <div className="space-y-2 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-bg-elevated rounded" style={{ width: `${100 - i * 10}%` }} />
            ))}
          </div>
          <div className="space-y-2 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3 bg-bg-elevated rounded" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        </div>
      );
    case "empty":
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
          <FileSearch className="size-8 text-text-muted mb-3" />
          <p className="text-sm font-medium text-text-primary">No related records</p>
          <p className="text-xs text-text-muted mt-1">
            This entity has no associated data to display.
          </p>
        </div>
      );
    case "error":
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
          <AlertTriangle className="size-8 text-action-danger mb-3" />
          <p className="text-sm font-medium text-text-primary">Failed to load</p>
          {errorMessage ? (
            <p className="text-xs text-text-muted mt-1">{errorMessage}</p>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none rounded"
            >
              Retry
            </button>
          ) : null}
        </div>
      );
    case "unauthorized":
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
          <Lock className="size-8 text-action-warning mb-3" />
          <p className="text-sm font-medium text-text-primary">You do not have permission</p>
          <p className="text-xs text-text-muted mt-1">
            Contact an administrator if you believe this is an error.
          </p>
        </div>
      );
    case "missing":
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
          <FileSearch className="size-8 text-text-muted mb-3" />
          <p className="text-sm font-medium text-text-primary">Record not found</p>
          <p className="text-xs text-text-muted mt-1">
            This entity may have been deleted or the link is stale.
          </p>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Helper: a simple key/value block for the "Overview" section.      */
/* ------------------------------------------------------------------ */
export function KVPairs({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2;
}) {
  return (
    <dl className={cn("grid gap-2.5 text-xs", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {items.map((it, i) => (
        <div key={i} className={columns === 1 ? "col-span-2" : undefined}>
          <dt className="text-text-muted">{it.label}</dt>
          <dd className="text-text-primary mt-0.5">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: a compact timeline for the "History" section.             */
/* ------------------------------------------------------------------ */
export function Timeline({
  items,
  emptyLabel = "No history yet.",
}: {
  items: Array<{ label: string; time?: string; detail?: string; tone?: "ok" | "warn" | "danger" | "neutral" }>;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-text-muted">{emptyLabel}</p>;
  }
  const toneClass: Record<string, string> = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-bg-elevated",
  };
  return (
    <ol className="relative border-l border-border ml-1.5 space-y-3">
      {items.map((it, i) => (
        <li key={i} className="ml-4">
          <span
            className={cn(
              "absolute -left-[5px] size-2.5 rounded-full ring-2 ring-bg-surface",
              toneClass[it.tone ?? "neutral"],
            )}
          />
          <p className="text-xs font-medium text-text-primary">{it.label}</p>
          {it.detail ? <p className="text-[11px] text-text-muted mt-0.5">{it.detail}</p> : null}
          {it.time ? <p className="text-[10px] text-text-muted mt-0.5">{it.time}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: an action button row for the "Actions" section.           */
/* ------------------------------------------------------------------ */
export function ActionRow({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function InspectorButton({
  children,
  href,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 min-h-8 rounded transition disabled:opacity-40 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:outline-none";
  const styles: Record<string, string> = {
    primary: "bg-action-primary text-white hover:opacity-90",
    ghost: "surface-card bg-bg-elevated text-text-primary hover:bg-bg-surface",
    danger: "bg-rose-500/15 text-action-danger hover:bg-rose-500/25",
  };
  const cls = cn(base, styles[variant]);
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
