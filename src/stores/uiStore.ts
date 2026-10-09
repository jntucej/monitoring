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
        const randomSuffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID().slice(0, 8)
          : `${Date.now()}`;
        const id = `toast-${Date.now()}-${randomSuffix}`;
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
          // Persist to cookie so the server can render the right theme next request
          document.cookie = `gate-monitor-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
        }
        set({ theme });
      },

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
        theme: state.theme,
      }),
    }
  )
);

