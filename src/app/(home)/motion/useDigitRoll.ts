"use client";

import { useReducedMotion } from "framer-motion";
import { useReducedMotionSafe } from "../components/hooks/useReducedMotionSafe";

/**
 * useDigitRoll — "slot machine" / odometer digit effect.
 *
 * Split the value into its place digits (ones, tens, hundreds...). For each
 * digit position we render a 10-cell vertical stack (0..9). The stack's
 * vertical offset is chosen (with shortest-path wrap) so the current digit
 * sits at the top. When the value changes, the offset springs, which makes
 * the digits roll.
 *
 * Signature: useDigitRoll(value: number) -> array of per-digit entries.
 * Each entry exposes:
 *   - digit:      the current 0..9 digit at that position
 *   - offset:     (10 + 0 - digit) % 10  → which cell (0..9) is at the top
 *   - springs:    MotionValue<number> per cell index k → translateY in
 *                 units of one cell height, using the shortest-path wrap
 *
 * The caller renders a fixed-height overflow-hidden track and one span per
 * cell k at `translateY: springs[k] * cellHeight`. On
 * prefers-reduced-motion the hook returns static entries with all springs
 * frozen at 0 and a `reduced` flag so the caller can render plain text.
 */

export interface DigitRollState {
  digit: number;
  offset: number;
  /** 10 motion values, one per cell k. translateY in cell-height units. */
  springs: Array<number>;
}

export interface UseDigitRollResult {
  digits: DigitRollState[];
  reduced: boolean;
}

function splitDigits(n: number): number[] {
  const s = Math.max(0, Math.floor(Math.abs(n) || 0)).toString();
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) - 48);
  return out;
}

/**
 * Shortest-path offset: given the current digit, which of the 10 cells
 * (0..9) sits at the top of the stack? `offset = (10 - digit) % 10`
 * means the cell `digit` is at the top when we shift the stack by `offset`
 * cell-heights.
 */
function offsetFor(digit: number): number {
  return (10 - digit) % 10;
}

/**
 * Cell k's translateY (in cell-height units) relative to an `offset`
 * such that cell `digit` is at the top. Wrapped to the shortest path so
 * the roll never travels more than 5 cells.
 */
function cellOffset(digit: number, k: number): number {
  // The stack shows cell (k + offsetFor(digit)) at its k-th slot when not
  // shifted. To bring `digit` to the top we shift by offsetFor(digit).
  const base = offsetFor(digit);
  let dy = k - base;
  if (dy > 5) dy -= 10;
  else if (dy < -5) dy += 10;
  return dy;
}

export function useDigitRoll(value: number): UseDigitRollResult {
  const reduced = useReducedMotionSafe();
  const prefersReduced = useReducedMotion() ?? false;
  const digits = splitDigits(value);

  const states: DigitRollState[] = digits.map((digit) => ({
    digit,
    offset: offsetFor(digit),
    springs: Array.from({ length: 10 }, (_, k) =>
      reduced || prefersReduced ? 0 : cellOffset(digit, k),
    ),
  }));

  return { digits: states, reduced: reduced || prefersReduced };
}
