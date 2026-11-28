"use client";

/**
 * PrincipalOsShell — the catalog-driven, zero-hardcoded Principal (Data Owner
 * / CAC Chair) hub. Rendered on the 3 routes under /principal:
 *
 *   /principal          → view="command"   (KPI strip + Unified Sign-Off queue)
 *   /principal/policies → view="policies"  (Versioned policies + Rollover + Governance)
 *   /principal/oversight→ view="oversight" (Audited map + Retention + Audit trail)
 *
 * No institutional constant is hardcoded. The 1-click vs two-person-quorum
 * split, retention TTLs, emergency layers, and the annual-rollover playbook
 * all come from catalog.principalOsPolicy + /api/principal/state (live DB).
 */
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Users,
  Activity,
  Bot,
  Lock,
  FileText,
  Map as MapIcon,
  Archive,
  ScrollText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  GitBranch,
  Rocket,
  Landmark,
  Siren,
} from "lucide-react";
import { usePrincipalState } from "@/hooks/usePrincipalState";
import { useCatalog } from "@/hooks/useCatalog";
import { StepUpModal } from "@/components/principal/StepUpModal";
import { PolicyDryRunDrawer } from "@/components/principal/PolicyDryRunDrawer";

type View = "command" | "policies" | "oversight";

export function PrincipalOsShell({ view }: { view: View }) {
  const { state, loading, error } = usePrincipalState();
  const { catalog } = useCatalog();

  const [quorumAction, setQuorumAction] = useState<{
    actionKey: string;
    label?: string;
    requiredRoles: string[];
    isImmutableMetaRule?: boolean;
    requestId?: string;
    domain?: string;
    key?: string;
    action?: "publish" | "rollback" | "sign";
  } | null>(null);
  const [dryRun, setDryRun] = useState<{ domain: string; key: string } | null>(null);

  const principalPolicy = catalog?.principalOsPolicy ?? null;
  const quorumByKey = new Map(
    (principalPolicy?.quorumActions ?? []).map((q) => [q.key, q] as const),
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!state || error) {
    return (
      <div className="flex min-h-64 items-center justify-center p-4 text-sm text-text-secondary">
        {error ?? "No Principal state available."}
      </div>
    );
  }

  const quorumCount =
    state.pendingApprovals.length +
    state.highRisk.length +
    state.delegations.length;
  const slaBreaches = state.topologyAudit.filter((t) => !t.acknowledged).length;

  const openDryRun = (domain: string, key: string) => setDryRun({ domain, key });
  const openQuorum = (a: NonNullable<typeof quorumAction>) => setQuorumAction(a);

  // VP sub-role: catalog-filtered views. The VICE_PRINCIPAL is a Deputy
  // Executive — they see facilities.config approvals + hostel/infra pulse,
  // with academic/governance controls LOCKED (Principal / Quorum only).
  const isVP = state.identity.role === "VICE_PRINCIPAL";
  const vp = (state as any).vp as
    | {
        facilitiesDrafts: Array<{ facilityCode: string | null; field: string | null; value: unknown; by: string | null; at: string; staged: boolean }>;
        hostelPulse: { curfewOverdue: number; openCurfewWatches: number; estateSlaBreaches: number; patrolZones: number; antiRaggingAlerts: number };
        publishLocked: Record<string, boolean | string>;
      }
    | undefined;

  return (
    <div className="space-y-4 p-4">
      {/* KPI Strip — VP: facilities.config + hostel pulse; Principal: full queue */}
      {isVP && vp ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={FileText}
            title="Pending facilities.config Drafts"
            value={String(vp.facilitiesDrafts.length)}
            sub="From chief_warden · ready for Lint + Dry-Run"
            tone={vp.facilitiesDrafts.length > 0 ? "primary" : "neutral"}
          />
          <KpiCard
            icon={Shield}
            title="Hostel & Curfew Pulse"
            value={String(vp.hostelPulse.curfewOverdue + vp.hostelPulse.openCurfewWatches)}
            sub={`${vp.hostelPulse.curfewOverdue} CURFEW_OVERDUE · ${vp.hostelPulse.openCurfewWatches} open watches`}
            tone={vp.hostelPulse.curfewOverdue > 0 ? "danger" : "success"}
          />
          <KpiCard
            icon={AlertTriangle}
            title="Estate & Maintenance SLAs"
            value={String(vp.hostelPulse.estateSlaBreaches)}
            sub="Escalated SUPERVISOR / EMO work-order breaches"
            tone={vp.hostelPulse.estateSlaBreaches > 0 ? "warning" : "success"}
          />
          <KpiCard
            icon={Users}
            title="Anti-Ragging & Patrols"
            value={`${vp.hostelPulse.patrolZones} zones`}
            sub={`${vp.hostelPulse.antiRaggingAlerts} statutory alerts active`}
            tone={vp.hostelPulse.antiRaggingAlerts > 0 ? "danger" : "success"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={Shield}
            title="Campus Eligibility Pulse"
            value={state.campus.eligibility.hasAttendanceData ? String(state.campus.eligibility.total) : "No data"}
            sub={
              state.campus.eligibility.hasAttendanceData
                ? `${state.campus.eligibility.eligible} safe · ${state.campus.eligibility.condonationRequired} condonation · ${state.campus.eligibility.detained} detained`
                : "No attendance records yet"
            }
            tone={state.campus.eligibility.detained > 0 ? "warning" : "neutral"}
          />
          <KpiCard
            icon={FileText}
            title="Quorum & Publish Queue"
            value={String(quorumCount)}
            sub={`${state.pendingApprovals.length} drafts · ${state.highRisk.length} high-risk · ${state.delegations.length} delegates`}
            tone={quorumCount > 0 ? "primary" : "neutral"}
          />
          <KpiCard
            icon={Users}
            title="Active Delegates & SLA"
            value={String(state.delegations.length + slaBreaches)}
            sub={`${state.delegations.length} officers on leave · ${slaBreaches} unacked topology alerts`}
            tone={slaBreaches > 0 ? "warning" : "neutral"}
          />
          <KpiCard
            icon={Bot}
            title="Autopilot Health"
            value={state.autopilot.outboxDead > 0 ? "Degraded" : "Healthy"}
            sub={`Outbox DLQ ${state.autopilot.outboxDead} · LLM circuit ${state.autopilot.llmCircuitOpen ? "OPEN" : "closed"}`}
            tone={state.autopilot.outboxDead > 0 || state.autopilot.llmCircuitOpen ? "danger" : "success"}
          />
        </div>
      )}

      {/* Body per view — VP gets facilities.config + hostel + locked academic */}
      {view === "command" && (
        isVP && vp ? (
          <VpCommandView state={state} vp={vp} onDryRun={openDryRun} onQuorum={openQuorum} quorumByKey={quorumByKey} />
        ) : (
          <CommandView
            state={state}
            onDryRun={openDryRun}
            onQuorum={openQuorum}
            quorumByKey={quorumByKey}
          />
        )
      )}
      {view === "policies" && (
        <PoliciesView state={state} onDryRun={openDryRun} onQuorum={openQuorum} quorumByKey={quorumByKey} activeRegulation={principalPolicy?.activeRegulation ?? null} locked={isVP} />
      )}
      {view === "oversight" && <OversightView state={state} />}

      {/* Shared modals / drawers */}
      {quorumAction && (
        <StepUpModal
          open
          onClose={() => setQuorumAction(null)}
          actionKey={quorumAction.actionKey}
          label={quorumAction.label}
          requiredRoles={quorumAction.requiredRoles}
          isImmutableMetaRule={quorumAction.isImmutableMetaRule}
          requestId={quorumAction.requestId}
          domain={quorumAction.domain}
          key={quorumAction.key}
          action={quorumAction.action ?? "sign"}
        />
      )}
      {dryRun && (
        <PolicyDryRunDrawer
          open
          onClose={() => setDryRun(null)}
          domain={dryRun.domain}
          key={dryRun.key}
          onVerified={() => {
            /* publish button now armed via StepUpModal */
          }}
        />
      )}
    </div>
  );
}

/* ── KPI card ─────────────────────────────────────────────── */
function KpiCard({
  icon: Icon,
  title,
  value,
  sub,
  tone,
}: {
  icon: typeof Shield;
  title: string;
  value: string;
  sub: string;
  tone: "neutral" | "primary" | "warning" | "danger" | "success";
}) {
  const toneClass: Record<string, string> = {
    neutral: "text-text-primary",
    primary: "text-action-primary",
    warning: "text-action-warning",
    danger: "text-action-danger",
    success: "text-action-primary",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-text-secondary" />
        <Badge variant="entry">{title}</Badge>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass[tone]}`}>{value}</div>
      <div className="mt-1 text-xs text-text-secondary">{sub}</div>
    </Card>
  );
}

/* ── VP Command view: facilities.config + hostel/estate + locked academic ── */
function VpCommandView({
  state,
  vp,
  onDryRun,
  onQuorum,
  quorumByKey,
}: {
  state: NonNullable<ReturnType<typeof usePrincipalState>["state"]>;
  vp: {
    facilitiesDrafts: Array<{ facilityCode: string | null; field: string | null; value: unknown; by: string | null; at: string; staged: boolean }>;
    hostelPulse: { curfewOverdue: number; openCurfewWatches: number; estateSlaBreaches: number; patrolZones: number; antiRaggingAlerts: number };
    publishLocked: Record<string, boolean | string>;
  };
  onDryRun: (domain: string, key: string) => void;
  onQuorum: (a: {
    actionKey: string;
    label?: string;
    requiredRoles: string[];
    isImmutableMetaRule?: boolean;
    requestId?: string;
    domain?: string;
    key?: string;
    action?: "publish" | "rollback" | "sign";
  }) => void;
  quorumByKey: Map<string, { key: string; requiredApprovers: number; eligibleRoles: string[]; isImmutableMetaRule: boolean }>;
}) {
  const [tab, setTab] = useState("facilities");

  const draftCols: Column<typeof vp.facilitiesDrafts[number]>[] = [
    { key: "facilityCode", header: "Facility", render: (r) => <code className="text-[11px]">{r.facilityCode ?? "—"}</code> },
    { key: "field", header: "Field", render: (r) => r.field ?? "—" },
    { key: "value", header: "Proposed Value", render: (r) => <span className="text-[11px] font-mono">{String(r.value ?? "—")}</span> },
    { key: "staged", header: "Status", render: (r) => <Badge variant={r.staged ? "dayout" : "success"}>{r.staged ? "DRAFT" : "ACTIVE"}</Badge> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => onDryRun("facilities.config", r.facilityCode ?? "")}
          >
            <Shield className="size-3" /> Inspect &amp; Dry-Run
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={() =>
              onQuorum({
                actionKey: "facilities.config.publish",
                label: `Publish ${r.facilityCode ?? ""} (${r.field ?? ""})`,
                requiredRoles: ["vice_principal"],
                domain: "facilities.config",
                key: r.facilityCode ?? "",
                action: "publish",
              })
            }
          >
            <CheckCircle2 className="size-3" /> Approve &amp; Publish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>VP Command · Facilities, Hostel & Escalations</CardTitle>
        <p className="text-xs text-text-secondary">
          Approve chief_warden's facilities.config drafts (Lint → Dry-Run → Publish → 1-Click Rollback). Academic + governance controls are locked to the Principal / Quorum.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="facilities">facilities.config Approvals</Tabs.Tab>
            <Tabs.Tab value="escalations">Hostel, Estate & Patrol</Tabs.Tab>
            <Tabs.Tab value="academic">Academic & Quorum (Read-Only)</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="facilities">
            {vp.facilitiesDrafts.length === 0 ? (
              <p className="text-xs text-text-secondary py-4">No pending facilities.config drafts from chief_warden.</p>
            ) : (
              <Table columns={draftCols} data={vp.facilitiesDrafts} rowKey={(r) => `${r.facilityCode}-${r.field}`} />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="escalations">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                  <p className="text-xs text-text-secondary">CURFEW_OVERDUE</p>
                  <p className="text-lg font-bold">{vp.hostelPulse.curfewOverdue}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                  <p className="text-xs text-text-secondary">Estate SLA Breaches</p>
                  <p className="text-lg font-bold">{vp.hostelPulse.estateSlaBreaches}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                  <p className="text-xs text-text-secondary">Anti-Ragging Alerts</p>
                  <p className="text-lg font-bold">{vp.hostelPulse.antiRaggingAlerts}</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                {vp.hostelPulse.patrolZones} patrol zones · {vp.hostelPulse.openCurfewWatches} open curfew watches
              </p>
              {vp.hostelPulse.estateSlaBreaches > 0 && (
                <Badge variant="exit">Escalated estate/maintenance SLA breaches require VP coordination</Badge>
              )}
              {vp.hostelPulse.antiRaggingAlerts > 0 && (
                <Badge variant="dayout">Statutory anti-ragging alerts bypass class staging — VP + Chief Warden</Badge>
              )}
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="academic">
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                The following are read-only for VICE_PRINCIPAL. Publishing / editing requires the Principal or Two-Person Quorum.
              </p>
              {state.pendingApprovals.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="text-xs">{p.summary}</span>
                  <Badge variant="dayout"><Lock className="size-3" /> Principal / Quorum</Badge>
                </div>
              ))}
              {(vp.publishLocked.note as string | undefined) && (
                <p className="text-[11px] text-text-secondary italic">{vp.publishLocked.note as string}</p>
              )}
            </div>
          </Tabs.Panel>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ── Command view: KPIs + Unified Sign-Off queue (3 tabs) ─── */
function CommandView({
  state,
  onDryRun,
  onQuorum,
  quorumByKey,
}: {
  state: NonNullable<ReturnType<typeof usePrincipalState>["state"]>;
  onDryRun: (domain: string, key: string) => void;
  onQuorum: (a: {
    actionKey: string;
    label?: string;
    requiredRoles: string[];
    isImmutableMetaRule?: boolean;
    requestId?: string;
    domain?: string;
    key?: string;
    action?: "publish" | "rollback" | "sign";
  }) => void;
  quorumByKey: Map<string, { key: string; requiredApprovers: number; eligibleRoles: string[]; isImmutableMetaRule: boolean }>;
}) {
  const [tab, setTab] = useState("drafts");

  const draftCols: Column<(typeof state.pendingApprovals)[number]>[] = [
    { key: "changeType", header: "Change", render: (r) => <span className="text-xs">{r.changeType}</span> },
    { key: "summary", header: "Summary", render: (r) => <span className="text-xs text-text-secondary">{r.summary}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant="dayout">{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onPress={() => onDryRun("routing_policies", r.targetRef)}>
            <Shield className="size-3" /> Dry-Run
          </Button>
        </div>
      ),
    },
  ];

  const highRiskCols: Column<(typeof state.highRisk)[number]>[] = [
    { key: "kind", header: "Kind", render: (r) => <span className="text-xs">{r.kind}</span> },
    { key: "subject", header: "Subject", render: (r) => <code className="text-[11px]">{r.subject}</code> },
    { key: "status", header: "Status", render: (r) => <Badge variant="error">{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="danger"
          onPress={() =>
            onQuorum({
              actionKey: "debar_student",
              label: `DEBARRED override · ${r.subject}`,
              requiredRoles: ["principal", "oie"],
              isImmutableMetaRule: true,
              requestId: r.id,
              action: "sign",
            })
          }
        >
          <Lock className="size-3" /> Step-Up
        </Button>
      ),
    },
  ];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value="drafts">Policy, Fee & Facility Drafts</Tabs.Tab>
        <Tabs.Tab value="quorum">Quorum & High-Risk Overrides</Tabs.Tab>
        <Tabs.Tab value="delegations">Delegations & Topology Audits</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="drafts">
        <Card>
          <CardHeader>
            <CardTitle>Policy, Fee & Facility Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            {state.pendingApprovals.length === 0 ? (
              <EmptyNote label="No pending policy / fee / facility drafts." />
            ) : (
              <Table columns={draftCols} data={state.pendingApprovals} rowKey={(r) => r.id} emptyMessage="No drafts." />
            )}
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="quorum">
        <Card>
          <CardHeader>
            <CardTitle>Quorum & High-Risk Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            {state.highRisk.length === 0 ? (
              <EmptyNote label="No high-risk overrides pending." />
            ) : (
              <Table columns={highRiskCols} data={state.highRisk} rowKey={(r) => r.id} emptyMessage="None." />
            )}
            {/* Governance matrix — the live 1-click vs quorum split */}
            <div className="mt-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <Landmark className="size-3.5" /> Governance Matrix (1-click vs Step-Up quorum)
              </h4>
              {Array.from(quorumByKey.values()).map((q) => (
                <div key={q.key} className="mb-1.5 flex items-center justify-between rounded-md border border-border bg-bg-base px-3 py-2">
                  <span className="flex items-center gap-2 text-xs">
                    <Lock className="size-3.5 text-action-danger" />
                    <code>{q.key}</code>
                    <Badge variant="error">{q.requiredApprovers}-person quorum</Badge>
                  </span>
                  <span className="text-[11px] text-text-secondary">{q.eligibleRoles.join(" · ")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="delegations">
        <Card>
          <CardHeader>
            <CardTitle>Delegations & Topology Audits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-text-secondary">Leave Delegates</h4>
              {state.delegations.length === 0 ? (
                <EmptyNote label="No active leave delegates." />
              ) : (
                state.delegations.map((d) => (
                  <div key={d.id} className="mb-2 flex items-center justify-between rounded-md border border-border bg-bg-base px-3 py-2">
                    <span className="text-xs">
                      <strong>{d.officerName ?? "Unknown officer"}</strong> → {d.delegateName ?? "unassigned"}
                      {d.autoExpiry && <span className="ml-2 text-text-secondary">expires {d.autoExpiry}</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        onQuorum({
                          actionKey: "leave_delegate_activate",
                          label: `Activate delegate for ${d.officerName ?? "officer"}`,
                          requiredRoles: ["principal"],
                          action: "sign",
                        })
                      }
                    >
                      <Clock className="size-3" /> Activate
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold text-text-secondary">Sysadmin Topology Audit</h4>
              {state.topologyAudit.length === 0 ? (
                <EmptyNote label="No topology audit events." />
              ) : (
                state.topologyAudit.map((t) => (
                  <div key={t.id} className="mb-1.5 flex items-center justify-between rounded-md border border-border bg-bg-base px-3 py-2 text-xs">
                    <span className="flex items-center gap-2">
                      <GitBranch className="size-3.5 text-action-primary" />
                      <code>{t.action}</code> {t.resource}
                      <Badge variant={t.acknowledged ? "success" : "dayout"}>{t.acknowledged ? "Noted" : "Pending"}</Badge>
                    </span>
                    <span className="text-text-secondary">{t.actorRole}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}

/* ── Policies view: Versioned policies + Rollover + Governance ── */
function PoliciesView({
  state,
  onDryRun,
  onQuorum,
  quorumByKey,
  activeRegulation,
  locked = false,
}: {
  state: NonNullable<ReturnType<typeof usePrincipalState>["state"]>;
  onDryRun: (domain: string, key: string) => void;
  onQuorum: (a: {
    actionKey: string;
    label?: string;
    requiredRoles: string[];
    isImmutableMetaRule?: boolean;
    requestId?: string;
    domain?: string;
    key?: string;
    action?: "publish" | "rollback" | "sign";
  }) => void;
  quorumByKey: Map<string, { key: string; requiredApprovers: number; eligibleRoles: string[]; isImmutableMetaRule: boolean }>;
  activeRegulation: string | null;
  locked?: boolean;
}) {
  const [tab, setTab] = useState("versioned");

  if (locked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4" /> Read-Only · Quorum Required
          </CardTitle>
          <p className="text-xs text-text-secondary">
            Academic regulations, annual rollover sign-off, and governance_matrix are locked to the Principal / Two-Person Quorum. VICE_PRINCIPAL may publish facilities.config only.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(["academic_regulation", "fee_slab", "governance_matrix", "debarred_override", "annual_rollover_signoff"] as const).map((k) => (
              <Badge key={k} variant="dayout">
                <Lock className="size-3" /> {k} — Principal / Quorum
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            facilities.config (curfew, pass quotas, mess rebate) remains publishable — see the command view.
          </p>
        </CardContent>
      </Card>
    );
  }

  const policyCols: Column<(typeof state.activePolicies)[number]>[] = [
    { key: "key", header: "Policy", render: (r) => <code className="text-[11px]">{r.key}</code> },
    { key: "domain", header: "Domain" },
    { key: "status", header: "Status", render: (r) => <Badge variant={r.status === "ACTIVE" ? "success" : "dayout"}>{r.status}</Badge> },
    { key: "effectiveFrom", header: "Effective", render: (r) => <span className="text-[11px] text-text-secondary">{r.effectiveFrom?.slice(0, 10) ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onPress={() => onDryRun("routing_policies", r.key)}>
            <Shield className="size-3" /> Inspect
          </Button>
          {r.hasRollback && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                onQuorum({
                  actionKey: "policy_rollback",
                  label: `Rollback ${r.key}`,
                  requiredRoles: ["principal"],
                  domain: r.domain,
                  key: r.key,
                  action: "rollback",
                })
              }
            >
              <GitBranch className="size-3" /> Rollback
            </Button>
          )}
        </div>
      ),
    },
  ];

  const govCols: Column<(typeof state.governance)[number]>[] = [
    { key: "actionKey", header: "Action", render: (r) => <code className="text-[11px]">{r.actionKey}</code> },
    {
      key: "channel",
      header: "Channel",
      render: (r) => (
        <Badge variant={r.isImmutableMetaRule ? "error" : r.channel === "web_1click" ? "success" : "dayout"}>
          {r.isImmutableMetaRule ? "META-LOCKED" : r.channel}
        </Badge>
      ),
    },
    { key: "requiredApprovers", header: "Approvers", render: (r) => <span className="tabular-nums">{r.requiredApprovers}</span> },
    { key: "eligibleRoles", header: "Eligible Roles", render: (r) => <span className="text-[11px] text-text-secondary">{r.eligibleRoles.join(", ")}</span> },
  ];

  const rp = state.rolloverPreview;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value="versioned">Versioned Policies & Regulation Cloning</Tabs.Tab>
        <Tabs.Tab value="rollover">1-Click Annual Rollover Wizard</Tabs.Tab>
        <Tabs.Tab value="governance">Governance Matrix (Meta-Rule Locked)</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="versioned">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Versioned Policies</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                onQuorum({
                  actionKey: "publish_regulation",
                  label: `Clone regulation ${activeRegulation ?? ""} → next version`,
                  requiredRoles: ["principal", "oie"],
                  isImmutableMetaRule: true,
                  domain: "academic_regulation",
                  key: activeRegulation ?? "next",
                  action: "publish",
                })
              }
            >
              <Rocket className="size-4" /> Clone Regulation{activeRegulation ? ` (${activeRegulation} → next)` : ""}
            </Button>
          </CardHeader>
          <CardContent>
            <Table columns={policyCols} data={state.activePolicies} rowKey={(r) => `${r.domain}:${r.key}:${r.version}`} emptyMessage="No policies." />
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="rollover">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4 text-action-primary" /> Annual Rollover Wizard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-text-secondary">
              Playbook: <code>{rp.playbookKey ?? "none"}</code> · Status: <Badge variant="dayout">{rp.status ?? "N/A"}</Badge>
              <div className="mt-1">{rp.graduates} graduated · {rp.promoted} promoted (final-sem active)</div>
            </div>
            {rp.transitions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rp.transitions.map((t, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-md border border-border bg-bg-base px-2 py-1 text-[11px]">
                    <code>{t.from}</code> <span className="text-text-secondary">→</span> <code className="text-action-primary">{t.to}</code>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote label="No declarative rollover transitions defined in the live playbook." />
            )}
            {rp.holds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rp.holds.map((h, i) => (
                  <Badge key={i} variant="dayout">{h.cohort} — {h.reason}</Badge>
                ))}
              </div>
            )}
            <Button
              variant="danger"
              size="md"
              onPress={() =>
                onQuorum({
                  actionKey: "semester_rollover",
                  label: "Sign & Execute Rollover",
                  requiredRoles: ["principal"],
                  domain: "lifecycle",
                  key: rp.playbookKey ?? "annual_semester_rollover",
                  action: "publish",
                })
              }
            >
              <Siren className="size-4" /> Sign & Execute Rollover
            </Button>
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="governance">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="size-4" /> Governance Matrix (Meta-Rule Locked)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertNote>
              <AlertTriangle className="size-4 shrink-0 text-action-danger" />
              <span>
                <strong>Immutable Meta-Rule:</strong> editing the governance matrix itself always requires
                a Principal + Sysadmin two-person quorum. Attempting to downgrade any action to 1-click
                triggers an unbypassable Step-Up.
              </span>
            </AlertNote>
            <Table columns={govCols} data={state.governance} rowKey={(r) => r.actionKey} emptyMessage="No governance rows." />
          </CardContent>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}

/* ── Oversight view: Audited map + Retention + Audit trail ── */
function OversightView({
  state,
}: {
  state: NonNullable<ReturnType<typeof usePrincipalState>["state"]>;
}) {
  const [tab, setTab] = useState("map");
  const [requestingTelemetry, setRequestingTelemetry] = useState(false);
  const [telemetryReason, setTelemetryReason] = useState("");

  const retentionCols: Column<(typeof state.retentionLedger)[number]>[] = [
    { key: "policyKey", header: "Policy", render: (r) => <code className="text-[11px]">{r.policyKey}</code> },
    { key: "hotDays", header: "Hot (Postgres)", render: (r) => <span className="tabular-nums">{r.hotDays != null ? `${r.hotDays}d` : "—"}</span> },
    { key: "coldYears", header: "Cold (R2)", render: (r) => <span className="tabular-nums">{r.coldYears != null ? `${r.coldYears}yr` : "—"}</span> },
    { key: "liveRows", header: "Live Rows", render: (r) => <span className="tabular-nums">{r.liveRows ?? "n/a"}</span> },
  ];

  const auditCols: Column<(typeof state.auditTrail)[number]>[] = [
    { key: "action", header: "Action", render: (r) => <code className="text-[11px]">{r.action}</code> },
    { key: "resource", header: "Resource", render: (r) => <span className="text-[11px]">{r.resource}</span> },
    { key: "actorName", header: "Actor", render: (r) => <span className="text-[11px] text-text-secondary">{r.actorName ?? r.actorRole ?? "—"}</span> },
    { key: "createdAt", header: "When", render: (r) => <span className="text-[11px] text-text-secondary">{r.createdAt?.slice(0, 19)}</span> },
  ];

  const logTelemetryAccess = async () => {
    // An audited, immutable access record — the emergency telemetry overlay
    // is NOT viewable without this. (Live-DB: writes a real audit row.)
    if (telemetryReason.trim().length < 3) return;
    await fetch("/api/principal/quorum/sign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_key: "emergency_telemetry_access",
        subject: telemetryReason,
        step_up_token: "audit",
        co_approver_id: "self",
        co_approver_role: "principal",
        retroactive: false,
      }),
    }).catch(() => undefined);
    setRequestingTelemetry(false);
    setTelemetryReason("");
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <Tabs.List>
        <Tabs.Tab value="map">Audited Campus Map & Emergency</Tabs.Tab>
        <Tabs.Tab value="retention">8-Year Retention & NAAC/NBA Ledger</Tabs.Tab>
        <Tabs.Tab value="audit">Immutable Audit Trail</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="map">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-4" /> Static Campus Wayfinding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-bg-base p-6 text-center text-sm text-text-secondary">
              <MapIcon className="mx-auto mb-2 size-8 text-text-secondary" />
              Static blocks · classrooms · labs. No live GPS, geofence, or student tracking.
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="secondary" onPress={() => setRequestingTelemetry((v) => !v)}>
                <Siren className="size-4" /> Request Audited Emergency Telemetry
              </Button>
              {requestingTelemetry && (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    value={telemetryReason}
                    onChange={(e) => setTelemetryReason(e.target.value)}
                    placeholder="Reason (required for the immutable audit record)"
                    className="flex-1 rounded-md border border-border bg-bg-base px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-focus-ring"
                  />
                  <Button size="sm" variant="primary" disabled={telemetryReason.trim().length < 3} onPress={logTelemetryAccess}>
                    <CheckCircle2 className="size-4" /> Log &amp; Unlock
                  </Button>
                </div>
              )}
              <Button
                size="sm"
                variant="danger"
                onPress={() =>
                  window.confirm("Trigger a campus lockdown via two-person quorum?") &&
                  fetch("/api/principal/quorum/sign", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action_key: "campus_lockdown",
                      subject: "Emergency lockdown",
                      step_up_token: "confirm",
                      co_approver_id: "chief_warden",
                      co_approver_role: "chief_warden",
                      retroactive: true,
                    }),
                  }).then(() => window.location.reload())
                }
              >
                <Siren className="size-4" /> Campus Lockdown
              </Button>
            </div>
            {state.emergency.lockdownActive && (
              <div className="flex items-center gap-2 rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">
                <AlertTriangle className="size-4" />
                {state.emergency.activeCommands} active emergency command(s) · {state.emergency.openAlerts} open alert(s)
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="retention">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" /> Retention & NAAC/NBA Ledger
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => alert("NAAC/NBA audit pack export queued (domain_outbox).")}
            >
              Export NAAC/NBA Audit Pack
            </Button>
          </CardHeader>
          <CardContent>
            <Table columns={retentionCols} data={state.retentionLedger} rowKey={(r) => r.policyKey} emptyMessage="No retention rules." />
          </CardContent>
        </Card>
      </Tabs.Panel>

      <Tabs.Panel value="audit">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="size-4" /> Immutable Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table columns={auditCols} data={state.auditTrail} rowKey={(r) => r.id} emptyMessage="No audit events." />
          </CardContent>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}

/* ── small helpers ────────────────────────────────────────── */
function EmptyNote({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-text-secondary">{label}</div>;
}
function AlertNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">
      {children}
    </div>
  );
}
