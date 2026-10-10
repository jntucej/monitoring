"use client";

/**
 * useKeyboardShortcuts — register global keyboard shortcuts.
 *
 * Issue #395: adds `holdMs` option for destructive actions that require the
 * user to hold a key for a fixed duration before triggering, preventing
 * accidental single-keypress deletions.
 */

import { useEffect } from "react";

export interface Shortcut {
  /** The key to match (e.g. 's', 'Enter', 'Escape') */
  key: string;
  /** Require Ctrl or Cmd to be held */
  mod?: boolean;
  /** Require Shift to be held */
  shift?: boolean;
  /** Skip when focus is inside an input/textarea/select */
  avoidInputs?: boolean;
  /**
   * If > 0, the user must hold the key for this many milliseconds before
   * the handler fires. Use for destructive actions (e.g. delete). The
   * keyup before the timeout cancels the action.
   */
  holdMs?: number;
  handler: (e: KeyboardEvent) => void;
}

/**
 * Register a list of keyboard shortcuts and attach them to `window`.
 * Cleans up all listeners and pending timers on unmount.
 *
 * @param shortcuts - Array of shortcut definitions
 * @param enabled   - Set to false to disable all shortcuts without unmounting
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // Map: shortcut identifier → setTimeout id for held shortcuts
    const held = new Map<string, ReturnType<typeof setTimeout>>();

    const shortcutId = (s: Shortcut) => `${s.key}:${s.mod ?? false}:${s.shift ?? false}`;

    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inInput =
        active ? ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) : false;

      for (const s of shortcuts) {
        if (e.key !== s.key) continue;
        if (s.mod && !(e.metaKey || e.ctrlKey)) continue;
        if (!s.mod && (e.metaKey || e.ctrlKey)) continue;
        if (s.shift && !e.shiftKey) continue;
        if (!s.shift && e.shiftKey) continue;
        if (s.avoidInputs && inInput) continue;

        const id = shortcutId(s);

        if (s.holdMs && s.holdMs > 0) {
          // Don't start a new timer if one is already running for this combo
          if (held.has(id)) return;
          e.preventDefault();
          const timer = setTimeout(() => {
            s.handler(e);
            held.delete(id);
          }, s.holdMs);
          held.set(id, timer);
          return;
        }

        e.preventDefault();
        s.handler(e);
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Cancel any pending hold-timer whose key was released early
      for (const s of shortcuts) {
        if (e.key !== s.key) continue;
        const id = shortcutId(s);
        if (held.has(id)) {
          clearTimeout(held.get(id)!);
          held.delete(id);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      for (const timer of held.values()) clearTimeout(timer);
      held.clear();
    };
  }, [shortcuts, enabled]);
}

export default useKeyboardShortcuts;
