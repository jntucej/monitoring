"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LogIn, HelpCircle } from "lucide-react";
import { EASE_OUT } from "./tokens";
import { useMagnetic } from "./useMagnetic";

const TITLE = "JNTUH UCEJ";
const SUB = "CAMPUS ACCESS PORTAL";
const words = TITLE.split(" ");

export function HeroMotion() {
  const reduced = useReducedMotion();
  const magnetic = useMagnetic<HTMLAnchorElement>(0.3, 90);

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 pb-16 pt-24 text-center">
      <motion.p
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.6, ease: EASE_OUT }}
        className="mb-4 text-[11px] uppercase tracking-[0.4em] text-[var(--text-secondary)]"
      >
        Official Campus Portal
      </motion.p>
      <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-7xl">
        {words.map((word, i) => (
          <span key={i} className="inline-block overflow-hidden align-baseline">
            <motion.span
              className="inline-block"
              initial={reduced ? false : { y: "110%" }}
              animate={{ y: "0%" }}
              transition={{
                duration: 0.7,
                delay: 1.7 + i * 0.045,
                ease: EASE_OUT,
              }}
            >
              {word}
              {i < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </h1>
      <motion.p
        initial={
          reduced
            ? false
            : { opacity: 0, y: 12, filter: "blur(8px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, delay: 2.3, ease: EASE_OUT }}
        className="mt-3 text-sm uppercase tracking-[0.35em] text-[var(--action-primary)] md:text-base"
      >
        {SUB}
      </motion.p>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 2.7, ease: EASE_OUT }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <motion.div style={{ x: magnetic.x, y: magnetic.y }}>
          <Link
            ref={magnetic.ref}
            href="/login"
            className="relative inline-flex items-center gap-2 rounded-full bg-[var(--action-primary)] px-6 py-3 text-sm font-medium text-[var(--bg-base)] shadow-lg"
          >
            <LogIn className="h-4 w-4" />
            Sign in to campus portal
            <GlowRing />
          </Link>
        </motion.div>
        <Link
          href="/help"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <HelpCircle className="h-4 w-4" />
          Help &amp; FAQ
        </Link>
      </motion.div>
    </section>
  );
}

function GlowRing() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[var(--action-primary)]"
      initial={{ scale: 1, opacity: 0 }}
      animate={{ scale: [1, 1.35, 1.35], opacity: [0, 0.5, 0] }}
      transition={{
        duration: 1.4,
        repeat: Infinity,
        repeatDelay: 3,
        ease: EASE_OUT,
      }}
    />
  );
}
