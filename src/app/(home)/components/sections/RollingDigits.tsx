"use client";

import { useReducedMotion } from "framer-motion";
import { useDigitRoll } from "../../motion/useDigitRoll";

/**
 * RollingDigits — a slot-machine number display. Renders each digit of
 * `value` as a 10-cell vertical stack and shifts the stack so the current
 * digit is visible. Uses `transform: translateY` only — no layout work.
 *
 * The component is intentionally tiny: sections import it for any number
 * that should "roll" on change.
 */

export function RollingDigits({
  value,
  cellHeight = 40,
  className = "",
}: {
  value: number;
  /** Pixel height of one digit cell. The track is this tall; each cell
   *  translates by `n * cellHeight`. */
  cellHeight?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { digits } = useDigitRoll(value);

  if (reduced) {
    return (
      <span
        className={`tabular-nums ${className}`}
        aria-label={String(value)}
        role="text"
      >
        {value.toLocaleString("en-IN")}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex tabular-nums ${className}`}
      role="text"
      aria-label={String(value)}
    >
      {digits.map((d, i) => (
        <span
          key={`d-${i}`}
          className="relative inline-flex overflow-hidden"
          style={{ height: cellHeight, width: "0.72em" }}
          aria-hidden="true"
        >
          {Array.from({ length: 10 }, (_, k) => {
            // `shown` is the digit that sits in cell k when the track is
            // offset so that digit d.digit is at the top of the visible
            // window. Each cell is a plain absolutely-positioned span
            // translated by k * cellHeight.
            const shown = (k + d.digit) % 10;
            return (
              <span
                key={k}
                className="absolute left-0 top-0 block w-full"
                style={{
                  height: cellHeight,
                  transform: `translateY(${k * cellHeight}px)`,
                }}
              >
                {shown}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
