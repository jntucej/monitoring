"use client";
import { motion } from "framer-motion";

export function BotBoat({ open, speaking }: { open: boolean; speaking?: boolean }) {
  return (
    <motion.svg
      width="34" height="34" viewBox="0 0 40 40" fill="none"
      animate={{
        y: speaking ? [0, -3, 0, -2, 0] : open ? 0 : [0, -2.5, 0],
        rotate: speaking ? [-4, 4, -4] : open ? 0 : [-3, 3, -3],
      }}
      transition={{ duration: speaking ? 1.1 : 3.4, repeat: open || speaking ? Infinity : 0, ease: "easeInOut" }}
    >
      <path d="M20 4 L20 24" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 6 L32 21 L20 21 Z" fill="white" fillOpacity="0.95" />
      <path d="M19 10 L10 21 L19 21 Z" fill="white" fillOpacity="0.6" />
      <path d="M6 25 H34 L30 33 H10 Z" fill="white" fillOpacity="0.98" />
      {speaking && (
        <>
          <motion.path
            d="M4 35 Q10 37 16 35 T28 35 T38 34"
            stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" strokeOpacity="0.85"
            animate={{ x: [0, 3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <motion.path
            d="M2 38 Q9 40 15 38 T27 38 T36 37"
            stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" strokeOpacity="0.55"
            animate={{ x: [0, -3, 0], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </>
      )}
    </motion.svg>
  );
}
