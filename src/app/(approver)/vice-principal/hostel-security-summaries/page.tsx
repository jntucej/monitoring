"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { Suspense, useEffect, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, Siren, ShieldCheck, Users } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { KVPairs, ActionRow, InspectorButton } from "@/components/shared/EntityInspector";

/**
 * VP hostel-security rollup — aggregate only, no per-student rows.
 *
 * All counts come from the single /api/vp/hostel-summary endpoint, which is
 * auth-gated to VP/Principal/Admin/Sysadmin and returns only numbers. The
 * alerts feed is a severity-bucketed summary (counts, not the raw list) —
 * the VP sees posture, not individual records. This replaces the page's
 * previous direct fetches of /api/occupancy/presence-matrix + /api/alerts,
 * which would have exposed a gate × role count matrix + raw alert rows.
 */

interface HostelSummary {
  hostellersTotal: number;
  hostellersOnCampus: number;
  hostellersOutToday: number;
  activeAlerts: number;
  criticalAlerts7d: number;
  hostelLeaveActive: number;
  generatedAt: string;
}

interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

function VpHostelSecurityInner() {
  const [summary, setSummary] = useState<HostelSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [alertsRestricted, setAlertsRestricted] = useState(false);
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const inspectSummary = () => {
    if (!summary) return;
    inspect({
      kind: "hostel_block",
      title: "Hostel security rollup",
      subtitle: `generated ${new Date(summary.generatedAt).toLocaleTimeString()}`,
      status: (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-bg-elevated text-text-muted border border-border">
          {summary.activeAlerts} active alert(s)
        </span>
      ),
      sections: [
        {
          title: "Overview",
          content: (
            <KVPairs
              items={[
                { label: "Hostellers total", value: String(summary.hostellersTotal) },
                { label: "On campus", value: String(summary.hostellersOnCampus) },
                { label: "Out today", value: String(summary.hostellersOutToday) },
                { label: "Hostel leave active", value: String(summary.hostelLeaveActive) },
                { label: "Critical alerts (7d)", value: String(summary.criticalAlerts7d) },
              ]}
            />
          ),
        },
        {
          title: "Context",
          content: (
            <p className="text-xs text-text-muted">
              Counts only — the VP tier is not exposed to raw alert rows or the
              gate × role presence matrix.
            </p>
          ),
        },
        {
          title: "Actions",
          content: (
            <ActionRow>
              <InspectorButton href="/vice-principal/home" variant="ghost">
                Back to VP home
              </InspectorButton>
            </ActionRow>
          ),
        },
      ],
      detailHref: "/vice-principal/home",
      detailLabel: "VP home",
    });
  };

  const loadSummary = async () => {
    try {
      const res = await fetch("/api/vp/hostel-summary", {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data as HostelSummary);
        setSummaryError(null);
      } else {
        setSummaryError(json.error?.message ?? "Failed to load hostel summary");
      }
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load hostel summary");
    }
  };

  const loadAlertSummary = async () => {
    // Count-only buckets from the same alerts endpoint, filtered by severity.
    // We do NOT render the raw alert rows — only the per-severity counts.
    const buckets: AlertSummary = { critical: 0, high: 0, medium: 0, low: 0 };
    const severities = ["critical", "high", "medium", "low"] as const;
    const results = await Promise.all(
      severities.map(async (sev) => {
        try {
          const res = await fetch(`/api/alerts?resolved=false&severity=${sev}`, {
            credentials: "include",
          });
          if (res.status === 403 || res.status === 401) {
            setAlertsRestricted(true);
            return 0;
          }
          const json = await res.json();
          const total =
            typeof json?.total === "number"
              ? json.total
              : Array.isArray(json?.data)
                ? json.data.length
                : 0;
          return total;
        } catch {
          return 0;
        }
      })
    );
    severities.forEach((s, i) => {
      buckets[s] = results[i];
    });
    setAlerts(buckets);
  };

  useEffect(() => {
    loadSummary();
    loadAlertSummary();
  }, []);
  usePolling(loadSummary, { intervalMs: 30_000, enabled: true });
  usePolling(loadAlertSummary, { intervalMs: 60_000, enabled: true });

  const kpis = useMemo(
    () => [
      { label: "Hostellers on campus", value: summary?.hostellersOnCampus ?? 0, icon: Users, tone: "text-action-success" },
      { label: "Hostellers out today", value: summary?.hostellersOutToday ?? 0, icon: Siren, tone: "text-action-warning" },
      { label: "Hostel leave active", value: summary?.hostelLeaveActive ?? 0, icon: Inbox, tone: "text-action-info" },
      { label: "Critical alerts (7d)", value: summary?.criticalAlerts7d ?? 0, icon: Siren, tone: "text-action-danger" },
    ],
    [summary]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <ContextSituationBar
        roleLabel="Vice Principal"
        purpose="Institutional oversight of hostel curfews, warden night reports, and campus security logs"
        contextLabel="Hostel & Security Overview"
        statusSummary="Review residential hostel occupancy, curfew adherence rates, and overnight security escalations."
        primaryAction={{ label: "Pending Approvals", href: "/vice-principal/pending-approvals" }}
        secondaryAction={{ label: "Institutional Analytics", href: "/vice-principal/analytics" }}
      />
      <WidgetBoundary title="Hostel & Security Rollup">
        <div className="surface-card bg-bg-base p-4 min-w-0">
          <div className="flex items-center gap-2 text-text-muted mb-3 min-w-0">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Hostel aggregate — counts only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 min-w-0">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="surface-card bg-bg-elevated/40 p-3 min-w-0 cursor-pointer hover:bg-bg-elevated/60 transition-colors"
                onClick={inspectSummary}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inspectSummary();
                  }
                }}
              >
                <div className="flex items-center gap-2 text-text-muted">
                  <k.icon className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">{k.label}</span>
                </div>
                <p className={`text-xl font-bold ${k.tone}`}>
                  {summary ? k.value : <Loader2 className="w-5 h-5 animate-spin inline text-text-muted" />}
                </p>
              </div>
            ))}
          </div>

          {summaryError && (
            <div className="surface-card bg-amber-500/10 p-3 text-xs text-action-warning min-w-0">
              Hostel summary unavailable: {summaryError}
            </div>
          )}

          <div className="text-xs text-text-muted">
            {summary
              ? `Hostellers on campus: ${summary.hostellersOnCampus} of ${summary.hostellersTotal} total · last refreshed ${new Date(summary.generatedAt).toLocaleTimeString()}`
              : "Loading hostel aggregate…"}
          </div>
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Alert posture (severity buckets)">
        <div className="surface-card bg-bg-base p-4 min-w-0">
          <div className="flex items-center gap-2 text-text-muted mb-3 min-w-0">
            <Siren className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Unresolved campus alerts — by severity
            </span>
          </div>

          {alertsRestricted ? (
            <div className="surface-card bg-bg-elevated/20 p-5 text-center text-sm text-text-muted min-w-0">
              <Siren className="w-5 h-5 text-text-muted mx-auto mb-2" />
              <p className="max-w-md mx-auto">
                Alert detail is restricted at the Vice Principal tier. The Principal and
                Administrator desks carry the live alert feed. The aggregate above remains available.
              </p>
            </div>
          ) : !alerts ? (
            <div className="flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading alert posture…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["critical", "high", "medium", "low"] as const).map((sev) => (
                <div
                  key={sev}
                  className="surface-card bg-bg-elevated/30 p-3 min-w-0 cursor-pointer hover:bg-bg-elevated/50 transition-colors"
                  onClick={inspectSummary}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inspectSummary();
                    }
                  }}
                >
                  <p className="text-xs uppercase tracking-wide text-text-muted">{sev}</p>
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      sev === "critical"
                        ? "text-action-danger"
                        : sev === "high"
                          ? "text-action-warning"
                          : "text-text-secondary"
                    }`}
                  >
                    {alerts[sev]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function VpHostelSecurityPage() {
  return (
    <AuthGuard allowedRoles={["vice_principal", "exam_branch", "oie", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VpHostelSecurityInner />
      </Suspense>
    </AuthGuard>
  );
}
