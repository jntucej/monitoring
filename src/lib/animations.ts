import { Variants, useReducedMotion } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";

export function useGlossyMotion() {
  const theme = useUIStore((s) => s.theme);
  const prefersReduced = useReducedMotion();
  return theme === "glass" && !prefersReduced;
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
};

export const slideInLeft: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export const buttonTap: any = { scale: 0.96 };
export const buttonHover: any = { scale: 1.02, y: -2, transition: { type: "spring", stiffness: 400, damping: 10 } };
export const cardHover: any = { scale: 1.015, y: -4, boxShadow: "0 12px 40px rgba(16,185,129,0.15)", transition: { type: "spring", stiffness: 300, damping: 20 } };
export const statusPulse: any = {
  scale: [1, 1.08, 1],
  opacity: [1, 0.7, 1],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};
