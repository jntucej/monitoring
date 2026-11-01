"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "fullscreen";
  showClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  "3xl": "max-w-7xl",
  "4xl": "max-w-[85vw]",
  "5xl": "max-w-[92vw]",
  fullscreen: "w-full h-full m-0 rounded-none",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
}: ModalProps) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // Fix 7: single modal at a time — close any other open modal
  React.useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("modal-open");
    // Close all other modals by dispatching a custom event
    window.dispatchEvent(
      new CustomEvent("gate-monitor-modal-close-all", { detail: { exceptId: Date.now() } })
    );
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // Focus management: save the trigger element, focus the first focusable
  // node inside the panel when it opens, restore focus when it closes.
  React.useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  // Escape closes; Tab cycles inside the panel (WCAG 2.1.2 focus trap).
  // Body scroll is locked while the modal is open.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  // Use useBreakpoint for responsive modal sizing
  const breakpoints = useBreakpoint({ sm: "(min-width: 640px)", md: "(min-width: 768px)" });
  const isMobile = !breakpoints.md;

  // Full-screen on mobile, centered on desktop
  const modalClassName = isMobile
    ? "fixed inset-0 z-modal flex flex-col bg-black/90 backdrop-blur-md"
    : "fixed inset-0 z-modal flex items-center justify-center bg-black/60 backdrop-blur-sm";

  const contentClassName = isMobile
    ? "relative w-full h-full bg-[var(--bg-surface)] overflow-y-auto overscroll-contain"
    : cn(
        "relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl w-full mx-4 max-h-[90dvh] overflow-y-auto overscroll-contain",
        sizeClasses[size]
      );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={modalClassName}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            className={contentClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className={cn(
                  "flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95",
                  "absolute top-3 right-3 p-3 min-w-[44px] min-h-[44px]"
                )}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            {title && (
              <div className={cn("border-b border-[var(--border)]", "px-6 py-4")}>
                <h2 id="modal-title" className="text-xl font-semibold">
                  {title}
                </h2>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Modal };
