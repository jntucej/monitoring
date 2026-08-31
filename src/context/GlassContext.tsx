"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";
import { GateMonitorWS } from "@/lib/websocket";
import { AlertPayload, GateStatusChangePayload } from "@/lib/mockData";

export type GateStatus = "entry" | "exit" | "idle" | "warning";
export type PerformanceTier = "splusplus" | "performance" | "legacy" | "emergency" | "high" | "medium" | "low";
export type DisplayMode = "indoor" | "outdoor";
export type SecurityMode = "secure" | "elevated" | "critical";

export interface GateCardState {
  id: string;
  gateId: string;
  name: string;
  status: GateStatus;
  location: string;
  lastUpdate: number;
}

export type { AlertPayload };

interface GlassState {
  isDark: boolean;
  toggleTheme: () => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
  isLiveStream: boolean;
  setIsLiveStream: (v: boolean) => void;
  toggleLiveStream: () => void;
  isLiveLoading: boolean;
  triggerLiveRefresh: () => void;
  activeGate: string | null;
  setActiveGate: (id: string | null) => void;
  gateTraffic: number;
  setGateTraffic: (level: number) => void;
  isTouchDevice: boolean;
  prefersReducedMotion: boolean;
  setPrefersReducedMotion: (v: boolean) => void;
  performanceTier: PerformanceTier;
  setPerformanceTier: (v: PerformanceTier) => void;
  isLowEndDevice: boolean;
  securityMode: SecurityMode;
  // --- WEBSOCKET REAL-TIME LIVE DATA ---
  gateStatuses: Record<string, GateStatus>;
  setGateStatus: (gateId: string, status: GateStatus) => void;
  wsConnected: boolean;
  wsReconnecting: boolean;
  wsError: string | null;
  lastAlertGateId: string | null;
  cards: GateCardState[];
  setCards: React.Dispatch<React.SetStateAction<GateCardState[]>>;
  activeAlerts: AlertPayload[];
  dismissAlert: (timestamp: string) => void;
}

const GlassContext = createContext<GlassState | undefined>(undefined);

const INITIAL_CARDS: GateCardState[] = [
  { id: "card-1", gateId: "gate-1", name: "Gate 1 — Main Entrance", status: "idle", location: "South Campus", lastUpdate: Date.now() },
  { id: "card-2", gateId: "gate-2", name: "Gate 2 — Hostel Block", status: "idle", location: "North Hostel", lastUpdate: Date.now() },
  { id: "card-3", gateId: "gate-3", name: "Gate 3 — Academic Block", status: "idle", location: "East Wing", lastUpdate: Date.now() },
  { id: "card-4", gateId: "gate-4", name: "Gate 4 — Service Entry", status: "idle", location: "West Maintenance", lastUpdate: Date.now() },
];

export function GlassProvider({
  children,
  initialDark = true,
}: {
  children: ReactNode;
  initialDark?: boolean;
}) {
  const store = useUIStore();
  const framerReducedMotion = useReducedMotion();
  const [manualReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const prefersReducedMotion = !!framerReducedMotion || manualReducedMotion;

  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [gateTraffic, setGateTraffic] = useState(35);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("indoor");

  // --- LIVE TELEMETRY & SINE WAVE REFRESH STATE ---
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);

  const triggerLiveRefresh = useCallback(() => {
    setIsLiveLoading(true);
    setTimeout(() => {
      setIsLiveLoading(false);
    }, 2800);
  }, []);

  const toggleLiveStream = useCallback(() => {
    setIsLiveStream((prev) => {
      const next = !prev;
      if (next) triggerLiveRefresh();
      return next;
    });
  }, [triggerLiveRefresh]);

  const [cards, setCards] = useState<GateCardState[]>(INITIAL_CARDS);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsReconnecting, setWsReconnecting] = useState<boolean>(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<AlertPayload[]>([]);

  // --- SECURITY POSTURE — derived from live telemetry signals ---
  const securityMode: SecurityMode = useMemo(() => {
    const hasCriticalAlert = activeAlerts.some((a) => a.severity === "critical");
    if (hasCriticalAlert) {
      return "critical";
    }
    const hasWarningAlert = activeAlerts.some((a) => a.severity === "warning");
    if (hasWarningAlert) {
      return "elevated";
    }
    return "secure";
  }, [activeAlerts]);

  // --- WEBSOCKET REAL-TIME STATE ---
  const [gateStatuses, setGateStatuses] = useState<Record<string, GateStatus>>({
    "gate-1": "idle",
    "gate-2": "entry",
    "gate-3": "exit",
    "gate-4": "idle",
  });
  const [lastAlertGateId, setLastAlertGateId] = useState<string | null>(null);

  const setGateStatus = useCallback((gateId: string, status: GateStatus) => {
    setGateStatuses((prev) => ({ ...prev, [gateId]: status }));
    setCards((prev) =>
      prev.map((card) =>
        card.gateId === gateId ? { ...card, status, lastUpdate: Date.now() } : card
      )
    );
  }, []);

  const dismissAlert = useCallback((timestamp: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.timestamp.toString() !== timestamp));
  }, []);

  // --- WEBSOCKET LIVE FEED SUBSCRIPTION ---
  const wsRef = useRef<GateMonitorWS | null>(null);

  useEffect(() => {
    const isMock = process.env.NEXT_PUBLIC_WS_MOCK === "true";
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

    if (wsRef.current) {
      wsRef.current.disconnect();
    }
    const ws = new GateMonitorWS(wsUrl, isMock);
    wsRef.current = ws;

    const unsubTraffic = ws.onTrafficUpdate((newTraffic) => {
      setGateTraffic(newTraffic);
    });

    const unsubStatus = ws.onGateStatusChange((data: GateStatusChangePayload) => {
      setGateStatuses((prev) => ({ ...prev, [data.gateId]: data.status }));
      setCards((prev) =>
        prev.map((card) =>
          card.gateId === data.gateId
            ? { ...card, status: data.status, lastUpdate: data.timestamp }
            : card
        )
      );
    });

    const unsubAlert = ws.onAlert((data: AlertPayload) => {
      setLastAlertGateId(data.gateId);
      setActiveAlerts((prev) => {
        const next = [...prev, data];
        if (next.length > 5) next.shift();
        return next;
      });
      // Auto-clear alert after 10 seconds to avoid stale posture triggers
      setTimeout(() => {
        setActiveAlerts((prev) => prev.filter((a) => a.timestamp !== data.timestamp));
      }, 10000);
    });

    const unsubConn = ws.onConnectionChange((connected) => {
      setWsConnected(connected);
      setWsReconnecting(!connected && !isMock);
      if (connected) setWsError(null);
    });

    ws.connect();

    return () => {
      unsubTraffic();
      unsubStatus();
      unsubAlert();
      unsubConn();
      ws.disconnect();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, []);

  // --- RUNTIME FPS DETECTION & REF-THROTTLED TIER ENGINE ---
  const [performanceTier, setPerformanceTierState] = useState<PerformanceTier>("splusplus");
  const performanceTierRef = useRef<PerformanceTier>("splusplus");
  const frameCountRef = useRef(0);
  const lastFpsCheckRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  const setPerformanceTier = useCallback((newTier: PerformanceTier) => {
    if (performanceTierRef.current !== newTier) {
      performanceTierRef.current = newTier;
      setPerformanceTierState(newTier);
    }
  }, []);

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

  // Mobile-first performance detection: Force legacy tier and outdoor display mode on mobile devices
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isMobile = window.innerWidth < 768 && isTouch;
    if (isMobile) {
      setPerformanceTier("legacy");
      setDisplayModeState("outdoor");
      document.documentElement.setAttribute("data-display-mode", "outdoor");
    }
  }, [setPerformanceTier]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const isMobile = window.innerWidth < 768 && isTouch;
    if (isMobile) {
      setPerformanceTier("legacy");
      return;
    }
    if (prefersReducedMotion) {
      setPerformanceTier("emergency");
      return;
    }

    let animationFrameId: number;

    const measureFps = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      const delta = now - lastFpsCheckRef.current;

      // Sample every 2000ms (2 seconds) to avoid micro-jitter state updates
      if (delta >= 2000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        const targetTier: PerformanceTier =
          fps >= 55 ? "splusplus" : fps >= 30 ? "performance" : fps >= 15 ? "legacy" : "emergency";

        // ONLY trigger React re-render when tier actually changes
        if (performanceTierRef.current !== targetTier) {
          performanceTierRef.current = targetTier;
          setPerformanceTierState(targetTier);
        }

        frameCountRef.current = 0;
        lastFpsCheckRef.current = now;
      }

      animationFrameId = requestAnimationFrame(measureFps);
    };

    animationFrameId = requestAnimationFrame(measureFps);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion, setPerformanceTier]);

  const isDark = store.theme ? store.theme === "dark" : initialDark;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = store.theme === "dark" ? "glass" : store.theme === "glass" ? "light" : "dark";
    store.setTheme(nextTheme);
  };

  const isLowEndDevice = performanceTier === "legacy" || performanceTier === "emergency" || performanceTier === "low";

  return (
    <GlassContext.Provider
      value={{
        isDark,
        toggleTheme,
        displayMode,
        setDisplayMode,
        toggleDisplayMode,
        isLiveStream,
        setIsLiveStream,
        toggleLiveStream,
        isLiveLoading,
        triggerLiveRefresh,
        activeGate,
        setActiveGate,
        gateTraffic,
        setGateTraffic,
        isTouchDevice,
        prefersReducedMotion,
        setPrefersReducedMotion,
        performanceTier,
        setPerformanceTier,
        isLowEndDevice,
        securityMode,
        gateStatuses,
        setGateStatus,
        wsConnected,
        wsReconnecting,
        wsError,
        lastAlertGateId,
        cards,
        setCards,
        activeAlerts,
        dismissAlert,
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

