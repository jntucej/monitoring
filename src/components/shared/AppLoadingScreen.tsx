"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

import { Shield, Loader2 } from "lucide-react";

/**
 * Full-page loading screen shown while:
 *  - the app shell is hydrating (auth store not yet ready)
 *  - a route transition is in progress
 *
 * Deliberately visible for at least 400 ms so it registers even on
 * low-latency networks (no white-flash / jarring skip).
 */

const MIN_VISIBLE_MS = 400;

export function AppLoadingScreen() {
  const { loading, _hasHydrated } = useAuthStore();
  const { theme } = useUIStore();
  const [progress, setProgress] = useState(0);
  const hideRef = useRef(false);
  const startRef = useRef(Date.now());

  // Hide when auth store has hydrated AND minimum time has passed
  const settled = _hasHydrated;

  // Progress bar ticks toward 92% over ~1.2 s
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(92, (elapsed / (MIN_VISIBLE_MS * 3)) * 100));
    }, 50);
    return () => clearInterval(id);
  }, []);

  // Once settled + min time elapsed → fade out
  useEffect(() => {
    if (hideRef.current || !settled) return;
    const elapsed = Date.now() - startRef.current;
    if (elapsed < MIN_VISIBLE_MS) {
      const t = setTimeout(() => { hideRef.current = true; setProgress(100); }, MIN_VISIBLE_MS - elapsed + 120);
      return () => clearTimeout(t);
    }
    hideRef.current = true;
    setProgress(100);
  }, [settled]);

  if (hideRef.current) return null;

  const isGlass = theme === "glass";
  const bg = isGlass ? "bg-[#0a0a14]" : "bg-[var(--bg-base)]";
  const cardBg = isGlass
    ? "bg-white/5 backdrop-blur-xl border-white/10"
    : "bg-[var(--bg-surface)] border-[var(--border)]";
  const textMuted = "text-[var(--text-muted)]";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${bg} transition-opacity duration-300`}
    >
      {/* Animated progress bar (top of screen) */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--bg-elevated)] overflow-hidden">
        <div
          className="h-full bg-[var(--action-primary)] transition-all ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Brand logo */}
      <div className={`flex items-center justify-center w-16 h-16 rounded-2xl ${cardBg} shadow-2xl`}>
        <Shield className="w-8 h-8 text-[var(--action-primary)] animate-pulse" />
      </div>

      {/* App name */}
      <p className="mt-5 text-lg font-semibold text-[var(--text-primary)] tracking-tight">
        Gate Monitor
      </p>
      <p className={`mt-1 text-xs ${textMuted} flex items-center gap-1.5`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        {loading ? "Loading your session…" : "Loading…"}
      </p>

      {/* Secondary progress dots */}
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${isGlass ? "bg-white/40" : "bg-[var(--text-muted)]/40"} animate-pulse`}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      <span className="sr-only">Gate Monitor loading…</span>
    </div>
  );
}
