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
import { LiveEventToaster } from "@/components/shared/LiveEventToaster";
import { ShakeDetector } from "@/components/shared/ShakeDetector";
import { RoleThemeProvider } from "@/components/RoleThemeProvider";
import { InspectOverlay } from "@/components/shared/InspectOverlay";

// The floating bot pulls in `three` + `@react-three/fiber` (the listening
// canvas) plus speech hooks. Loading it eagerly would bloat the shared chunk
// that every role console ships. Split it into its own lazy chunk so it only
// downloads when a non-marketing page actually mounts it.
const FloatingBot = dynamic(
  () =>
    import("@/components/bot/FloatingBot").then((m) => m.FloatingBot),
  { ssr: false, loading: () => null },
);

// ── Sakuga VFX theme loader ─────────────────────────────────────
// Female students get the anime-VFX theme by default (ui_theme='sakuga'
// in personalization_prefs). The theme is applied as a data attribute on
// <html> AFTER login, when the token exists.
//
// The fetch + DOM mutation happens in a useEffect that re-runs on every
// ClientProviders mount (including post-login navigation). The CSS palette
// override in globals.css [data-theme="sakuga"] handles the color swap;
// the sakuga-vfx component scripts are progressive enhancement.
function useSakugaTheme() {
  const authenticated = useAuthStore((s) => s.authenticated);
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    const token = sessionStorage.getItem("auth.token");
    if (!token) return;
    fetch("/api/preferences/theme", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || data.ui_theme !== "sakuga") return;
        document.documentElement.setAttribute("data-theme", "sakuga");
        // Load all sakuga-vfx component scripts. Each registers its own
        // custom element; the first loaded sets window.SakugaFX. The progress
        // component powers the sakuga loading splash; the rest are interactive
        // controls available to any sakuga-themed surface.
        for (const name of ["button", "checkbox", "radio", "toggle", "progress", "tabs", "toast", "slider", "input", "rating", "tooltip"]) {
          const s = document.createElement("script");
          s.src = `/sakuga-vfx/${name}.js`;
          s.async = false;
          document.head.appendChild(s);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [authenticated]);
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  // Sakuga VFX theme: applied after auth, on every mount.
  useSakugaTheme();

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
  // usePathname() returns null on the server / before hydration.
  // The layout is shared: check the URL directly so the marketing-page
  // path works on the initial SSR render too.
  const effectivePath =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  // The home page is a marketing surface: the floating bot widget and the
  // floating theme cycler both add corner UI that overlaps the hero CTA and
  // mount extra listeners/canvases for no functional benefit. Guarded/role
  // consoles keep both.
  const isMarketing = effectivePath === "/" || effectivePath === "";
  // The gate scanning kiosk (/gate/*) is a hands-free, zero-chrome surface:
  // the circular floating bot button sits on top of the IN/OUT / Manual
  // entry action bar and collides with the "Manual Entry" label — it
  // must be suppressed there.
  const isGateKiosk = effectivePath?.startsWith("/gate/") || effectivePath === "/gate";

  const providers = (
    <GlassProvider initialDark={true}>
      <RoleThemeProvider>
      <NavigationProvider>
        <ToastProvider>
          <SafeAreaAppShell>{children}</SafeAreaAppShell>
          {/* LiveEventToaster: ambient SSE/poll-to-toast layer, gated
              per-role inside the component — inert for non-alert roles. */}
          {!isMarketing && <LiveEventToaster />}
          {/* ShakeDetector: auto-files a T1 bug complaint on phone shake —
              inert on desktop / no sensor API. Mounted in every non-marketing
              page so mobile users get one-shake bug reporting anywhere. */}
          {!isMarketing && <ShakeDetector />}
          {!isMarketing && !isGateKiosk && <FloatingBot />}
          {/* InspectOverlay: dev-only click interceptor that reads .app-map.json
              and shows a passive inspect panel. No-ops in production builds and
              is inert unless the URL carries ?inspect — it can never appear in a
              normal user session. Read-only: never prevents default or prints
              secrets. */}
          <InspectOverlay />
        </ToastProvider>
      </NavigationProvider>
      </RoleThemeProvider>
    </GlassProvider>
  );

  // Marketing pages skip the Suspense wrapper entirely. The wrapper is what
  // produces <div hidden id="S:0"> around the whole client tree during SSR —
  // everything inside it stays invisible until React hydration completes,
  // which delays LCP on every cold load. Role consoles keep the wrapper
  // because their data-fetching components need a real Suspense boundary.
  const isPublicPage =
    effectivePath === "/" ||
    effectivePath === "" ||
    effectivePath?.startsWith("/login") ||
    effectivePath === "/about" ||
    effectivePath === "/help";

  return (
    <ErrorBoundary>
      {isPublicPage ? (
        // No Suspense boundary on marketing pages. A <Suspense> here makes
        // Next.js emit <div hidden id="S:0"> around the whole client tree
        // during SSR, keeping the hero invisible until hydration — an LCP
        // regression on every cold load. (The previous head-side unhide
        // script was the workaround for that; it has been removed, which is
        // correct — the wrapper is what must not exist in the first place.)
        providers
      ) : (
        <Suspense fallback={<LoadingStates />}>{providers}</Suspense>
      )}
    </ErrorBoundary>
  );
}

export default ClientProviders;
