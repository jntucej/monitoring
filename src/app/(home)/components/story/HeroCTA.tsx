"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Cinematic CTA. Shares `layoutId` with the login gateway card so the
 * morph feels continuous on route transition.
 */
export function HeroCTA({ href = "/login" }: { href?: string }) {
  return (
    <Link href={href} aria-label="Enter campus — sign in with college id">
      <motion.div
        layoutId="hero-to-login-morph"
        className="group inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 backdrop-blur-xl transition-colors hover:bg-white/[0.08]"
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.8 }}
      >
        <span className="text-sm font-medium tracking-wide text-white/90">
          Enter campus
        </span>
        <motion.span
          className="grid h-6 w-6 place-items-center rounded-full bg-white/10"
          animate={{ x: 0 }}
          whileHover={{ x: 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <ArrowRight className="h-3.5 w-3.5 text-white/80" />
        </motion.span>
      </motion.div>
    </Link>
  );
}
