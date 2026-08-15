"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExitReason } from "@/lib/types";

interface ExitReasonSelectorProps {
  isOpen: boolean;
  selected?: ExitReason;
  onSelect: (reason: ExitReason) => void;
  onCancel: () => void;
}

const REASONS: { val: ExitReason; label: string; icon: string; color: string }[] = [
  { val: "Home Out", label: "Home Out", icon: "🏠", color: "bg-[var(--action-danger)]" },
  { val: "Day Out", label: "Day Out", icon: "☀️", color: "bg-[var(--action-warning)]" },
  { val: "Leave", label: "Leave", icon: "📝", color: "bg-[var(--action-info)]" },
  { val: "Regular", label: "Regular", icon: "🚶", color: "bg-[var(--action-danger)]" },
];

export function ExitReasonSelector({ isOpen, selected, onSelect, onCancel }: ExitReasonSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Select reason for exit</h3>
            <div className="grid grid-cols-2 gap-3">
              {REASONS.map((r) => (
                <motion.button
                  key={r.val}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(r.val)}
                  className={`h-14 px-3 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2 ${r.color} hover:brightness-110 transition-all`}
                >
                  <span>{r.icon}</span>
                  {r.label}
                </motion.button>
              ))}
            </div>
            <button
              onClick={onCancel}
              className="mt-4 w-full h-10 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
