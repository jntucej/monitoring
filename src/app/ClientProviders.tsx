"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist.hasHydrated()) {
      try {
        persist.rehydrate();
      } catch {
        useAuthStore.getState().setHasHydrated(true);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <GlassProvider initialDark={true}>
        <NavigationProvider>
          <ToastProvider>
            <SafeAreaAppShell>{children}</SafeAreaAppShell>
          </ToastProvider>
        </NavigationProvider>
      </GlassProvider>
    </ErrorBoundary>
  );
}

export default ClientProviders;
