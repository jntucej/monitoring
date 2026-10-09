"use client";

import React, { useEffect } from "react";
import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { useAuthStore } from "@/stores/authStore";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Bug 122: rehydrate() can reject (corrupt JSON, quota exceeded, private-mode
    // sessionStorage that throws on read). onRehydrateStorage only fires on
    // SUCCESS, so a throw leaves _hasHydrated false forever. AuthGuard's 8s
    // fail-closed timeout already routes such users to /login — so we must NOT
    // force _hasHydrated true here (that would bypass the fail-closed gate with a
    // possibly-poisoned authenticated state). We only kill the unhandled rejection
    // and drop the poisoned key so the NEXT load starts clean instead of re-hitting
    // the 8s spin.
    Promise.resolve(useAuthStore.persist.rehydrate()).catch((err: unknown) => {
      console.error("[authStore] rehydrate failed; clearing poisoned session key:", err);
      try {
        sessionStorage.removeItem("gate-monitor-auth");
      } catch { /* private mode — nothing to clear */ }
      useAuthStore.setState({ authenticated: false, user: null, token: null, refreshToken: null });
    });
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
