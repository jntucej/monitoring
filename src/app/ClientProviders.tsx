"use client";

import { GlassProvider } from "@/context/GlassContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlassProvider initialDark={true}>
      <ToastProvider>
        <SafeAreaAppShell>{children}</SafeAreaAppShell>
      </ToastProvider>
    </GlassProvider>
  );
}

export default ClientProviders;
