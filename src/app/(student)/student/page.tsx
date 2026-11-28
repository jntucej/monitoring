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
import { StudentLivingHub, type StudentLiveSnapshot } from "@/components/student/StudentLivingHub";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";
import {
  StudentModeBody,
  type StudentDashboardMode,
} from "@/components/student/home/StudentDashboardModes";
import { BlobTabs } from "@/components/ui/BlobTabs";
import { MotionTabPanel, MotionBentoGrid, MotionBentoCard } from "@/components/ui/MotionKit";
import { StudentAcademicsHub } from "@/components/student/StudentAcademicsHub";
import { WifiOff, RotateCw } from "lucide-react";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { RoleOnboarding } from "@/components/RoleOnboarding";
import { useEffectivePref } from "@/hooks/useEffectivePref";
import { usePersona } from "@/hooks/usePersona";
import { useApiResource } from "@/hooks/useApiResource";
import { resolveRoleConfig } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";

// Short human label for a gate_passes.reason value (no raw codes leaked).
function humanizePassReason(reason: string | null | undefined): string {
  if (!reason) return "Gate Pass";
  const r = reason.trim().toLowerCase();
  if (r === "hostel_leave" || r === "leave") return "Hostel Leave";
  if (r === "outpass" || r === "out_pass") return "Out-of-Campus Pass";
  if (r === "medical") return "Medical";
  if (r === "official" || r === "official_duty") return "Official Duty";
  return "Gate Pass";
}

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

  const { data: dash } = useApiResource<{
    success: boolean;
    data: {
      attendance?: { pct?: number; total?: number };
      activePasses?: Array<{
        id: string;
        reason: string;
        from: string;
        to: string;
        status: string;
        qrCode?: string;
      }>;
      lastScan?: Record<string, unknown> | null;
    };
  }>("/api/student/dashboard", { ttlMs: 30_000 });

  const { data: ws } = useApiResource<{
    success: boolean;
    context?: {
      campusStatus: "in_campus" | "out_campus" | "unknown";
      residentialStatus: "hosteller" | "day_scholar" | string;
    };
  }>("/api/me/workspace", { ttlMs: 30_000 });

  // Real presence + persona (from /api/me/workspace). The residentialStatus
  // here is the DB-truth source of the persona; usePersona() is the fallback.
  const wsCampus = ws?.context?.campusStatus ?? "unknown";
  const wsResidential = ws?.context?.residentialStatus;
  const effectivePersona: "day_scholar" | "hosteller" =
    wsResidential === "hosteller"
      ? "hosteller"
      : wsResidential === "day_scholar"
        ? "day_scholar"
        : personaKey;

  // Build the hub snapshot from REAL data — no hardcoded INSIDE / 82%.
  const activePasses = dash?.data?.activePasses ?? [];
  const topPass = activePasses[0];
  const hubSnapshot: StudentLiveSnapshot = {
    campusState:
      wsCampus === "out_campus" || activePasses.length > 0 ? "OUTSIDE" : "INSIDE",
    activePass: topPass
      ? {
          id: topPass.id,
          ticketNumber: topPass.id,
          typeLabel: humanizePassReason(topPass.reason),
          returnDeadline: topPass.to
            ? new Date(topPass.to).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          status: topPass.status,
        }
      : null,
    attendancePct: dash?.data?.attendance?.pct ?? 0,
    safeSkipsRemaining: 0,
    pendingAssignments: 0,
    todayMealLabel: undefined,
    unratedMealsCount: 0,
    activeStreakDays: 0,
    unreadAlerts: 0,
  };

  const dashboardContent = (
    <div className="mx-auto max-w-2xl space-y-3 p-3 md:p-5">
      {/* Single structured greeting card: time-of-day salutation + name +
          role badge + contextual subline + optional special-occasion wish.
          (Previously the page rendered two overlapping greeting blocks — the
          two-line Greeting strip and this card — which was deduped down to
          the single richer card. The old two-line Greeting component was
          removed entirely once every panel migrated to this one.) */}
      <CustomRoleGreeting name={user?.name} role={user?.role ?? "student"} />
      <OfflineBanner onRetry={handleRetry} retrying={retrying} />
      <RoleOnboarding />
      <ContextSituationBar
        roleLabel="Student"
        purpose={
          personaKey === "hosteller"
            ? "Track residence, curfew, hostel passes, and dining services"
            : "Track academic schedules, day attendance, and campus gate passes"
        }
        contextLabel={personaKey === "hosteller" ? "Hosteller Dashboard" : "Day Scholar Dashboard"}
        statusTone={hubSnapshot.activePass ? "ok" : "info"}
        statusPill={
          hubSnapshot.activePass
            ? `Active · ${hubSnapshot.activePass.typeLabel}`
            : undefined
        }
        statusSummary={
          hubSnapshot.activePass
            ? `Your ${hubSnapshot.activePass.typeLabel.toLowerCase()} pass is approved. ${
                hubSnapshot.activePass.returnDeadline
                  ? `Return by ${hubSnapshot.activePass.returnDeadline}.`
                  : ""
              }`
            : effectivePersona === "hosteller"
              ? "Track your curfew status, active hostel passes, meal tokens, and campus updates."
              : "Track your class attendance, today's schedule, gate passes, and campus updates."
        }
        why={
          hubSnapshot.activePass
            ? "Show your QR pass at the gate scanner when exiting or re-entering campus."
            : "Use the mode tabs below to switch between today's status, academics, and monthly recap."
        }
        primaryAction={
          hubSnapshot.activePass
            ? { label: "Show QR / Passes", href: "/student/passes" }
            : { label: "Digital ID Card", href: "/student/id" }
        }
        secondaryActions={[
          { label: "New Pass Request", href: "/student/permissions/new" },
          ...(effectivePersona === "hosteller"
            ? [{ label: "Meal Token", href: "/student/mess/token" }]
            : []),
        ]}
      />
      <LivePulseStrip
        ariaLabel="Student live pulse"
        items={[
          {
            id: "presence",
            label: "Campus Presence",
            valueLabel: hubSnapshot.campusState === "OUTSIDE" ? "Out of Campus" : "On Campus",
            ratio: hubSnapshot.campusState === "OUTSIDE" ? 0.35 : 0.85,
            tone: hubSnapshot.campusState === "OUTSIDE" ? "warn" : "ok",
            benchmark: hubSnapshot.activePass
              ? hubSnapshot.activePass.returnDeadline
                ? `Return by ${hubSnapshot.activePass.returnDeadline}`
                : `${hubSnapshot.activePass.typeLabel} active`
              : "In-campus — normal operations",
          },
          {
            id: "curfew",
            label: "Curfew Window",
            valueLabel: new Date().getHours() >= 21 || new Date().getHours() < 6 ? "Curfew Active" : "Day Window",
            ratio: new Date().getHours() >= 21 || new Date().getHours() < 6 ? 0.2 : 0.85,
            tone: new Date().getHours() >= 21 || new Date().getHours() < 6 ? "warn" : "ok",
            benchmark: "Standard gate hours 06:00–21:30",
          },
          {
            id: "attendance",
            label: "Attendance",
            valueLabel: `${hubSnapshot.attendancePct}%`,
            ratio: Math.min(1, hubSnapshot.attendancePct / 100),
            tone: hubSnapshot.attendancePct >= 75 ? "ok" : "warn",
            benchmark:
              hubSnapshot.attendancePct >= 75
                ? "Above 75% minimum threshold"
                : "Below 75% — attend upcoming classes",
          },
        ]}
      />
      <div className="space-y-1">
        <p className="text-[11px] text-text-muted px-0.5">
          Choose a view below to focus on today&apos;s gate status, academics, hostel &amp; mess, or monthly growth.
        </p>
        <BlobTabs
          items={
            effectivePersona === "day_scholar"
              ? [
                  { id: "today", label: "Today" },
                  { id: "academics", label: "Academics" },
                  { id: "growth", label: "Recap" },
                ]
              : [
                  { id: "today", label: "Today" },
                  { id: "academics", label: "Academics" },
                  { id: "hostel", label: "Hostel &amp; Mess" },
                  { id: "growth", label: "Recap" },
                ]
          }
          value={mode}
          onChange={(next) => setMode(next as StudentDashboardMode)}
        />
      </div>
      <StudentLivingHub snapshot={hubSnapshot} persona={effectivePersona} />
      <MotionTabPanel tabKey={mode}>
        {mode === "academics" ? (
          <WidgetBoundary name="student-academics-hub" resetKey={resetKey}>
            <StudentAcademicsHub />
          </WidgetBoundary>
        ) : mode === "today" ? (
          <MotionBentoGrid className="space-y-2.5">
            {personaDataWidgets.map((id) => {
              const Render = ALL_WIDGET_COMPONENTS[id];
              if (!Render) return null;
              return (
                <MotionBentoCard key={`${personaKey}-${id}`} interactive className="p-0">
                  <WidgetBoundary name={id} resetKey={resetKey}>
                    <Render />
                  </WidgetBoundary>
                </MotionBentoCard>
              );
            })}
          </MotionBentoGrid>
        ) : (
          <StudentModeBody mode={mode} resetKey={resetKey} />
        )}
      </MotionTabPanel>
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
