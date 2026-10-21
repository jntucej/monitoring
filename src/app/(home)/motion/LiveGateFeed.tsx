"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { EASE_OUT } from "./tokens";

type ScanRow = {
  id: string;
  direction: "IN" | "OUT";
  gate: string;
  time: string;
};

const GATES = ["Main Gate", "Hostel Gate", "Back Gate", "Library Gate"];
const ROW_MS = 2400;

function fakeId() {
  return `22${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function makeRow(): ScanRow {
  return {
    id: fakeId(),
    direction: Math.random() > 0.5 ? "IN" : "OUT",
    gate: GATES[Math.floor(Math.random() * GATES.length)],
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function LiveGateFeed() {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<ScanRow[]>(() =>
    Array.from({ length: 4 }, makeRow),
  );

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(
      () => setRows((p) => [makeRow(), ...p].slice(0, 5)),
      ROW_MS,
    );
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: 40, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.9, delay: 2.4, ease: EASE_OUT }}
      style={{ transformPerspective: 900 }}
      className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/80 p-5 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--action-primary)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--action-primary)]" />
          </span>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Sample activity
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
          Demo
        </span>
      </div>
      <div className="relative">
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {rows.slice(0, 4).map((row, idx) => (
              <motion.li
                key={row.id}
                layout
                initial={reduced ? false : { opacity: 0, y: -20 }}
                animate={{ opacity: 1 - idx * 0.12, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      row.direction === "IN"
                        ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : "bg-[#f59e0b]/15 text-[#f59e0b]"
                    }`}
                  >
                    {row.direction === "IN" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      {row.direction === "IN" ? "Entry" : "Exit"} · {row.id}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      {row.gate}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] tabular-nums text-[var(--text-secondary)]">
                  {row.time}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#0072ff]/30 via-[#0072ff]/10 to-transparent"
            initial={{ y: "-100%" }}
            animate={{ y: "800%" }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 3.8,
              ease: "linear",
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
