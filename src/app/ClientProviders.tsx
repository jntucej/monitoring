"use client";

import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";

export function ClientProviders({ children }: { children: React.ReactNode }) {
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
