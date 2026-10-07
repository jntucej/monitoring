/**
 * Zustand store for Admin dashboard KPIs, activity feed, alerts, and gate passes.
 */
import { create } from "zustand";
import type { DashboardData, Alert, Scan } from "@/lib/types";

interface AdminState {
  dashboardData: DashboardData | null;
  alerts: Alert[];
  unreadNotifications: number;
  liveActivity: Scan[];
  activeGate: string | null;
  loading: boolean;
}

interface AdminActions {
  loadDashboard: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  resolveAlert: (alertId: string, userId?: string, userName?: string) => Promise<void>;
  recordScan: (scan: Scan) => void;
  setActiveGate: (gateId: string | null) => void;
  refresh: () => void;
}

export const useAdminStore = create<AdminState & AdminActions>()((set, get) => ({
  dashboardData: null,
  alerts: [],
  unreadNotifications: 0,
  liveActivity: [],
  activeGate: null,
  loading: false,

  loadDashboard: async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json().catch(() => null);
      if (json?.success && json.data) {
        set({ dashboardData: json.data, liveActivity: json.data.activityFeed || [] });
      }
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    }
  },

  loadAlerts: async () => {
    try {
      const res = await fetch("/api/alerts?resolved=false");
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.data)) {
        set({ alerts: json.data });
      }
    } catch (e) {
      console.error("Failed to load alerts:", e);
    }
  },

  resolveAlert: async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: "PATCH" });
      get().loadAlerts();
      get().loadDashboard();
    } catch (e) {
      console.error("Failed to resolve alert:", e);
    }
  },

  recordScan: (scan) => {
    set((state) => ({
      liveActivity: [scan, ...state.liveActivity.slice(0, 49)],
    }));
  },

  setActiveGate: (gateId) => set({ activeGate: gateId }),

  refresh: () => {
    get().loadDashboard();
    get().loadAlerts();
  },
}));
