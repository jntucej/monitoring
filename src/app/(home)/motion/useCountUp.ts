import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function useCountUp(
  target: number | null | undefined,
  duration = 1600,
) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null || Number.isNaN(target)) return;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, reduced]);

  return value;
}
