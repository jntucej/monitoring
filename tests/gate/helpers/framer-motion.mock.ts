// tests/gate/helpers/framer-motion.mock.ts
import React from 'react';

const makeTag = (tag: string) =>
  React.forwardRef<HTMLElement, any>((props, ref) => {
    const {
      children, initial, animate, exit, whileHover, whileTap, whileInView,
      transition, variants, layout, layoutId, onAnimationComplete,
      ...domProps
    } = props;
    return React.createElement(tag, { ...domProps, ref }, children);
  });

export const motion = new Proxy({} as any, {
  get: (_t, tag: string) => makeTag(tag),
});

export const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const useReducedMotion = () => false;
export const useMotionValue = (v: number) => ({
  get: () => v, set: jest.fn(), on: jest.fn(), off: jest.fn(), destroy: jest.fn(),
});
export const useSpring = (v: any) => v;
export const useTransform = (v: any) => v;
export const useScroll = () => ({
  scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 },
});
export const useInView = () => true;
export const useAnimation = () => ({ start: jest.fn(), stop: jest.fn() });
