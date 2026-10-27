// Custom hook for detecting breakpoint changes
import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface UseBreakpointOptions {
  ssr?: boolean; // Server-side rendering
}

export interface UseBreakpointResult {
  breakpoint: Breakpoint;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
  width: number;
}

export function useBreakpoint(options: UseBreakpointOptions = {}): UseBreakpointResult {
  const { ssr = false } = options;

  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs');
  const [width, setWidth] = useState<number>(0);

  const getBreakpoint = (width: number): Breakpoint => {
    if (width < 640) return 'xs';
    if (width < 768) return 'sm';
    if (width < 1024) return 'md';
    if (width < 1280) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
  };

  useEffect(() => {
    // Server-side rendering check
    if (ssr) {
      // Use window only on client side
      if (typeof window !== 'undefined') {
        setWidth(window.innerWidth);
        setBreakpoint(getBreakpoint(window.innerWidth));
      }
      return;
    }

    // Client-side logic
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);
      setBreakpoint(getBreakpoint(newWidth));
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ssr]);

  return {
    breakpoint,
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2Xl: breakpoint === '2xl',
    width
  };
}
