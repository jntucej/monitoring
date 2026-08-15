"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";

interface ScanConfirmationProps {
  student: {
    name: string;
    roll: string;
    department: string;
    year: number;
    photo?: string;
  };
  onConfirm: (direction: "IN" | "OUT", reason?: string) => void;
  onCancel: () => void;
  suggestedDirection: "IN" | "OUT";
}

export function ScanConfirmation({ student, onConfirm, onCancel, suggestedDirection }: ScanConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="relative mx-auto w-28 h-28 rounded-full overflow-hidden border-4 border-[var(--border)] mb-4">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold mb-1">{student.name}</h2>
          <p className="text-[var(--text-secondary)] font-mono text-sm">{student.roll}</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {student.department} • Year {student.year}
          </p>

          <p className="text-sm text-[var(--text-muted)] mb-4">ENTRY or EXIT?</p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm("IN")}
              className="h-12 px-4 rounded-lg bg-[var(--action-primary)] text-white font-semibold text-lg hover:brightness-110 transition-all"
            >
              🟢 ENTRY
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm("OUT")}
              className="h-12 px-4 rounded-lg bg-[var(--action-danger)] text-white font-semibold text-lg hover:brightness-110 transition-all"
            >
              🔴 EXIT
            </motion.button>
          </div>

          <button
            onClick={onCancel}
            className="mt-4 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
