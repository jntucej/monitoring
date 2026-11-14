"use client";

import { useEffect, useState } from "react";

/**
 * useNoMotion — the home page's first paint must not depend on JS.
 *
 * On the server and on the client's first render this returns `true`,
 * so every consumer renders plain, fully-opaque, non-animated HTML.
 * After mount, if the user does NOT prefer reduced motion, it flips to
 * `false` and motion (fade-ins, scroll recede, blur reveals) turns on.
 *
 * The previous behavior (SSR with framer-motion `initial={{opacity:0}}`
 * styles) shipped `style="opacity:0"` in the SSR HTML: without JS the
 * hero, sub-headline and CTA painted invisible — a blank first paint
 * and an LCP regression on every device whose JS is slow or blocked.
 */
export function useNoMotion(): boolean {
  const [noMotion, setNoMotion] = useState(true);
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setNoMotion(prefersReduced);
  }, []);
  return noMotion;
}
