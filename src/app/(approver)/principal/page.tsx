"use client";

/* ── Principal Command Center ── */
/* The one screen that answers "What needs me now?"
 * Rule 1: one screen answers "what needs me", everything else one click behind.
 * Rule 2: every number = Now + vs last week + what to do.
 *
 * Thin READ-ONLY projection (PR-12 invariant): this page projects
 * /api/principal/dashboard + /api/principal/retention + /api/principal/digest.
 * Write verbs stay in the engine routes (resolve / approve / escalate /
 * delegate). Per-item actions deep-link to the dedicated surfaces that own
 * those verbs — this cockpit does not out-run the engine. No new deps, no
 * business logic, file kept < 400 lines.
 */

import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { PrincipalShell } from "@/components/principal/shared/PrincipalShell";
import { PulseTile } from "@/components/principal/shared/PulseTile";
import { StoryChart } from "@/components/principal/shared/StoryChart";
import { DecisionCard } from "@/components/principal/_components/DecisionCard";
import { SectionHeader } from "@/components/principal/shared/SectionHeader";
import { SinceLastVisitCard } from "@/components/principal/shared/SinceLastVisitCard";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { PrincipalEmptyState } from "@/components/principal/shared/PrincipalEmptyState";

interface DashboardResponse {
  counts: {
    pending: number;
    escalated: number;
    overdue: number;
    todayDecisions: number;
  };
  priorityItems: Array<{
    id: string;
    ticket_number: string;
    workflow_type: string;
    reason?: string | null;
    sla_deadline?: string | null;
    student_name?: string | null;
    is_emergency: boolean;
  }>;
  chainImpact: { students: number; faculty: number; total: number };
  delegations: { active: number; expiringSoon: number };
  emergency: Array<{ ticket: string; subject: string; age: string }>;
  exams: { pendingClearances: number; todayCandidates: number };
  recentAlerts?: Array<Record<string, unknown>>;
}

interface DigestResponse {
  approved?: number;
  delegated?: number;
  avgDecision?: string;
  slaAdherence?: number;
  insight?: string;
  /** Weekly decision series for the StoryChart (backend follow-up — optional). */
  series?: Array<Record<string, number | string>>;
}

export default function PrincipalCommandCenter() {
  const router = useRouter();
  const dash = useApiResource<DashboardResponse>("/api/principal/dashboard");
  const digestRes = useApiResource<DigestResponse>("/api/principal/digest?range=week");
  // Keep the "now" figures fresh without hammering the API.
  usePolling(dash.refresh, { intervalMs: 60_000, enabled: !dash.loading && !dash.error });

  if (dash.loading && !dash.data) {
    return (
      <PrincipalShell title="Command Center" subtitle="What needs you now">
        <div className="surface-card bg-bg-surface p-5 text-sm text-text-muted">
          Loading your desk…
        </div>
      </PrincipalShell>
    );
  }

  const d = dash.data;
  const items = d?.priorityItems ?? [];
  const counts = d?.counts ?? { pending: 0, escalated: 0, overdue: 0, todayDecisions: 0 };
  const impact = d?.chainImpact ?? { students: 0, faculty: 0, total: 0 };
  const deleg = d?.delegations ?? { active: 0, expiringSoon: 0 };
  const emergencies = d?.emergency ?? [];
  const digest = digestRes.data ?? undefined;

  return (
    <PrincipalShell
      title="Command Center"
      subtitle="What needs you now — every number is now + vs last week + what to do"
    >
      {/* ── Headline row: the "what needs me" numbers ── */}
      <PrincipalWidgetBoundary>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PulseTile
            label="Pending decisions"
            value={counts.pending}
            reference={counts.pending - (digest?.approved ?? 0)}
            referenceLabel="since last week"
          />
          <PulseTile
            label="Escalated to you"
            value={counts.escalated}
            higherIsBetter={false}
          />
          <PulseTile
            label="Overdue (SLA)"
            value={counts.overdue}
            higherIsBetter={false}
          />
          <PulseTile
            label="People waiting"
            value={impact.total}
          />
        </div>
      </PrincipalWidgetBoundary>

      {/* ── Active emergencies, surfaced first (rule 1: what needs me) ── */}
      {emergencies.length > 0 ? (
        <PrincipalWidgetBoundary>
          <div className="surface-card border-l-4 border-l-rose-500 bg-bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-action-danger">
              {emergencies.length} active emergency{emergencies.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {emergencies.slice(0, 3).map((e) => (
                <li key={e.ticket} className="text-sm text-text-primary">
                  <span className="font-mono text-xs text-text-muted">{e.ticket}</span>{" "}
                  {e.subject}{" "}
                  <span className="text-xs text-text-muted">({e.age})</span>
                </li>
              ))}
            </ul>
            <a
              href="/principal/emergency"
              className="mt-2 inline-block text-sm font-medium text-action-primary underline-offset-2 hover:underline"
            >
              Open the command plane →
            </a>
          </div>
        </PrincipalWidgetBoundary>
      ) : null}

      {/* ── The compressed decision list. Each card deep-links to the surface
            that owns its write verb; inline Delegate routes to the delegation
            flow. (Read-only projection — see PR-12 invariant.) ── */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          label="Decide these now"
          hint={`${counts.pending} pending · ${counts.escalated} escalated · ${counts.overdue} overdue`}
        />
        {items.length === 0 ? (
          <PrincipalEmptyState
            title="All clear"
            description="Nothing is waiting on your decision right now."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {items.slice(0, 8).map((it) => (
              <DecisionCard
                key={it.id}
                ticket={it.ticket_number}
                title={
                  it.student_name
                    ? `${it.workflow_type} · ${it.student_name}`
                    : it.workflow_type
                }
                subtitle={it.reason ?? undefined}
                urgency={
                  it.sla_deadline && new Date(it.sla_deadline) < new Date()
                    ? "overdue"
                    : "due"
                }
                slaDeadline={it.sla_deadline ? formatDateTime(it.sla_deadline) : null}
                onOpen={() => {
                  router.push(`/principal/attention?ticket=${it.ticket_number}`);
                }}
                onDelegate={() => {
                  router.push("/principal/governance/delegations");
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Retention layers: Since-Last-Visit · Weekly Digest · Playbook ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PrincipalWidgetBoundary>
          <SinceLastVisitCard />
        </PrincipalWidgetBoundary>
        <PrincipalWidgetBoundary>
          <WeeklyDigest digest={digest} />
        </PrincipalWidgetBoundary>
        <PrincipalWidgetBoundary>
          <PlaybookTile active={emergencies.length} delegations={deleg} />
        </PrincipalWidgetBoundary>
      </section>

      {/* ── The "story": weekly decision pace behind the numbers ── */}
      <PrincipalWidgetBoundary>
        <DecisionPaceDigest digest={digest} />
      </PrincipalWidgetBoundary>
    </PrincipalShell>
  );
}

/* Weekly digest — retention: what you did last week + the engine's insight. */
function WeeklyDigest({ digest }: { digest?: DigestResponse | null }) {
  return (
    <div className="surface-card bg-bg-surface p-5 flex flex-col gap-3">
      <SectionHeader label="This week" hint="Your decision pace" />
      {!digest ? (
        <PrincipalEmptyState
          title="No digest yet"
          description="Decisions will appear here this week."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <PulseTile label="Approved" value={digest.approved ?? 0} />
            <PulseTile label="Delegated" value={digest.delegated ?? 0} />
          </div>
          <div className="text-sm">
            <span className="text-text-muted">Avg decision </span>
            <span className="font-semibold text-text-primary">
              {digest.avgDecision ?? "—"}
            </span>
          </div>
          {digest.insight ? (
            <p className="rounded-lg bg-bg-subtle p-3 text-sm text-text-primary">
              {digest.insight}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* Playbook tile — retention drawer entry point: current state + one-tap link. */
function PlaybookTile({
  active,
  delegations,
}: {
  active: number;
  delegations: { active: number; expiringSoon: number };
}) {
  return (
    <div className="surface-card bg-bg-surface p-5 flex flex-col gap-3">
      <SectionHeader
        label="Playbook"
        hint={
          active > 0
            ? `${active} active emergency${active > 1 ? "s" : ""}`
            : "No active emergencies"
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <PulseTile
          label="Active delegations"
          value={delegations.active}
          reference={delegations.expiringSoon}
          referenceLabel="expiring soon"
        />
        <PulseTile label="Emergencies" value={active} higherIsBetter={false} />
      </div>
      <a
        href="/principal/emergency"
        className="text-sm font-medium text-action-primary underline-offset-2 hover:underline"
      >
        Open the command plane →
      </a>
    </div>
  );
}

/* Decision-pace "story" card. Uses StoryChart when the digest carries a weekly
 * series; until the backend follow-up adds `series`, it shows the insight +
 * KPIs as the story. (Kept as a thin projection; no data is invented.) */
function DecisionPaceDigest({ digest }: { digest?: DigestResponse | null }) {
  const points = digest?.series ?? [];
  return (
    <div className="flex flex-col gap-3">
      <StoryChart points={points} label="Decisions · last 7 days" />
      {digest?.avgDecision ? (
        <p className="text-sm text-text-muted">
          Average decision this week:{" "}
          <span className="font-medium text-text-primary">{digest.avgDecision}</span>
          {digest.slaAdherence != null ? (
            <> · SLA adherence {digest.slaAdherence}%</>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
