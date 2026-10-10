"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog" aria-modal="true" aria-labelledby={title ? "modal-title" : undefined} className={cn(
              "relative bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-xl w-full mx-4 max-h-[90dvh] overflow-y-auto overscroll-contain",
              sizeClasses[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {showClose && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="absolute top-3 right-3 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {title && (
              <div className="px-6 py-4 border-b border-[var(--border)]">
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