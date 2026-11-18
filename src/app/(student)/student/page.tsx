"use client";

import { Suspense, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { TodayStatus } from "@/components/student/home/TodayStatus";
import { ActivePassCard } from "@/components/student/home/ActivePassCard";
import { ContextCard } from "@/components/student/home/ContextCard";
import { QuickLinksRow } from "@/components/student/home/QuickLinksRow";
import { GuardianCallButton } from "@/components/student/home/GuardianCallButton";
import { CampusPulseStrip } from "@/components/student/home/CampusPulseStrip";
import { WifiOff, RotateCw } from "lucide-react";

// Offline banner: visible when the browser loses connectivity.
// Shows cached/SSR content + a banner, not a blank screen.
// The Retry button bumps resetKey, which re-mounts all WidgetBoundary
// panels so they re-fetch on reconnect.
function OfflineBanner({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="alert"
      data-testid="offline-banner"
      className="surface-card flex items-center justify-between gap-3 bg-amber-500/10 p-3 text-sm text-amber-700"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You&apos;re offline. Showing cached data — it will refresh when you reconnect.</span>
      </div>
      <button
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center gap-1 text-xs font-semibold underline disabled:opacity-50"
      >
        <RotateCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

function StudentHomeInner() {
  const [resetKey, setResetKey] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setResetKey((k) => k + 1);
    // WidgetBoundary componentDidUpdate resets on resetKey change
    setTimeout(() => setRetrying(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3 md:p-5">
      <OfflineBanner onRetry={handleRetry} retrying={retrying} />
      <WidgetBoundary name="today-status" resetKey={resetKey}>
        <TodayStatus />
      </WidgetBoundary>
      <WidgetBoundary name="active-pass" resetKey={resetKey}>
        <ActivePassCard />
      </WidgetBoundary>
      <WidgetBoundary name="context" resetKey={resetKey}>
        <ContextCard />
      </WidgetBoundary>
      <WidgetBoundary name="quick-links" resetKey={resetKey}>
        <QuickLinksRow />
      </WidgetBoundary>
      <WidgetBoundary name="guardian-call" resetKey={resetKey}>
        <GuardianCallButton />
      </WidgetBoundary>
      <WidgetBoundary name="campus-pulse" resetKey={resetKey}>
        <CampusPulseStrip />
      </WidgetBoundary>
    </div>
  );
}

export default function StudentHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentHomeInner />
    </Suspense>
  );
}
