"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useBotStore } from "./store";
import { BotBoat } from "./BotBoat";
import { useAuthStore } from "@/stores/authStore";
import { playAudioFeedback } from "@/lib/sound";
import { isDashboardRoot } from "./dashboard-root";

const LONG_PRESS_MS = 420;

// The chat panel is the trigger UI's heavy dependency. It transitively pulls in
// the 3D particles (three + @react-three/fiber), speech hooks, and other
// large modules, so it must NOT be part of the first-load bundle. The
// floating button (~2 KB) stays static so it appears immediately; the panel
// + its 3D/speech code download only when the user actually opens it.
const BotPanel = dynamic(() => import("./BotPanel").then((m) => m.BotPanel), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-24 right-6 h-[520px] w-[380px] rounded-2xl bg-slate-900/70 animate-pulse" />
  ),
});

export function FloatingBot() {
  const { open, toggleOpen, requestVoiceMode } = useBotStore();
  const hydrated = useAuthStore((s) => s._hasHydrated);
  const authed = useAuthStore((s) => s.authenticated);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [holdProgress, setHoldProgress] = useState(0);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const didLongPress = useRef(false);
  const pressStart = useRef(0);

  const clearPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setHoldProgress(0);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (open) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      originX: pos.x >= 0 ? pos.x : window.innerWidth - 96,
      originY: pos.y >= 0 ? pos.y : window.innerHeight - 96,
      moved: false,
    };
    didLongPress.current = false;
    pressStart.current = performance.now();
    // animate hold progress
    const tick = () => {
      const elapsed = performance.now() - pressStart.current;
      setHoldProgress(Math.min(1, elapsed / LONG_PRESS_MS));
      if (elapsed < LONG_PRESS_MS) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      playAudioFeedback("success");
      requestVoiceMode();           // opens panel AND auto-activates mic + TTS
      clearPress();
      dragRef.current = null;
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > 8) d.moved = true;
    const nx = Math.max(8, Math.min(window.innerWidth - 80, d.originX + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - 80, d.originY + dy));
    setPos({ x: nx, y: ny });
    if (d.moved) clearPress();      // drag cancels hold
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    clearPress();
    if (!d) return;
    if (!didLongPress.current && !d.moved) {
      // short tap -> plain open
      toggleOpen();
    }
  };

  const onPointerCancel = () => { dragRef.current = null; clearPress(); };

  useEffect(() => () => clearPress(), [clearPress]);

  // The bot lives on dashboard pages. If the user navigates off a dashboard
  // root while the panel is open, close it — otherwise returning later makes
  // it pop open unexpectedly (the `open` flag persists across navigation).
  const pathname = usePathname();
  useEffect(() => {
    if (pathname && !isDashboardRoot(pathname) && useBotStore.getState().open) {
      useBotStore.getState().setOpen(false);
    }
  }, [pathname]);

  if (!hydrated || !authed) return null;

  const style = pos.x < 0
    ? { right: 24, bottom: 24 }
    : { left: pos.x, top: pos.y, right: "auto", bottom: "auto" };

  return (
    <>
      {/* Hold-to-speak hint (only when closed and idle) */}
      {!open && (
        <div
          className="fixed z-[79] text-[10px] uppercase tracking-wider text-[var(--text-muted)] pointer-events-none select-none"
          style={
            pos.x < 0
              ? { right: 30, bottom: 104 }
              : { left: pos.x + 6, top: pos.y - 18 }
          }
        >
          Hold to speak
        </div>
      )}
      <div
        className="fixed z-[80] floating-bot-root touch-none"
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <button
          type="button"
          aria-label="Hold to speak, tap to open assistant"
          className="relative w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-center active:scale-95 transition-transform"
        >
          {/* Hold-progress ring */}
          <svg
            className="absolute inset-0 -rotate-90 pointer-events-none"
            viewBox="0 0 64 64"
          >
            <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="2" />
            <circle
              cx="32" cy="32" r="30"
              fill="none"
              stroke="rgba(139,92,246,0.95)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - holdProgress)}
              style={{ transition: holdProgress === 0 ? "stroke-dashoffset 180ms ease" : "none" }}
            />
          </svg>
          <BotBoat phase="idle" />
        </button>
      </div>
      <AnimatePresence>{open && <BotPanel />}</AnimatePresence>
    </>
  );
}
