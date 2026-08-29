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
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      x.set((e.clientX - centerX) * factor);
      y.set((e.clientY - centerY) * factor);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y, factor]);

  return { x: springX, y: springY, isDesktop };
};

export default useMouseParallax;

