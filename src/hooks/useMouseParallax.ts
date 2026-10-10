import { useEffect, useState } from 'react';
import { useMotionValue, useSpring, MotionValue } from 'framer-motion';

interface ParallaxReturn {
  x: MotionValue<number>;
  y: MotionValue<number>;
  isDesktop: boolean;
}

export const useMouseParallax = (factor: number = 0.02, damping: number = 20, stiffness: number = 180): ParallaxReturn => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping, stiffness });
  const springY = useSpring(y, { damping, stiffness });
  const [isDesktop, setIsDesktop] = useState(false);
  // Issue #399: respect prefers-reduced-motion (WCAG 2.2 §2.3.3).
  // Users who set "reduce motion" in their OS must never see the parallax effect.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const checkDesktop = () => {
      const isDesktopDevice = typeof window !== 'undefined' && window.innerWidth >= 640;
      setIsDesktop(isDesktopDevice);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Disable parallax when reduced-motion is requested or on touch devices
    if (reducedMotion) return;
    // ponytail: no parallax on touch — iOS/Android synthesize mousemove from
    // touch (hover emulation), which janks scroll via the orb springs.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches === false) return;
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      x.set((e.clientX - centerX) * factor);
      y.set((e.clientY - centerY) * factor);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y, factor, reducedMotion]);

  return { x: springX, y: springY, isDesktop: isDesktop && !reducedMotion };
};

export default useMouseParallax;

