/**
 * Zustand UI store — global toast notifications + sidebar state.
 * Single theme (graphite): no theme field, no setTheme.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ToastData } from "@/components/ui/toast";

// Fix 7: limit toasts to max 3 in the store
const MAX_TOASTS = 3;

interface UIState {
  toasts: ToastData[];
  isMobileSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
}

interface UIActions {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      toasts: [],
      isMobileSidebarOpen: false,
      isSidebarCollapsed: false,

      addToast: (toast) => {
        const randomSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().slice(0, 8)
          : `${Date.now()}`;
        const id = `toast-${Date.now()}-${randomSuffix}`;
        const duration = toast.duration ?? 4000;
        const newToast: ToastData = { ...toast, id, duration };
        set((state) => {
          // Fix 7: enforce max 3 toasts
          const overflow = state.toasts.length + 1 - MAX_TOASTS;
          const trimmed = overflow > 0 ? state.toasts.slice(overflow) : state.toasts;
          return { toasts: [...trimmed, newToast] }
        });
        if (duration > 0) {
          setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
        }
      },

      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      clearAllToasts: () => set({ toasts: [] }),

      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      success: (message, title) => {
        const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const duration = 4000;
        set((state) => ({
          toasts: [...state.toasts, { id, message, title, variant: "success", duration }],
        }));
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
      },

      error: (message, title) => {
        const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const duration = 5000;
        set((state) => ({
          toasts: [...state.toasts, { id, message, title, variant: "error", duration }],
        }));
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
      },

      info: (message, title) => {
        const id = `i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const duration = 4000;
        set((state) => ({
          toasts: [...state.toasts, { id, message, title, variant: "info", duration }],
        }));
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
      },

      warning: (message, title) => {
        const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const duration = 4500;
        set((state) => ({
          toasts: [...state.toasts, { id, message, title, variant: "warning", duration }],
        }));
        setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
      },
    }),
    {
      name: "gate-monitor-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
