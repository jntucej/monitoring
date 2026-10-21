"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";

const RemotionHero = dynamic(
  () => import("@/components/remotion/GlossyMotionPlayer").then((m) => ({
    default: () => <m.GlossyMotionPlayer type="hero" className="w-full h-full" />,
  })),
  { ssr: false, loading: () => null }
);

export interface BootSequenceProps {
  onDone: () => void;
}

export function BootSequence({ onDone }: BootSequenceProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissed(true);
      onDone();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const skip = () => {
    setDismissed(true);
    onDone();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          className="boot-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          onClick={skip}
        >
          <div className="absolute inset-0 opacity-30">
            <RemotionHero />
          </div>
          <motion.div
            className="relative z-10 text-center text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-base text-[#F8FAFC]">MyCampus online</div>
            <div className="mt-2 text-xs text-[#94A3B8]">tap to skip</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
