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

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
}: ModalProps) => {
  // Fix 7: single modal at a time — close any other open modal
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("modal-open");
    // Close all other modals by dispatching a custom event
    window.dispatchEvent(new CustomEvent("gate-monitor-modal-close-all", { detail: { exceptId: Date.now() } }));
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

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
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined}
            className={contentClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {showClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className={cn(
                  "flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95",
                  isMobile
                    ? "absolute top-3 right-3 p-3 min-w-[44px] min-h-[44px]"
                    : "absolute top-3 right-3 p-3 min-w-[44px] min-h-[44px]"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {title && (
              <div className={cn("border-b border-[var(--border)]", isMobile ? "px-6 py-4" : "px-6 py-4")}>
                <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
              </div>
            )}
            <div className={cn("p-6", !title && "p-6")}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { Modal };