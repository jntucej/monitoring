"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileNavDrawer — a left-anchored, off-canvas navigation drawer shared by the
 * admin and sysadmin consoles.
 *
 * Fixes the "drawer slides in from the right" defect: it is anchored to
 * `left-0` and hidden off-screen to the *left* (`-translate-x-full`), which is
 * the accepted pattern (left = navigation, right = settings/filters).
 *
 * Accessibility:
 *  - Focus moves into the drawer on open and returns to the trigger on close.
 *  - Esc closes.
 *  - All motion is gated behind `prefers-reduced-motion`.
 *  - A body-scroll lock prevents the content behind the sheet from scrolling.
 */
export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element to focus when the drawer closes. Pass the hamburger. */
  triggerRef?: React.RefObject<HTMLElement | null>;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileNavDrawer({
  open,
  onClose,
  triggerRef,
  label = "Navigation",
  children,
  className,
}: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Focus management + scroll lock + Esc.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus to the close button (first interactive control in the sheet).
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Simple focus trap: keep Tab inside the panel.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef?.current?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)] md:hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm motion-reduce:backdrop-blur-none"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet — left-anchored */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "absolute left-0 top-0 h-full w-[85%] max-w-sm bg-[var(--bg-surface)] shadow-2xl",
          "animate-drawer-in motion-reduce:animate-none",
          className
        )}
      >
        <div className="flex items-center justify-between p-2">
          <span className="sr-only">{label}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex items-center justify-center rounded-md p-2 min-h-[44px] min-w-[44px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-3rem)] overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export default MobileNavDrawer;
