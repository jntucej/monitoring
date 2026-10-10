"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const store = useAuthStore.persist;
    if (store && typeof store.hasHydrated === "function" && !store.hasHydrated()) {
      try { store.rehydrate(); } catch { /* ignore */ }
    }
  }, []);

  return (
    <GlassProvider initialDark={true}>
      <NavigationProvider>
        <ToastProvider>
          <SafeAreaAppShell>{children}</SafeAreaAppShell>
        </ToastProvider>
      </NavigationProvider>
    </GlassProvider>
  );
}

export default ClientProviders;
