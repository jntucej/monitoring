"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Suspense } from "react";
import { LoadingStates } from "@/components/shared/LoadingStates";

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
      <Suspense fallback={<LoadingStates />}>
        <GlassProvider initialDark={true}>
        <NavigationProvider>
          <ToastProvider>
            <SafeAreaAppShell>{children}</SafeAreaAppShell>
          </ToastProvider>
        </NavigationProvider>
      </GlassProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default ClientProviders;
