/**
 * Zustand UI store — global toast notifications, modal state, theme.
 */
import { create } from "zustand";
import type { ToastData, ToastVariant } from "@/components/ui/toast";

interface UIState {
  toasts: ToastData[];
  theme: "dark" | "light" | "glass";
  isMobileSidebarOpen: boolean;
}

interface UIActions {
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  setTheme: (theme: "dark" | "light" | "glass") => void;
  toggleMobileSidebar: () => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  toasts: [],
  theme: "dark",
  isMobileSidebarOpen: false,

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
      if (theme === "dark" || theme === "glass") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("gate-monitor-theme", theme);
    }
    set({ theme });
  },

  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),

  success: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `s-${Date.now()}`, message, title, variant: "success" }],
  })),

  error: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `e-${Date.now()}`, message, title, variant: "error" }],
  })),

  info: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `i-${Date.now()}`, message, title, variant: "info" }],
  })),

  warning: (message, title) => set((state) => ({
    toasts: [...state.toasts, { id: `w-${Date.now()}`, message, title, variant: "warning" }],
  })),
}));
