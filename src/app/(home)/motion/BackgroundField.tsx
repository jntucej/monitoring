"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useCursorSpotlight } from "./useCursorSpotlight";

export function BackgroundField() {
  const reduced = useReducedMotion();
  const { sx, sy } = useCursorSpotlight();
  const left = useTransform(sx, (v) => `${v * 100}%`);
  const top = useTransform(sy, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${left} ${top}, rgba(0,114,255,0.10), transparent 70%)`;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      <motion.div
        className="absolute h-[380px] w-[380px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(0,114,255,0.35), transparent 70%)",
          top: "10%",
          left: "8%",
        }}
        animate={
          reduced
            ? undefined
            : { x: [0, 60, 0, -40, 0], y: [0, -30, 20, 0, 0] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[420px] w-[420px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(168,85,247,0.30), transparent 70%)",
          bottom: "5%",
          right: "10%",
        }}
        animate={
          reduced ? undefined : { x: [0, -50, 40, 0], y: [0, 40, -20, 0] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute h-[300px] w-[300px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.25), transparent 70%)",
          top: "40%",
          left: "55%",
        }}
        animate={
          reduced ? undefined : { x: [0, 40, -30, 0], y: [0, -20, 30, 0] }
        }
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      {!reduced && (
        <motion.div
          className="absolute inset-0"
          style={{ background: spotlight }}
        />
      )}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 40%, black 20%, transparent 70%)",
        }}
      />
    </div>
  );
}
