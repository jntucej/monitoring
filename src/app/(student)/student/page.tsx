"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SakugaLoadingSplash } from "@/components/SakugaLoadingSplash";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { TodayStatus } from "@/components/student/home/TodayStatus";
import { ActivePassCard } from "@/components/student/home/ActivePassCard";
import { ContextCard } from "@/components/student/home/ContextCard";
import { QuickLinksRow } from "@/components/student/home/QuickLinksRow";
import { GuardianCallButton } from "@/components/student/home/GuardianCallButton";
import { CampusPulseStrip } from "@/components/student/home/CampusPulseStrip";
import { MyDayStrip } from "@/components/student/home/MyDayStrip";
import { ActionItemsStrip } from "@/components/student/home/ActionItemsStrip";
import { MyStatsCard } from "@/components/student/home/MyStatsCard";
import { StudentLivingHub } from "@/components/student/StudentLivingHub";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import {
  StudentModeSwitcher,
  StudentModeBody,
  type StudentDashboardMode,
} from "@/components/student/home/StudentDashboardModes";
import { WifiOff, RotateCw } from "lucide-react";
import { Greeting } from "@/components/Greeting";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { useEffectivePref } from "@/hooks/useEffectivePref";
import { usePersona } from "@/hooks/usePersona";
import { resolveRoleConfig } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";

// Persona-aware student home. The SAME widget pool serves both personas, but each
// persona gets a DISTINCT dashboard: a day scholar's home is attendance/class
// centred, a hosteller's home is curfew/hostel/mess centred. Shared chrome
// (greeting, sakuga console, offline banner, onboarding, quick links, guardian
// call, campus pulse) renders on both; only the data-widget set differs.
const SHARED_WIDGET_IDS = ["quick-links", "guardian-call", "campus-pulse"] as const;

// The full widget pool (components keyed by id) — both personas draw from this.
const ALL_WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  "my-day-strip": MyDayStrip,
  "my-stats": MyStatsCard,
  "action-items": ActionItemsStrip,
  "today-status": TodayStatus,
  "active-pass": ActivePassCard,
  "context": ContextCard,
  "quick-links": QuickLinksRow,
  "guardian-call": GuardianCallButton,
  "campus-pulse": CampusPulseStrip,
};

// Persona-specific DATA widgets (rendered before the shared chrome).
// usePersona() resolves to day_scholar | hosteller (never "both" — that value
// is only used for staff-acting-on-behalf in the pass form, not the home).
//   day_scholar → attendance % + today's classes + today's status (no curfew focus)
//   hosteller   → curfew status + active hostel pass + context (curfew/residence)
const PERSONA_DATA_WIDGETS: Record<"day_scholar" | "hosteller", string[]> = {
  day_scholar: ["my-stats", "my-day-strip", "action-items", "today-status"],
  hosteller: ["today-status", "active-pass", "context", "action-items"],
};


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
  const user = useAuthStore((s) => s.user);
  const [resetKey, setResetKey] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [mode, setMode] = useState<StudentDashboardMode>("today");
  // Track whether the sakuga theme is active so we can swap the loading
  // fallback. The theme is set by ClientProviders after auth; we poll
  // briefly on mount (same approach as SakugaLoadingSplash).
  const [isSakuga, setIsSakuga] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const check = () => {
      if (cancelled) return;
      if (document.documentElement.dataset.theme === "sakuga") {
        setIsSakuga(true);
        return;
      }
      if (tries++ < 8) setTimeout(check, 250);
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    setResetKey((k) => k + 1);
    setTimeout(() => setRetrying(false), 3000);
  };

  // Persona-aware dashboards. The same widget pool serves both personas, but the
  // DATA-widget set differs: a day scholar's home is attendance/class centred,
  // a hosteller's home is curfew/hostel/mess centred. The 5-layer cascade
  // (policy > user > trait > persona > role > system) is what this implements:
  // persona selects the set; a user-level "dashboard.widgetOrder" pref can
  // reorder WITHIN the persona's data widgets + shared chrome.
  const persona = usePersona();
  const personaKey: "day_scholar" | "hosteller" =
    persona === "hosteller" ? "hosteller" : "day_scholar";
  const widgetOrderPref = useEffectivePref<string[]>("dashboard.widgetOrder");

  // P1: config-driven capability gate. The student home reads capabilities
  // from config/roles/student.ts (the when(ctx) conditions) instead of a
  // separate engine. A day scholar's home provably renders no hostel
  // surface even if persona resolution is off.
  //
  // Build a minimal WorkspaceContext from the existing persona + traits.
  // (campusStatus defaults to "unknown" — the gate is fail-open for ux
  //  widgets, so unknown doesn't blank the home.)
  // The trusted, admin-verified user record (same source useActiveTraits reads).
  // We only need the residential signal here, which `personaKey` already carries.
  const wsCtx: WorkspaceContext = useMemo(() => {
    const isHosteller = personaKey === "hosteller";
    return {
      roles: ["student"],
      personType: "student",
      residentialStatus: isHosteller ? "hosteller" : "day_scholar",
      campusStatus: "unknown" as const,
      // The block/room detail is not needed for the capability gate — the gate
      // keys off residentialStatus, not the specific block. Leave undefined
      // so the hostel widget's internal data fetch fills it in.
      hostel: undefined,
      activeAuthorizations: [],
      activeApprovals: [],
    };
  }, [personaKey]);

  // The capability set the student config grants for this context.
  const studentCaps: Set<string> = useMemo(() => {
    const { capabilities } = resolveRoleConfig("student", wsCtx);
    return new Set(capabilities);
  }, [wsCtx]);

  // Map hostel-family widgets to the capability that must be present.
  // (guardrail #6: view caps drive surface display.)
  const HOSTEL_WIDGET_CAP: Record<string, string> = {
    "active-pass": "hostel.leave.view",
    context: "curfew.view",
  };

  // The persona's data widgets, honouring a user override pref, then
  // filtered by capability. A hostel widget renders only if the config's
  // when(ctx) condition granted the corresponding capability. Fail-open:
  // a non-hostel widget always renders.
  const personaDataWidgets: string[] = useMemo(() => {
    const base = PERSONA_DATA_WIDGETS[personaKey];
    const pref = widgetOrderPref.value ?? [];
    const allIds = [...base, ...SHARED_WIDGET_IDS];
    const valid = pref.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !valid.includes(id));
    const ordered = [...valid, ...missing];
    return ordered.filter((id) => {
      const cap = HOSTEL_WIDGET_CAP[id];
      if (!cap) return true; // non-hostel widgets always render
      return studentCaps.has(cap); // hostel widgets only when the view cap is granted
    });
  }, [personaKey, widgetOrderPref.value, studentCaps]);

  const dashboardContent = (
    <div className="mx-auto max-w-2xl space-y-3 p-3 md:p-5">
      <Greeting />
      <CustomRoleGreeting name={user?.name} role={user?.role ?? "student"} />
      <OfflineBanner onRetry={handleRetry} retrying={retrying} />
      <RoleOnboarding />
      <ContextSituationBar
        contextLabel={personaKey === "hosteller" ? "Hosteller Dashboard" : "Day Scholar Dashboard"}
        summary={
          personaKey === "hosteller"
            ? "Track your curfew status, active hostel passes, meal tokens, and campus updates."
            : "Track your class attendance, today's schedule, gate passes, and campus updates."
        }
        primaryAction={{ label: "Digital ID Card", href: "/student/id" }}
        secondaryAction={{ label: "New Pass Request", href: "/student/permissions/new" }}
      />
      <StudentModeSwitcher mode={mode} onChange={setMode} />
      <StudentLivingHub
        snapshot={{
          campusState: "INSIDE",
          attendancePct: 82,
          safeSkipsRemaining: 3,
          pendingAssignments: 0,
          unratedMealsCount: 0,
          activeStreakDays: 5,
          unreadAlerts: 0,
        }}
      />
      {mode === "today" ? (
        personaDataWidgets.map((id) => {
          const Render = ALL_WIDGET_COMPONENTS[id];
          if (!Render) return null;
          return (
            <WidgetBoundary key={`${personaKey}-${id}`} name={id} resetKey={resetKey}>
              <Render />
            </WidgetBoundary>
          );
        })
      ) : (
        <StudentModeBody mode={mode} resetKey={resetKey} />
      )}
    </div>
  );

  // SakugaLoadingSplash is already provided once by (student)/layout.tsx -> SakugaPageShell.
  return dashboardContent;
}

export default function StudentHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentHomeInner />
    </Suspense>
  );
}
