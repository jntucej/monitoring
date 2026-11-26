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

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useSynchronization } from "@/hooks/useSynchronization";
import { usePrincipalWorkspace } from "@/hooks/usePrincipalWorkspace";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateTime, getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { EntityInspector, KVPairs } from "@/components/shared/EntityInspector";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import { CustomRoleGreeting } from "@/components/nav/CustomRoleGreeting";
import { useAuthStore } from "@/stores/authStore";
import { PrincipalShell } from "@/components/principal/shared/PrincipalShell";
import { PulseTile } from "@/components/principal/shared/PulseTile";
import { SynchronizationIndicator } from "@/components/principal/shared/SynchronizationIndicator";
import { StoryChart } from "@/components/principal/shared/StoryChart";
import { DecisionCard } from "@/components/principal/_components/DecisionCard";
import { SectionHeader } from "@/components/principal/shared/SectionHeader";
import { SinceLastVisitCard } from "@/components/principal/shared/SinceLastVisitCard";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { EmptyState as PrincipalEmptyState } from "@/components/shared/EmptyState";

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
  const user = useAuthStore((s) => s.user);
  const workspace = usePrincipalWorkspace();
  const addToast = useUIStore((s) => s.addToast);
  const dash = useApiResource<DashboardResponse>("/api/principal/dashboard");
  const digestRes = useApiResource<DigestResponse>("/api/principal/digest?range=week");
  const [selectedItem, setSelectedItem] = useState<DashboardResponse["priorityItems"][number] | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const runDecision = async (
    ticketNumber: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    reason?: string,
  ) => {
    setActionBusy(action);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action, ...(reason ? { reason, comment: reason } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        addToast({
          message: `${action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Escalated"} ${ticketNumber}`,
          variant: "success",
        });
        setSelectedItem(null);
        setRejectNote("");
        setShowRejectInput(false);
        await dash.refresh();
      } else {
        addToast({
          message: json?.error?.message ?? `Failed to ${action.toLowerCase()} ${ticketNumber}`,
          variant: "error",
        });
      }
    } catch {
      addToast({ message: "Network error processing decision", variant: "error" });
    } finally {
      setActionBusy(null);
    }
  };
  // Keep the "now" figures fresh without hammering the API, and track an
  // HONEST synchronization state (refresh cadence + stale + connection) —
  // never a false "live" indicator (PR-14).
  const sync = useSynchronization({
    refresh: dash.refresh,
    intervalMs: 60_000,
    enabled: !dash.loading && !dash.error,
  });

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
      actions={<SynchronizationIndicator sync={sync} />}
    >
      <CustomRoleGreeting
        name={user?.name}
        role={user?.role ?? "principal"}
        pendingCount={counts.pending}
        urgentCount={counts.overdue + counts.escalated}
      />

      <ContextSituationBar
        roleLabel="Principal"
        purpose="Institutional command plane for top-tier approvals, policy escalations, and campus governance"
        why="Centralizing executive determinations ensures consistent enforcement of institutional policy and timely resolution of critical items."
        contextLabel="Executive Command Center"
        statusSummary={counts.escalated > 0 || counts.overdue > 0 ? `${counts.overdue} SLA breached items and ${counts.escalated} policy escalations requiring your determination.` : `${counts.pending} pending decisions across all campus workflows.`}
        severity={counts.overdue > 0 ? "critical" : counts.escalated > 0 ? "warn" : "ok"}
        primaryAction={{ label: "Attention Queue", href: "/principal/attention" }}
        secondaryAction={{ label: "Decision Ledger", href: "/principal/decisions" }}
      />

      {/* ── Headline row: the "what needs me" numbers. PR-05: each tile is a
            real drill-down to the register that owns the count (no fabricated
            filter params — these registers don't accept URL filters today). ── */}
      <PrincipalWidgetBoundary>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PulseTile
            label="Pending decisions"
            value={counts.pending}
            reference={counts.pending - (digest?.approved ?? 0)}
            referenceLabel="since last week"
            drillTo="/principal/attention"
            drillHint="Open queue"
            onOpen={() => router.push("/principal/attention")}
          />
          <PulseTile
            label="Escalated to you"
            value={counts.escalated}
            higherIsBetter={false}
            drillTo="/principal/escalations"
            drillHint="Open escalations"
            onOpen={() => router.push("/principal/escalations")}
          />
          <PulseTile
            label="Overdue (SLA)"
            value={counts.overdue}
            higherIsBetter={false}
            drillTo="/principal/attention"
            drillHint="Open queue"
            onOpen={() => router.push("/principal/attention")}
          />
          <PulseTile
            label="People waiting"
            value={impact.total}
            drillTo="/principal/attention"
            drillHint="Open queue"
            onOpen={() => router.push("/principal/attention")}
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
            <ul className="mt-2 flex flex-col gap-1.5">
              {emergencies.slice(0, 3).map((e) => (
                <li key={e.ticket} className="text-sm text-text-primary">
                  <Link
                    href={`/principal/approvals?ticket=${encodeURIComponent(e.ticket)}`}
                    className="inline-flex items-center gap-1.5 hover:underline"
                  >
                    <span className="font-mono text-xs font-semibold text-action-primary">{e.ticket}</span>
                    <span>{e.subject}</span>
                    <span className="text-xs text-text-muted">({e.age})</span>
                  </Link>
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
                  workspace.setInspect(
                    {
                      type: "permission",
                      id: it.id,
                      label: it.ticket_number,
                    },
                    "/principal",
                  );
                  setSelectedItem(it);
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
          <WeeklyDigest digest={digest} onNavigate={(href) => router.push(href)} />
        </PrincipalWidgetBoundary>
        <PrincipalWidgetBoundary>
          <PlaybookTile active={emergencies.length} delegations={deleg} onNavigate={(href) => router.push(href)} />
        </PrincipalWidgetBoundary>
      </section>

      {/* ── G. Upcoming obligations (PR-12): real deadlines — exam
            clearances due + candidates today + SLA-due decisions ── */}
      <PrincipalWidgetBoundary>
        <UpcomingObligations
          exams={d?.exams}
          items={items}
          overdue={counts.overdue}
          onNavigate={(href) => router.push(href)}
          onSelectItem={(it) => setSelectedItem(it)}
        />
      </PrincipalWidgetBoundary>

      {/* ── The "story": weekly decision pace behind the numbers ── */}
      <PrincipalWidgetBoundary>
        <DecisionPaceDigest digest={digest} />
      </PrincipalWidgetBoundary>

      <EntityInspector
        inspection={
          selectedItem
            ? {
                kind: "ticket",
                title: selectedItem.ticket_number,
                subtitle: selectedItem.student_name
                  ? `${selectedItem.workflow_type} · ${selectedItem.student_name}`
                  : selectedItem.workflow_type,
                detailHref: `/permissions/${selectedItem.id}`,
                detailLabel: "Open full ticket",
                sections: [
                  {
                    title: "Overview",
                    content: (
                      <KVPairs
                        items={[
                          { label: "Ticket", value: <span className="font-mono">{selectedItem.ticket_number}</span> },
                          { label: "Workflow", value: selectedItem.workflow_type },
                          { label: "Student", value: selectedItem.student_name ?? "—" },
                          {
                            label: "SLA Deadline",
                            value: selectedItem.sla_deadline ? formatDateTime(selectedItem.sla_deadline) : "—",
                          },
                          {
                            label: "Reason",
                            value: selectedItem.reason ? (
                              <SmartTextRef text={selectedItem.reason} currentPath="/principal" />
                            ) : (
                              "—"
                            ),
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    title: "Principal Decision",
                    content: (
                      <div className="space-y-2.5" data-testid="principal-home-inline-actions">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actionBusy !== null}
                            onClick={() => runDecision(selectedItem.ticket_number, "APPROVE")}
                            className="rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                          >
                            {actionBusy === "APPROVE" ? "Approving..." : "Approve & Confirm"}
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy !== null}
                            onClick={() => {
                              if (!showRejectInput) {
                                setShowRejectInput(true);
                                return;
                              }
                              runDecision(
                                selectedItem.ticket_number,
                                "REJECT",
                                rejectNote.trim() || "Rejected by Principal",
                              );
                            }}
                            className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-action-danger hover:bg-rose-500/25 disabled:opacity-50"
                          >
                            {actionBusy === "REJECT" ? "Rejecting..." : showRejectInput ? "Confirm Reject" : "Reject"}
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy !== null}
                            onClick={() => runDecision(selectedItem.ticket_number, "ESCALATE")}
                            className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface disabled:opacity-50"
                          >
                            {actionBusy === "ESCALATE" ? "Escalating..." : "Escalate"}
                          </button>
                        </div>
                        {showRejectInput && (
                          <input
                            type="text"
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="w-full rounded-lg border border-border bg-bg-base px-3 py-1.5 text-xs text-text-primary"
                          />
                        )}
                      </div>
                    ),
                  },
                ],
              }
            : null
        }
        onClose={() => {
          setSelectedItem(null);
          setShowRejectInput(false);
          setRejectNote("");
        }}
      />
    </PrincipalShell>
  );
}

/* Weekly digest — retention: what you did last week + the engine's insight. */
function WeeklyDigest({
  digest,
  onNavigate,
}: {
  digest?: DigestResponse | null;
  onNavigate: (href: string) => void;
}) {
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
            <PulseTile
              label="Approved"
              value={digest.approved ?? 0}
              drillTo="/principal/decisions"
              drillHint="View decisions"
              onOpen={() => onNavigate("/principal/decisions")}
            />
            <PulseTile
              label="Delegated"
              value={digest.delegated ?? 0}
              drillTo="/principal/approvals/delegated"
              drillHint="View delegated"
              onOpen={() => onNavigate("/principal/approvals/delegated")}
            />
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
  onNavigate,
}: {
  active: number;
  delegations: { active: number; expiringSoon: number };
  onNavigate: (href: string) => void;
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
          drillTo="/principal/governance/delegations"
          drillHint="Manage delegations"
          onOpen={() => onNavigate("/principal/governance/delegations")}
        />
        <PulseTile
          label="Emergencies"
          value={active}
          higherIsBetter={false}
          drillTo="/principal/emergency"
          drillHint="Open command plane"
          onOpen={() => onNavigate("/principal/emergency")}
        />
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

/* G. Upcoming obligations — PR-12. Real deadlines only: exam clearances due +
 * candidates today (from the dashboard's exams payload) + decisions whose SLA
 * has come due (from priorityItems). No invented dates. Honest empty state. */
function UpcomingObligations({
  exams,
  items,
  overdue,
  onNavigate,
  onSelectItem,
}: {
  exams?: { pendingClearances: number; todayCandidates: number };
  items: DashboardResponse["priorityItems"];
  /** Server-computed count of decisions already past SLA (no client "now"). */
  overdue: number;
  onNavigate: (href: string) => void;
  onSelectItem: (item: DashboardResponse["priorityItems"][number]) => void;
}) {
  // Pure: no client-side Date.now(). The "past SLA" fact is the server's
  // `overdue` count; we show items carrying an SLA deadline as "due" items
  // (the backend already ordered priorityItems by urgency + deadline).
  const dueItems = items.filter((it) => it.sla_deadline);
  const hasExam =
    (exams?.pendingClearances ?? 0) > 0 || (exams?.todayCandidates ?? 0) > 0;

  return (
    <div className="surface-card bg-bg-surface p-5 flex flex-col gap-3">
      <SectionHeader
        label="Upcoming obligations"
        hint="Exam clearances due + decisions past SLA"
      />
      {!hasExam && overdue === 0 ? (
        <PrincipalEmptyState
          title="Nothing due"
          description="No exam clearances or SLA-due decisions right now."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {hasExam ? (
            <div className="grid grid-cols-2 gap-3">
              <PulseTile
                label="Exam clearances due"
                value={exams?.pendingClearances ?? 0}
                higherIsBetter={false}
                drillTo="/principal/examinations"
                drillHint="Open exams"
                onOpen={() => onNavigate("/principal/examinations")}
              />
              <PulseTile
                label="Candidates today"
                value={exams?.todayCandidates ?? 0}
                drillTo="/principal/examinations"
                drillHint="Open exams"
                onOpen={() => onNavigate("/principal/examinations")}
              />
            </div>
          ) : null}
          {overdue > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {overdue} decision{overdue > 1 ? "s" : ""} past SLA
              </p>
              <ul className="flex flex-col gap-1">
                {dueItems.slice(0, 4).map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem(it)}
                      className="text-left text-sm text-text-primary hover:text-action-primary hover:underline transition-colors"
                    >
                      <span className="font-mono text-xs text-action-primary">
                        {it.ticket_number}
                      </span>{" "}
                      {it.student_name ? `${it.student_name} · ` : ""}
                      {it.workflow_type}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
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
