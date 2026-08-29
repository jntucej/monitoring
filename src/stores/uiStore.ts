/**
 * Zustand UI store — global toast notifications, modal state, theme.
 * Uses persist middleware to maintain sidebar collapse state across refreshes.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ToastData, ToastVariant } from "@/components/ui/toast";

interface UIState {
  toasts: ToastData[];
  theme: "dark" | "light" | "glass";
  isMobileSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
}

interface UIActions {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  setTheme: (theme: "dark" | "light" | "glass") => void;
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
      theme: "dark",
      isMobileSidebarOpen: false,
      isSidebarCollapsed: false,

      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const duration = toast.duration ?? 4000;
        const newToast: ToastData = { ...toast, id, duration };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        if (duration > 0) {
          setTimeout(() => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })), duration);
        }
      },

      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      clearAllToasts: () => set({ toasts: [] }),

      setTheme: (theme) => {
        if (typeof window !== "undefined") {
          document.documentElement.setAttribute("data-theme", theme);
          document.documentElement.classList.remove("dark", "light", "glass");
          if (theme === "dark") {
            document.documentElement.classList.add("dark");
          } else if (theme === "glass") {
            document.documentElement.classList.add("glass");
          } else if (theme === "light") {
            document.documentElement.classList.add("light");
          }
          localStorage.setItem("gate-monitor-theme", theme);
        }
        set({ theme });
      },

      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      success: (message, title) =>
        set((state) => ({
          toasts: [...state.toasts, { id: `s-${Date.now()}`, message, title, variant: "success" }],
        })),

      error: (message, title) =>
        set((state) => ({
          toasts: [...state.toasts, { id: `e-${Date.now()}`, message, title, variant: "error" }],
        })),

      info: (message, title) =>
        set((state) => ({
          toasts: [...state.toasts, { id: `i-${Date.now()}`, message, title, variant: "info" }],
        })),

      warning: (message, title) =>
        set((state) => ({
          toasts: [...state.toasts, { id: `w-${Date.now()}`, message, title, variant: "warning" }],
        })),
    }),
    {
      name: "gate-monitor-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

