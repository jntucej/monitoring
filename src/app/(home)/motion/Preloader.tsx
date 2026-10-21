"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_IN_OUT } from "./tokens";

const KEY = "gm-home-preloaded";

export function Preloader() {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reduced || typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), 1400);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          initial={{ clipPath: "inset(0 0 0 0)" }}
          animate={{ clipPath: "inset(0 0 0 0)" }}
          exit={{ clipPath: "inset(100% 0 0 0)" }}
          transition={{ duration: 0.7, ease: EASE_IN_OUT, delay: 0.7 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[var(--bg-base)]"
          style={{ willChange: "clip-path" }}
        >
          <ShieldDraw />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            className="mt-6 text-xs tracking-[0.4em] uppercase text-[var(--text-secondary)]"
          >
            Gate Monitor
          </motion.div>
          <div className="mt-6 h-[2px] w-40 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.2, ease: EASE_IN_OUT }}
              className="h-full w-full bg-[var(--action-primary)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShieldDraw() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="text-[var(--action-primary)]"
    >
      <motion.path
        d="M12 2L4 6v6c0 5 3.5 9.3 8 10 4.5-.7 8-5 8-10V6l-8-4z"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE_IN_OUT }}
      />
      <motion.path
        d="M8.5 12.5l2.5 2.5 4.5-5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7, ease: EASE_IN_OUT }}
      />
    </svg>
  );
}
