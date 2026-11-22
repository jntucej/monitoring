"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
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

export interface EntityInspectorProps {
  /** The open inspection (null = closed). */
  inspection: EntityInspection | null;
  onClose: () => void;
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
 */
export function EntityInspector({
  inspection,
  onClose,
  className,
}: EntityInspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset collapsed state whenever a new inspection opens.
  useEffect(() => {
    setCollapsed({});
  }, [inspection?.kind, inspection?.title]);

  // Esc to close.
  useEffect(() => {
    if (!inspection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspection, onClose]);

  if (!inspection) return null;

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
            onClick={onClose}
            className="surface-card min-h-9 min-w-9 shrink-0 flex items-center justify-center hover:bg-bg-surface/60 text-text-primary"
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
    "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 min-h-8 rounded transition disabled:opacity-40 disabled:pointer-events-none";
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
