"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Siren } from "lucide-react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PrincipalDigest } from "@/components/retention/PrincipalDigest";
import { EmergencyPlaybook } from "@/components/shared/EmergencyPlaybook";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders, getTimeAgo } from "@/lib/utils";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import {
  PrincipalShell, PulseTile, StoryChart, DecisionCard, SectionHeader, SinceLastVisitCard,
} from "./_shared";

const LAST_VISIT_KEY = "principal:lastVisitAt";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function PrincipalInner() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [lastVisitAt] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(LAST_VISIT_KEY)
  );

  // Mark visit on unmount so next login diff is accurate
  useEffect(() => {
    return () => {
      try { localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString()); } catch {}
    };
  }, []);

  // Pending approvals (my stage + escalated)
  const approvals = useApiResource<any>(
    `/api/permissions?status=PENDING&scope=mine&limit=5`,
    { ttlMs: 15_000 }
  );
  usePolling(() => approvals.refresh(), { intervalMs: 30_000 });

  // Campus pulse
  const dashboard = useApiResource<any>(
    `/api/principal/dashboard`,
    { ttlMs: 20_000 }
  );
  usePolling(() => dashboard.refresh(), { intervalMs: 60_000 });

  // 14-day decision history
  const history = useApiResource<any>(
    `/api/principal/audit?action_family=permission&days=14`,
    { ttlMs: 60_000 }
  );

  const decisions = useMemo(() => approvals.data?.data ?? [], [approvals.data]);

  const story = useMemo(() => {
    const raw = history.data?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [history.data]);

  const pulse = dashboard.data?.data ?? null;

  return (
    <PrincipalShell
      title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "Principal"}`}
      subtitle={pulse?.headline ?? "Campus overview"}
      actions={
        <>
          <button
            onClick={() => setPlaybookOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/20"
          >
            <Siren className="h-4 w-4" /> Emergency
          </button>
          <button
            onClick={() => { clearCache(); approvals.refresh(); dashboard.refresh(); }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </>
      }
    >
      {/* ── Since your last visit ─────────────────────────────────── */}
      {lastVisitAt && (
        <SinceLastVisitCard lastVisitAt={lastVisitAt} />
      )}

      {/* ── Needs You Now ─────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Needs you now"
          description={
            decisions.length
              ? `${decisions.length} item${decisions.length === 1 ? "" : "s"} awaiting your decision`
              : "Nothing on your desk"
          }
          href="/principal/approvals"
        />
        <WidgetBoundary title="Decision queue">
          {approvals.loading ? (
            <PageLoading />
          ) : decisions.length === 0 ? (
            <EmptyState title="Inbox zero" description="You're all caught up." />
          ) : (
            <div className="space-y-3">
              {decisions.map((row: any) => (
                <DecisionCard
                  key={row.id}
                  ticket={row.ticket_number}
                  title={row.student?.name ?? row.requester_name ?? "Unknown requester"}
                  subtitle={`${row.workflow_type} · ${row.current_stage}`}
                  reason={row.reason}
                  urgency={row.sla_deadline && new Date(row.sla_deadline) < new Date() ? "overdue" : "due"}
                  slaDeadline={row.sla_deadline}
                  onOpen={() => router.push(`/principal/approvals?focus=${row.ticket_number}`)}
                  onDelegate={() => router.push(`/principal/approvals?focus=${row.ticket_number}&action=delegate`)}
                />
              ))}
            </div>
          )}
        </WidgetBoundary>
      </section>

      {/* ── Campus pulse ──────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Campus pulse" href="/principal/campus" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <PulseTile
            label="On campus"
            value={pulse?.onCampusNow ?? "—"}
            delta={pulse?.onCampusDelta ?? null}
            deltaLabel="vs last week"
            tone="neutral"
            spark={pulse?.onCampusSpark}
            href="/principal/campus?tab=people"
            loading={dashboard.loading}
          />
          <PulseTile
            label="In today"
            value={pulse?.todayIn ?? "—"}
            delta={pulse?.todayInDelta ?? null}
            deltaLabel="vs last week"
            tone="positive"
            href="/principal/campus?tab=people"
            loading={dashboard.loading}
          />
          <PulseTile
            label="Out today"
            value={pulse?.todayOut ?? "—"}
            delta={pulse?.todayOutDelta ?? null}
            deltaLabel="vs last week"
            tone="neutral"
            href="/principal/campus?tab=places"
            loading={dashboard.loading}
          />
          <PulseTile
            label="Active alerts"
            value={pulse?.activeAlerts ?? 0}
            tone={(pulse?.activeAlerts ?? 0) > 0 ? "critical" : "positive"}
            deltaLabel={pulse?.activeAlerts ? "needs attention" : "clear"}
            href="/principal/oversight"
            loading={dashboard.loading}
          />
        </div>
      </section>

      {/* ── Decision story ────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Your decision velocity"
          description="Last 14 days"
        />
        <StoryChart
          title="Approvals over time"
          description="Approved · Rejected · Escalated · Overdue"
          data={story}
          series={[
            { key: "approved",  label: "Approved",  color: "#10b981" },
            { key: "rejected",  label: "Rejected",  color: "#f43f5e" },
            { key: "escalated", label: "Escalated", color: "#f59e0b" },
            { key: "overdue",   label: "Overdue",   color: "#94a3b8" },
          ]}
          loading={history.loading}
          error={history.error}
        />
      </section>

      {/* ── Two-column bottom ─────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Recent activity" href="/principal/oversight" />
          <WidgetBoundary title="Activity">
            <ActivityTimeline />
          </WidgetBoundary>
        </div>
        <div>
          <SectionHeader title="Weekly digest" />
          <PrincipalDigest />
        </div>
      </section>

      <EmergencyPlaybook open={playbookOpen} onClose={() => setPlaybookOpen(false)} />
    </PrincipalShell>
  );
}

export default function PrincipalPage() {
  return (
    <AuthGuard allowedRoles={["principal"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalInner />
      </Suspense>
    </AuthGuard>
  );
}
