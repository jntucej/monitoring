"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";

export type GateStatus = "entry" | "exit" | "idle" | "warning";
export type PerformanceTier = "splusplus" | "performance" | "legacy" | "emergency";
export type DisplayMode = "indoor" | "outdoor";

interface GlassState {
  isDark: boolean;
  toggleTheme: () => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  activeGate: string | null;
  setActiveGate: (id: string | null) => void;
  gateTraffic: number;
  setGateTraffic: (level: number) => void;
  isTouchDevice: boolean;
  prefersReducedMotion: boolean;
  performanceTier: PerformanceTier;
  isLowEndDevice: boolean;
}

const GlassContext = createContext<GlassState | undefined>(undefined);

export function GlassProvider({
  children,
  initialDark = true,
}: {
  children: ReactNode;
  initialDark?: boolean;
}) {
  const store = useUIStore();
  const prefersReducedMotion = useReducedMotion();
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [gateTraffic, setGateTraffic] = useState(45);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("indoor");

  // --- RUNTIME FPS DETECTION ---
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>("splusplus");
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = localStorage.getItem("gate-monitor-display-mode") as DisplayMode | null;
    if (savedMode === "outdoor" || savedMode === "indoor") {
      setDisplayModeState(savedMode);
      document.documentElement.setAttribute("data-display-mode", savedMode);
    }
  }, []);

  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("gate-monitor-display-mode", mode);
      document.documentElement.setAttribute("data-display-mode", mode);
    }
  };

  const toggleDisplayMode = () => {
    setDisplayMode(displayMode === "indoor" ? "outdoor" : "indoor");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prefersReducedMotion) {
      setPerformanceTier("emergency");
      return;
    }

    let animationFrameId: number;

    const measureFps = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      const delta = now - lastFpsCheckRef.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);

        if (fps >= 55) setPerformanceTier("splusplus");
        else if (fps >= 30) setPerformanceTier("performance");
        else if (fps >= 15) setPerformanceTier("legacy");
        else setPerformanceTier("emergency");

        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;
      }

      animationFrameId = requestAnimationFrame(measureFps);
    };

    animationFrameId = requestAnimationFrame(measureFps);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  const isDark = store.theme ? store.theme !== "light" : initialDark;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = store.theme === "dark" ? "light" : store.theme === "light" ? "glass" : "dark";
    store.setTheme(nextTheme);
  };

  const isLowEndDevice = performanceTier === "legacy" || performanceTier === "emergency";

  return (
    <GlassContext.Provider
      value={{
        isDark,
        toggleTheme,
        displayMode,
        setDisplayMode,
        toggleDisplayMode,
        activeGate,
        setActiveGate,
        gateTraffic,
        setGateTraffic,
        isTouchDevice,
        prefersReducedMotion: !!prefersReducedMotion,
        performanceTier,
        isLowEndDevice,
      }}
    >
      {children}
    </GlassContext.Provider>
  );
}

export const useGlass = () => {
  const context = useContext(GlassContext);
  if (!context) {
    throw new Error("useGlass must be used within a GlassProvider");
  }
  return context;
};

