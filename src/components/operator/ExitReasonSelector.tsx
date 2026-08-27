"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExitReason } from "@/lib/types";
import { useCampusConfig } from "@/hooks/useCampusConfig";

interface ExitReasonSelectorProps {
  isOpen: boolean;
  selected?: ExitReason;
  onSelect: (reason: ExitReason) => void;
  onCancel: () => void;
  approvedPasses?: any[];
  personType?: string;
}

const REASON_META: Record<string, { icon: string; color: string }> = {
  "Home Out": { icon: "🏠", color: "bg-[var(--action-danger)]" },
  "Day Out": { icon: "☀️", color: "bg-[var(--action-warning)]" },
  "Leave": { icon: "📝", color: "bg-[var(--action-info)]" },
  "Regular": { icon: "🚶", color: "bg-[var(--action-danger)]" },
};

export function ExitReasonSelector({ isOpen, selected, onSelect, onCancel, approvedPasses = [], personType = "student" }: ExitReasonSelectorProps) {
  const { exitReasons } = useCampusConfig();
  const validExitReasons = exitReasons;

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
              {validExitReasons.map((config) => {
                const meta = REASON_META[config.code] || { icon: "📝", color: "bg-[var(--action-info)]" };
                const requiresApproval = config.requiresApproval ?? false;
                const passRequired = requiresApproval && (personType === "student" || !personType);
                const hasApprovedPass = approvedPasses.some((p) => p.reason === config.code);
                const isDisabled = passRequired && !hasApprovedPass;

                return (
                  <motion.button
                    key={config.code}
                    whileHover={isDisabled ? {} : { scale: 1.02 }}
                    whileTap={isDisabled ? {} : { scale: 0.98 }}
                    disabled={isDisabled}
                    onClick={() => onSelect(config.code as ExitReason)}
                    className={`h-14 px-3 rounded-lg text-white font-medium text-xs flex flex-col items-center justify-center gap-0.5 transition-all ${
                      isDisabled 
                        ? "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                        : meta.color
                    } hover:brightness-110`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{meta.icon}</span>
                      <span>{config.name || config.code}</span>
                    </div>
                    {passRequired && (
                      <span className={`text-[8px] font-extrabold px-1 rounded border scale-90 ${
                        hasApprovedPass 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}>
                        {hasApprovedPass ? "Pass Active" : "No Pass"}
                      </span>
                    )}
                  </motion.button>
                );
              })}
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
