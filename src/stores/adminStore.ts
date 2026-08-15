/**
 * Zustand store for the Admin dashboard — KPIs, activity feed, alerts, gate passes.
 */
import { create } from "zustand";
import { dashboard, getAlerts, resolveAlert, getNotifications } from "@/lib/db";
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
  loadDashboard: () => void;
  loadAlerts: () => void;
  resolveAlert: (alertId: string, userId: string, userName: string) => void;
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

  loadDashboard: () => {
    const data = dashboard();
    set({ dashboardData: data, liveActivity: data.activityFeed });
  },

  loadAlerts: () => {
    const alerts = getAlerts(true);
    set({ alerts });
  },

  resolveAlert: (alertId, userId, userName) => {
    resolveAlert(alertId, userId, userName);
    get().loadAlerts();
    get().loadDashboard();
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
