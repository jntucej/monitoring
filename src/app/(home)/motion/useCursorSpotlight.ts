import { useEffect } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function useCursorSpotlight() {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const sx = useSpring(x, { stiffness: 80, damping: 20 });
  const sy = useSpring(y, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX / window.innerWidth);
      y.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return { sx, sy };
}
