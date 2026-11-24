"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Shield,
  AlertTriangle,
  Info,
  ArrowRight,
  Activity,
  GraduationCap,
  UserCheck,
  Briefcase,
  HardHat,
  Zap,
  Database,
  Users,
  Ticket,
  Clock,
  WifiOff,
  RotateCw,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { QuickActions } from "@/components/admin/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { LiveEventsPanel } from "@/components/shared/LiveEventsPanel";
import { PageLoading } from "@/components/shared/LoadingStates";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { EntityInspector, KVPairs, InspectorButton, Timeline } from "@/components/shared/EntityInspector";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataFreshness } from "@/components/shared/DataFreshness";

import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  Info,
  ArrowRight,
  GraduationCap,
  UserCheck,
  Briefcase,
  HardHat,
  Zap,
  Database,
};

interface AuditEvent {
  id: string;
  action: string;
  userName?: string;
  userRole?: string;
  timestamp?: string;
}

interface OverviewData {
  command: { health: string[] };
  identity: { active: number; suspended: number; deprovisioned: number };
  access: { mfaCoverage: number };
  gates: { status: string[] };
  alerts: { critical: number; high: number; medium: number; low: number };
  counts: Record<string, number>;
  recentAuditEvents?: AuditEvent[];
}

function fmt(n: number | string | null | undefined): string {
  if (typeof n === "string") return n;
  return (typeof n === "number" && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN");
}

// RC11/AX4 — accessible name now computed from DOM text (title + description) via aria-describedby,
// instead of an aria-label that suppressed the description.
const descId = (label: string) => `module-desc-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function AdminOverviewInner() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [activeAuditEvent, setActiveAuditEvent] = useState<AuditEvent | null>(null);

  // RC7/AX3 — announce data changes to screen readers without moving focus.
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  const load = useCallback(async () => {
    if (!isOffline) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/overview", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        const prev = data;
        setData(json.data);
        setError(null);
        setLastUpdated(new Date());
        // announce only when the alert counts actually change (avoid chatty updates)
        const a = json.data?.alerts, b = prev?.alerts;
        if (a && b && (a.critical !== b.critical || a.high !== b.high || a.medium !== b.medium || a.low !== b.low)) {
          const critical = a.critical ?? 0, high = a.high ?? 0, low = (a.medium ?? 0) + (a.low ?? 0);
          if (liveRef.current) {
            liveRef.current.textContent =
              critical > 0
                ? `${critical} critical, ${high} high, ${low} lower-priority alerts open`
                : `${high} high and ${low} lower-priority alerts open`;
          }
        }
      } else {
        setError(typeof json.error === "string" ? json.error : json.error?.message ?? "Failed to load overview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
      setIsOffline(true); // RC10/SD5 — preserve last data; show offline badge, don't destroy the view
    } finally {
      setIsRefreshing(false);
    }
  }, [data, isOffline]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll only while online; pause when offline (RC10/SD5).
  usePolling(load, { intervalMs: 30_000, enabled: !isOffline });

  // RC10/SD5 — track connectivity; resume polling + refresh on reconnect.
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      load();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [load]);

  const activeGates = (data?.gates.status ?? []).filter((s) => s === "online").length;
  const totalGates = data?.gates.status.length ?? 0;

  // RC1 — per-severity alert breakdown (no longer a single lumped scalar).
  const alerts = data?.alerts ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const openAlerts =
    (alerts.critical ?? 0) + (alerts.high ?? 0) + (alerts.medium ?? 0) + (alerts.low ?? 0);
  const hasCritical = (alerts.critical ?? 0) > 0;

  const statCards: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    hint: string;
    href: string;
  }> = data
    ? [
        { icon: Users, label: "Active Users", value: data.identity?.active ?? 0, hint: `${data.identity?.suspended ?? 0} suspended`, href: "/admin/users" },
        { icon: Shield, label: "Gates Online", value: `${activeGates}/${totalGates}`, hint: totalGates - activeGates > 0 ? `${totalGates - activeGates} offline` : "All online", href: "/admin/gates" },
        { icon: Ticket, label: "Pending Approvals", value: data.counts?.access ?? 0, hint: (data.counts?.access ?? 0) > 0 ? "Action required" : "Inbox clear", href: "/admin/passes" },
        { icon: Zap, label: "Suspended Users", value: data.identity?.suspended ?? 0, hint: `${data.identity?.deprovisioned ?? 0} deprovisioned`, href: "/admin/users" },
      ]
    : [];

  /** Standardized inspection model for a recent campus audit event (kind audit_event). */
  const auditEventInspection = activeAuditEvent
    ? {
        kind: "audit_event",
        title: activeAuditEvent.action,
        subtitle: activeAuditEvent.id,
        status: (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-action-success">
            RECORDED
          </span>
        ),
        sections: [
          {
            title: "Overview",
            content: (
              <KVPairs
                items={[
                  { label: "Action", value: <code className="font-mono">{activeAuditEvent.action}</code> },
                  { label: "Actor", value: activeAuditEvent.userName ?? "—" },
                  { label: "Role", value: activeAuditEvent.userRole ?? "—" },
                  {
                    label: "Recorded",
                    value: activeAuditEvent.timestamp
                      ? new Date(activeAuditEvent.timestamp).toLocaleString("en-IN")
                      : "—",
                  },
                ]}
              />
            ),
          },
          {
            title: "Timeline",
            collapsible: true,
            content: (
              <Timeline
                items={[
                  {
                    label: activeAuditEvent.action,
                    time: activeAuditEvent.timestamp
                      ? new Date(activeAuditEvent.timestamp).toLocaleString("en-IN")
                      : undefined,
                    detail: activeAuditEvent.userName || activeAuditEvent.userRole || undefined,
                    tone: "neutral",
                  },
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/admin/audit-logs" variant="primary">
                  <ChevronRight className="size-3.5" /> Full audit trail
                </InspectorButton>
              </div>
            ),
          },
        ],
        detailHref: "/admin/audit-logs",
        detailLabel: "Full audit trail",
      }
    : null;

  // Skeleton grid matching the final 4-card layout (RC4/SD4 — no layout shift on load).
  const skeleton = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" role="status">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="surface-card bg-bg-surface p-2.5 animate-pulse">
          <div className="size-5 rounded-lg bg-bg-elevated" />
          <p className="mt-3 h-7 w-16 rounded bg-bg-elevated" />
          <p className="mt-1.5 h-3 w-24 rounded bg-bg-elevated" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Campus administration"
        contextLabel="Campus administration"
        statusSummary="Review current campus administration state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <h1 className="sr-only">Campus administration overview</h1>
      <PageHeader title="Admin" subtitle="Campus administration" onRefresh={load} refreshing={isRefreshing} />

      {/* RC1/UE1 — dominant, conditional alert cluster. Only present when alerts exist;
          critical gets danger weight. Replaces the old quiet bottom amber banner. */}
      {data && openAlerts > 0 && (
        <div
          className={`surface-card p-2.5 sm:p-3.5 flex flex-wrap items-center gap-3 ${
            hasCritical ? "bg-rose-500/10" : "bg-bg-elevated"
          }`}
          role="alert"
        >
          <div className="size-5 grid place-items-center shrink-0">
            <AlertTriangle className={`size-4 ${hasCritical ? "text-action-danger" : "text-action-warning"}`} />
          </div>
          <div className="flex-1 min-w-[14rem]">
            <p className={`text-sm font-semibold ${hasCritical ? "text-action-danger" : "text-text-primary"}`}>
              {hasCritical ? "Critical security alerts open" : "Security alerts open"}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {alerts.critical ?? 0} critical · {alerts.high ?? 0} high · {alerts.medium ?? 0} medium · {alerts.low ?? 0} low
            </p>
          </div>
          <Link
            href="/admin/alerts"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              hasCritical
                ? "bg-action-danger text-white hover:bg-action-danger/90"
                : "border border-border bg-bg-surface text-text-primary hover:bg-bg-elevated"
            }`}
          >
            Triage alerts <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {/* RC10/SD5 — offline badge, only when disconnected; last data is preserved, not destroyed. */}
      {isOffline && (
        <div className="surface-card bg-amber-500/10 p-2.5 flex items-center gap-2.5" role="status">
          <WifiOff className="size-4 text-action-warning shrink-0" />
          <p className="text-xs text-text-secondary">
            Offline — showing cached telemetry{lastUpdated ? ` from ${lastUpdated.toLocaleTimeString("en-IN")}` : ""}. Polling paused; will revalidate on reconnect.
          </p>
        </div>
      )}

      {/* RC7/AX3 — screen-reader announcer for poll-driven alert changes (visually hidden). */}
      <p ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Grid of Key Admin Functions */}
      <WidgetBoundary name="LiveOverview" title="Operational Metrics">
        <div>
          {/* RC12/AX5 — h2 section heading */}
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
            Operational Metrics
          </h2>

          {error ? (
            // RC8/SD2 — recoverable error card with retry (was a bare string with no action).
            <div className="surface-card bg-rose-500/5 p-2.5 text-sm" role="alert">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-4 text-action-danger shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">Telemetry unavailable</p>
                  <p className="text-xs text-text-muted mt-0.5">{error}</p>
                </div>
                <button
                  onClick={() => { setIsOffline(false); load(); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-surface px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated"
                >
                  <RotateCw className="size-3.5" /> Retry
                </button>
              </div>
            </div>
          ) : !data ? (
            skeleton
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <HoverPreview
                    key={card.label}
                    preview={<MetricPreview label={card.label} value={fmt(card.value)} hint={card.hint} />}
                  >
                    <Link
                      href={card.href}
                      aria-describedby={descId(card.label)}
                      className="surface-card group bg-bg-surface p-2.5 hover:bg-emerald-500/5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-emerald-500/10 text-action-success">
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-success group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="mt-3 text-2xl font-black text-text-primary">{fmt(card.value)}</p>
                      <p id={descId(card.label)} className="text-xs text-text-muted mt-0.5">
                        {card.label}
                      </p>
                    </Link>
                  </HoverPreview>
                );
              })}
            </div>
          )}

          {data && statCards.length > 0 && lastUpdated ? (
            <div className="mt-2 flex justify-end">
              <DataFreshness timestamp={lastUpdated} status={isOffline ? "offline" : undefined} autoRefresh />
            </div>
          ) : null}

          {data && statCards.length === 0 && !error ? (
            <EmptyState
              title="No operational metrics"
              description="Telemetry has been loaded but no modules are reporting yet. Open a module below to begin tracking."
            />
          ) : null}

          {data && data.recentAuditEvents && data.recentAuditEvents.length > 0 && (
              <div className="mt-6">
                {/* RC12/AX5 — h3 subsection under the h2 section */}
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Recent Campus Events
                </h3>
                <div className="surface-card bg-bg-surface divide-y divide-border">
                  {data.recentAuditEvents.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => setActiveAuditEvent(e)}
                      className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-bg-elevated/30 transition"
                    >
                      <div className="min-w-4">
                        <code className="text-xs bg-bg-elevated px-1.5 py-1.5 text-action-success">
                          {e.action}
                        </code>
                        <p className="text-xs text-text-muted mt-1 truncate">
                          {e.userName || e.userRole || "system"}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                        {e.timestamp ? new Date(e.timestamp).toLocaleString("en-IN") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* RC9/SD3 — explicit empty state instead of the section silently vanishing. */}
          {data && (data.recentAuditEvents?.length ?? 0) === 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Recent Campus Events
              </h3>
              <div className="surface-card bg-bg-surface border border-border p-6 text-center">
                <p className="text-sm text-text-secondary">No recent security or gate events recorded in the last 24 hours.</p>
                <p className="text-xs text-text-muted mt-1">
                  This is normal when campus activity is quiet. Open the{" "}
                  <Link href="/admin/reports" className="underline text-action-primary">
                    Reports & Analytics
                  </Link>{" "}
                  module for historical logs.
                </p>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Module Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: "/admin", icon: "Activity", label: "Live Dashboard", desc: "Real-time campus status & gate telemetry" },
            { href: "/admin/gates", icon: "Shield", label: "Gate Management", desc: "Hardware status, operators & scan logs" },
            { href: "/admin/students", icon: "GraduationCap", label: "Student Roster", desc: "Master student directory & ID management" },
            { href: "/admin/faculty", icon: "UserCheck", label: "Faculty Tracking", desc: "Attendance & movement for teaching staff" },
            { href: "/admin/staff", icon: "Briefcase", label: "Staff Oversight", desc: "Staff check-in/out tracking" },
            { href: "/admin/workers", icon: "HardHat", label: "Worker Shifts", desc: "Contractor shift & attendance tracking" },
            { href: "/admin/alerts", icon: "AlertTriangle", label: "Alert Center", desc: "Security alerts & incident management" },
            { href: "/admin/occupancy", icon: "Zap", label: "Spatial Density", desc: "Zone capacity & digital twin monitoring" },
            { href: "/admin/reports", icon: "Database", label: "Reports & Analytics", desc: "Historical data & exportable reports" },
          ].map((mod, i) => {
            const IconComp = iconMap[mod.icon];
            return (
              <Link
                key={i}
                href={mod.href}
                aria-describedby={descId(mod.label)}
                className="surface-card group p-2.5 bg-bg-surface hover:bg-emerald-500/5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-action-success group-hover:scale-110 transition-transform">
                      {IconComp && <IconComp className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-text-primary group-hover:text-action-success transition-colors">
                        {mod.label}
                      </p>
                      <p id={descId(mod.label)} className="text-xs text-text-muted mt-0.5">
                        {mod.desc}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-success group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <WidgetBoundary name="QuickActions" title="Quick Actions">
        <QuickActions />
      </WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center">
        <NotificationCenter />
      </WidgetBoundary>
      <WidgetBoundary name="LiveEvents" title="Live Events">
        <LiveEventsPanel />
      </WidgetBoundary>

      <EntityInspector inspection={auditEventInspection} onClose={() => setActiveAuditEvent(null)} />

      {/* RC2/UE2 — retention widgets demoted to a secondary rail, below the operational modules. */}
      <section aria-label="Secondary campus widgets">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Secondary</h2>
        <div className="space-y-6">
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
            <PersonalizedCampusHome />
          </WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity">
            <TaskContinuity />
          </WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
            <UnifiedCampusCalendar />
          </WidgetBoundary>
        </div>
      </section>

      {/* RC6/AX2 — info strip restyled to a neutral, non-alert tone so it no longer mimics an alert.
          (contrast verify-first; not assumed a failure) */}
      <div className="surface-card bg-bg-elevated p-2.5 flex items-center gap-3">
        <Info className="w-4 h-4 text-text-muted shrink-0" />
        <div>
          <p className="text-xs font-semibold text-text-primary">Command Overview</p>
          <p className="text-xs text-text-muted mt-0.5">
            All modules read from one live telemetry feed. The Dashboard shows real-time status; open
            a module to go deeper.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminOverviewInner />
    </Suspense>
  );
}
