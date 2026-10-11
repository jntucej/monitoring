"use client";
import { useEffect, useState } from "react";

interface VVState {
  height: number;
  offsetTop: number;
  keyboardOffset: number;
  isKeyboardOpen: boolean;
}

export function useVisualViewport(): VVState {
  const [state, setState] = useState<VVState>({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardOffset: 0,
    isKeyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const base = window.innerHeight;
      const vh = vv.height;
      const off = vv.offsetTop;
      const kb = Math.max(0, base - vh - off);
      setState({
        height: vh,
        offsetTop: off,
        keyboardOffset: kb,
        isKeyboardOpen: kb > 120,
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}
