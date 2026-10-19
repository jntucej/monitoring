"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "../hooks/useReducedMotionSafe";

interface ScrambleTextProps {
  text: string;
  durationMs?: number;
  className?: string;
  onDone?: () => void;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*";

export function ScrambleText({
  text,
  durationMs = 1400,
  className = "",
  onDone,
}: ScrambleTextProps) {
  const reduced = useReducedMotionSafe();
  const [display, setDisplay] = useState(reduced ? text : "");
  const doneRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(text);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }

    let raf = 0;
    const start = performance.now();
    const chars = text.split("");
    const isSpace = chars.map((c) => c === " ");
    const progressAt = (t: number) => Math.min(1, Math.max(0, t / durationMs));

    const tick = (now: number) => {
      const p = progressAt(now - start);
      const revealCount = Math.floor(p * chars.length);
      const next = chars.map((c, i) => {
        if (i < revealCount) return c;
        if (isSpace[i]) return " ";
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      });
      setDisplay(next.join(""));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs, reduced, onDone]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{display}</span>
    </span>
  );
}
