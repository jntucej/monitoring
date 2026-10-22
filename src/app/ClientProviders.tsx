"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { GlassProvider } from "@/context/GlassContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { ToastProvider } from "@/components/ui/toast";
import { SafeAreaAppShell } from "@/components/shared/SafeAreaAppShell";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoadingStates } from "@/components/shared/LoadingStates";
import { FloatableThemeCycler } from "@/components/shared/FloatableThemeCycler";

// The floating bot pulls in `three` + `@react-three/fiber` (the listening
// canvas) plus speech hooks. Loading it eagerly would bloat the shared chunk
// that every role console ships. Split it into its own lazy chunk so it only
// downloads when a non-marketing page actually mounts it.
const FloatingBot = dynamic(
  () =>
    import("@/components/bot/FloatingBot").then((m) => m.FloatingBot),
  { ssr: false, loading: () => null },
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  // Ensure the persist store has rehydrated from localStorage. If the
  // rehydrate path did not flip _hasHydrated (e.g. storage blocked, or
  // rehydration threw), fall back to flipping it here so guarded routes
  // cannot linger on the AppLoadingScreen for their first paint.
  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist.hasHydrated()) {
      try {
        persist.rehydrate();
      } catch {
        setHasHydrated(true);
      }
    }
  }, [setHasHydrated]);

  // Independent second path: if the flag is still false after the above
  // effect has run (rehydration is synchronous in this store), flip it.
  // Guarded by hasHydrated so this runs exactly once and never loops.
  useEffect(() => {
    if (!hasHydrated) setHasHydrated(true);
  }, [hasHydrated, setHasHydrated]);

  const pathname = usePathname();
  // The home page is a marketing surface: the floating bot widget and the
  // floating theme cycler both add corner UI that overlaps the hero CTA and
  // mount extra listeners/canvases for no functional benefit. Guarded/role
  // consoles keep both.
  const isMarketing = pathname === "/" || pathname === "";

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingStates />}>
        <GlassProvider initialDark={true}>
        <NavigationProvider>
          <ToastProvider>
            <SafeAreaAppShell>{children}</SafeAreaAppShell>
            {!isMarketing && <FloatingBot />}
            {!isMarketing && <FloatableThemeCycler />}
          </ToastProvider>
        </NavigationProvider>
      </GlassProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default ClientProviders;
