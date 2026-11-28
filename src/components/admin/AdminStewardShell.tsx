"use client";

/**
 * AdminStewardShell — the catalog-driven, zero-hardcoded ADMIN (Office Data
 * Steward & Delegation Controller) hub. Rendered on 2 routes under /admin:
 *
 *   /admin           → view="command"  (KPI strip + Leave Delegates / Office
 *                                       Circulars / Accounts & Challan tabs)
 *   /admin/steward   → view="steward"  (Fee Slabs & Regulation Drafts / Annual
 *                                       Rollover Staging / Scope Boundaries &
 *                                       Static Map)
 *
 * STEWARD BOUNDARY: the ADMIN drafts + lints + dry-runs; it NEVER solo-publishes
 * regulations, fee thresholds, or DEBARRED overrides — those route to the
 * Principal QuorumGate (StepUpModal + two-person quorum). ADMIN cannot execute
 * SYSADMIN 1-Click Topology or edit governance_matrix.
 *
 * No institutional constant is hardcoded. Fee slabs, timeout_hours, retention
 * TTLs, and nav items all come from /api/config/catalog + the live DB.
 */

import { useCallback, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AdminHarnessPill, AdminHarnessDrawer } from "@/components/admin/AdminHarnessDrawer";
import { useAdminStewardState, type AdminStewardState } from "@/hooks/useAdminStewardState";

export type AdminStewardView = "command" | "steward";

export function AdminStewardShell({ view }: { view: AdminStewardView }) {
  const [harnessOpen, setHarnessOpen] = useState(false);
  const { state, loading, error, refresh } = useAdminStewardState();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ADMIN · Office Steward</h1>
            <p className="text-sm text-zinc-400">Loading catalog + live state…</p>
          </div>
          <AdminHarnessPill onClick={() => setHarnessOpen(true)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28">
              <CardContent>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-64">
          <CardContent>
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">ADMIN · Office Steward</h1>
            <p className="text-sm text-zinc-400">Failed to load</p>
          </div>
          <Button variant="secondary" size="sm" onPress={refresh}>
            Retry
          </Button>
        </div>
        <EmptyState title="State unavailable" description={error ?? "Unknown error"} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ADMIN · Office Steward</h1>
          <p className="text-sm text-zinc-400">
            {view === "command"
              ? "Command, Leave Delegates & Circulars"
              : "Steward Studio: Policy Drafting, Rollover & Scope Boundaries"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="entry">
            {state.kpi.pendingDelegateActivations} pending · {state.kpi.draftsAwaitingPrincipal} drafts
          </Badge>
          <AdminHarnessPill onClick={() => setHarnessOpen(true)} />
        </div>
      </div>

      {view === "command" ? (
        <CommandView state={state} onRefresh={refresh} />
      ) : (
        <StewardView state={state} onRefresh={refresh} />
      )}

      <AdminHarnessDrawer open={harnessOpen} onClose={() => setHarnessOpen(false)} onMutated={refresh} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE 1 — /admin : Command, Leave Delegates & Circulars            */
/* ------------------------------------------------------------------ */

function CommandView({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  const [cmdTab, setCmdTab] = useState("delegates");
  const { kpi } = state;

  const kpis = [
    { label: "Pending Delegate Activations", value: kpi.pendingDelegateActivations, sub: "Officers awaiting cover", tone: kpi.pendingDelegateActivations > 0 ? "exit" : "entry" },
    { label: "Drafts Awaiting Principal", value: kpi.draftsAwaitingPrincipal, sub: "DRY_RUN_VERIFIED → Principal", tone: kpi.draftsAwaitingPrincipal > 0 ? "exit" : "entry" },
    { label: "Challan / Fee Sync", value: kpi.verifiedUtrCount, sub: `${kpi.dedupHits} dedup hits blocked`, tone: "entry" },
    { label: "8-Yr Audit Retention", value: kpi.retentionPolicies, sub: "1-yr hot → 8-yr cold R2", tone: "entry" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{k.label}</span>
                <Badge variant={k.tone as any}>{k.tone === "entry" ? "OK" : "ATTN"}</Badge>
              </div>
              <span className="text-2xl font-bold">{k.value}</span>
              <span className="text-xs text-zinc-400">{k.sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3-Tab Operations */}
      <Card>
        <CardHeader className="pb-2">
          <span className="text-lg font-bold">Operations</span>
        </CardHeader>
        <CardContent>
          <Tabs value={cmdTab} onValueChange={setCmdTab}>
            <Tabs.List>
              <Tabs.Tab value="delegates">Delegates &amp; Timeout</Tabs.Tab>
              <Tabs.Tab value="circulars">Circulars &amp; Recall</Tabs.Tab>
              <Tabs.Tab value="challan">Accounts &amp; Challan</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="delegates">
              <DelegateTab state={state} onRefresh={onRefresh} />
            </Tabs.Panel>
            <Tabs.Panel value="circulars">
              <CircularsTab state={state} onRefresh={onRefresh} />
            </Tabs.Panel>
            <Tabs.Panel value="challan">
              <ChallanTab state={state} />
            </Tabs.Panel>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1 — Leave Delegates & timeout_hours                            */
/* ------------------------------------------------------------------ */

function DelegateTab({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  const [activating, setActivating] = useState<string | null>(null);

  const activateDelegate = useCallback(
    async (id: string, expiresAt?: string) => {
      setActivating(id);
      try {
        const res = await fetch("/api/admin/steward/delegates/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "activate_delegate", delegationId: id, expiresAt }),
        });
        const data = await res.json();
        if (data.success) {
          onRefresh();
        } else {
          alert(`Failed: ${data.error ?? res.status}`);
        }
      } catch {
        alert("Network error");
      } finally {
        setActivating(null);
      }
    },
    [onRefresh],
  );

  const updateTimeout = useCallback(
    async (policyKey: string, hours: number) => {
      setActivating(`timeout-${policyKey}`);
      try {
        const res = await fetch("/api/admin/steward/delegates/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_timeout_hours", policyKey, slaTimeoutHours: hours }),
        });
        const data = await res.json();
        if (data.success) {
          onRefresh();
        } else {
          alert(`Failed: ${data.error ?? res.status}`);
        }
      } catch {
        alert("Network error");
      } finally {
        setActivating(null);
      }
    },
    [onRefresh],
  );

  if (state.pendingDelegates.length === 0 && state.activeDelegates.length === 0 && state.routingPolicies.length === 0) {
    return <EmptyState title="No delegates or routing policies" description="No pending Leave Delegate nominations, active delegates, or routing_policies found in the live DB." />;
  }

  return (
    <div className="space-y-4">
      {state.pendingDelegates.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">PENDING — awaiting ADMIN activation</p>
          <Table
            columns={[
              { key: "delegateeName", header: "Delegatee", render: (r: any) => r.delegateeName ?? r.delegateeId?.slice(0, 8) },
              { key: "role", header: "Role", render: (r: any) => <Badge variant="exit">{r.delegateeRole ?? r.role}</Badge> },
              { key: "scopeEntity", header: "Scope", render: (r: any) => r.scopeEntity ?? "—" },
              { key: "expiresAt", header: "Expiry", render: (r: any) => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—" },
              {
                key: "actions",
                header: "",
                render: (r: any) => (
                  <Button size="sm" variant="primary" isPending={activating === r.id} onPress={() => activateDelegate(r.id, r.expiresAt)}>
                    Activate
                  </Button>
                ),
              },
            ]}
            data={state.pendingDelegates}
            rowKey={(r: any) => r.id}
          />
        </div>
      )}

      {state.activeDelegates.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">ACTIVE — cover in progress</p>
          <Table
            columns={[
              { key: "delegateeName", header: "Delegatee", render: (r: any) => r.delegateeName ?? r.delegateeId?.slice(0, 8) },
              { key: "role", header: "Role", render: (r: any) => <Badge variant="entry">{r.delegateeRole ?? r.role}</Badge> },
              { key: "startsAt", header: "Starts", render: (r: any) => r.startsAt ? new Date(r.startsAt).toLocaleDateString() : "—" },
              { key: "expiresAt", header: "Expires", render: (r: any) => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—" },
            ]}
            data={state.activeDelegates}
            rowKey={(r: any) => r.id}
          />
        </div>
      )}

      {state.routingPolicies.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">ROUTING POLICIES — SLA timeout_hours</p>
          <Table
            columns={[
              { key: "policyKey", header: "Policy" },
              { key: "category", header: "Category", render: (r: any) => r.category ?? "—" },
              { key: "stage1Role", header: "Stage 1", render: (r: any) => r.stage1Role ?? "—" },
              { key: "slaTimeoutHours", header: "SLA Hrs", render: (r: any) => <span className="font-bold">{r.slaTimeoutHours ?? "—"}</span> },
              {
                key: "actions",
                header: "",
                render: (r: any) => (
                  <Button size="sm" variant="secondary" isPending={activating === `timeout-${r.policyKey}`} onPress={() => updateTimeout(r.policyKey, Math.max(1, (r.slaTimeoutHours ?? 48) + 24))}>
                    +24h
                  </Button>
                ),
              },
            ]}
            data={state.routingPolicies}
            rowKey={(r: any) => r.id}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2 — Office Circulars & Recall Cascade                          */
/* ------------------------------------------------------------------ */

function CircularsTab({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  const [recalling, setRecalling] = useState<string | null>(null);

  const recallCircular = useCallback(
    async (id: string) => {
      setRecalling(id);
      try {
        const res = await fetch("/api/admin/steward/circulars/issue-or-recall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recall", circularId: id }),
        });
        const data = await res.json();
        if (data.success) {
          onRefresh();
        } else {
          alert(`Recall failed: ${data.error ?? res.status}`);
        }
      } catch {
        alert("Network error");
      } finally {
        setRecalling(null);
      }
    },
    [onRefresh],
  );

  if (state.circulars.length === 0) {
    return <EmptyState title="No circulars" description="No office circulars found in the live DB." />;
  }

  return (
    <Table
      columns={[
        { key: "circularNo", header: "No", render: (r: any) => <span className="font-medium">{r.circularNo ?? "—"}</span> },
        { key: "title", header: "Title" },
        {
          key: "status",
          header: "Status",
          render: (r: any) => (
            <Badge variant={r.status === "PUBLISHED" ? "entry" : r.status === "RECALLED" ? "dayout" : "exit"}>{r.status}</Badge>
          ),
        },
        { key: "effectiveDate", header: "Effective", render: (r: any) => r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : "—" },
        {
          key: "actions",
          header: "",
          render: (r: any) =>
            r.status === "PUBLISHED" ? (
              <Button size="sm" variant="danger" isPending={recalling === r.id} onPress={() => recallCircular(r.id)}>
                Recall &amp; Corrigendum
              </Button>
            ) : null,
        },
      ]}
      data={state.circulars}
      rowKey={(r: any) => r.id}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3 — Accounts & Challan Reconciliation                           */
/* ------------------------------------------------------------------ */

function ChallanTab({ state }: { state: AdminStewardState }) {
  const verifiedUtrs = state.paymentReferences.filter(
    (p: any) => p.status === "VERIFIED" || p.status === "PROCESSED",
  );

  if (state.feeItems.length === 0 && state.paymentReferences.length === 0) {
    return <EmptyState title="No fee or payment data" description="No pending fee_items or payment references found in the live DB." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-400">Verified UTRs</p>
          <p className="text-lg font-bold">{verifiedUtrs.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-400">Dedup Hits Blocked</p>
          <p className="text-lg font-bold">{state.kpi.dedupHits}</p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-400">Pending Fee Items</p>
          <p className="text-lg font-bold">{state.feeItems.length}</p>
        </div>
      </div>

      {state.feeItems.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">PENDING / OVERDUE FEE ITEMS</p>
          <Table
            columns={[
              { key: "feeType", header: "Fee" },
              { key: "amount", header: "Amount (INR)", render: (r: any) => `₹${r.amount}` },
              { key: "paid", header: "Paid", render: (r: any) => `₹${r.paid}` },
              { key: "status", header: "Status", render: (r: any) => <Badge variant={r.status === "OVERDUE" ? "dayout" : "exit"}>{r.status}</Badge> },
              { key: "dueDate", header: "Due", render: (r: any) => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—" },
            ]}
            data={state.feeItems.slice(0, 20)}
            rowKey={(r: any) => `${r.feeType}-${r.id ?? "x"}`}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE 2 — /admin/steward : Steward Studio                           */
/* ------------------------------------------------------------------ */

function StewardView({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  const [stewTab, setStewTab] = useState("drafts");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <span className="text-lg font-bold">Steward Studio</span>
        </CardHeader>
        <CardContent>
          <Tabs value={stewTab} onValueChange={setStewTab}>
            <Tabs.List>
              <Tabs.Tab value="drafts">Drafts &amp; Lint</Tabs.Tab>
              <Tabs.Tab value="rollover">Rollover Staging</Tabs.Tab>
              <Tabs.Tab value="boundaries">Boundaries &amp; Map</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="drafts">
              <DraftsTab state={state} onRefresh={onRefresh} />
            </Tabs.Panel>
            <Tabs.Panel value="rollover">
              <RolloverTab state={state} onRefresh={onRefresh} />
            </Tabs.Panel>
            <Tabs.Panel value="boundaries">
              <BoundariesTab state={state} />
            </Tabs.Panel>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function DraftsTab({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  const lintAndSubmit = useCallback(
    async (draftType: string, targetRef: string) => {
      setSubmitting(draftType + targetRef);
      try {
        const res = await fetch("/api/admin/steward/drafts/lint-and-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftType, targetRef }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.data.submitted) {
            alert(`Submitted → Principal queue. ${data.data.note}`);
          } else {
            alert(`Lint failed: ${data.data.linterResults?.join("; ")}`);
          }
          onRefresh();
        } else {
          alert(`Failed: ${data.error ?? res.status}`);
        }
      } catch {
        alert("Network error");
      } finally {
        setSubmitting(null);
      }
    },
    [onRefresh],
  );

  const drafts = [
    ...state.academicRegulations.map((r: any) => ({
      type: "regulation" as const,
      ref: r.code,
      label: `Regulation ${r.code} (v${r.version ?? "?"})`,
      status: r.status,
    })),
    ...state.policyRules.map((p: any) => ({
      type: "policy_rule" as const,
      ref: p.regulationCode,
      label: `Policy rule: ${p.regulationCode} / ${p.policyCategory}`,
      status: p.ruleMetadata?.status ?? "DRAFT",
    })),
  ];

  if (drafts.length === 0) {
    return <EmptyState title="No drafts" description="No academic_regulations or policy_rule drafts found in the live DB." />;
  }

  return (
    <Table
      columns={[
        { key: "label", header: "Draft" },
        { key: "type", header: "Type", render: (r: any) => <Badge variant="exit">{r.type}</Badge> },
        {
          key: "status",
          header: "Status",
          render: (r: any) => (
            <Badge variant={r.status === "DRY_RUN_VERIFIED" ? "entry" : r.status === "PUBLISHED" ? "success" : "exit"}>{r.status}</Badge>
          ),
        },
        {
          key: "actions",
          header: "",
          render: (r: any) => (
            <Button size="sm" variant="primary" isPending={submitting === r.type + r.ref} onPress={() => lintAndSubmit(r.type, r.ref)}>
              Lint &amp; Submit
            </Button>
          ),
        },
      ]}
      data={drafts}
      rowKey={(r: any) => r.type + r.ref}
    />
  );
}

function RolloverTab({ state, onRefresh }: { state: AdminStewardState; onRefresh: () => void }) {
  if (state.lifecyclePlaybooks.length === 0) {
    return <EmptyState title="No lifecycle playbooks" description="No annual rollover playbooks found in the live DB." />;
  }

  return (
    <div className="space-y-3">
      {state.lifecyclePlaybooks.map((pb: any) => (
        <div key={pb.id} className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{pb.playbookKey} (v{pb.version ?? "?"})</span>
            <Badge variant={pb.status === "ACTIVE" ? "entry" : "exit"}>{pb.status}</Badge>
          </div>
          <p className="text-xs text-zinc-400">
            Trigger: {pb.triggerEvent ?? "—"} · {Object.keys(pb.stateGraph ?? {}).length} states in graph
          </p>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              fetch("/api/admin/steward/drafts/lint-and-submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ draftType: "rollover", targetRef: pb.playbookKey }),
              }).then((r) => r.json()).then((d) => {
                if (d.success) {
                  alert(d.data.submitted ? "Staged for Principal sign-off." : d.data.note);
                }
                onRefresh();
              });
            }}
          >
            Stage for Principal Sign-Off
          </Button>
        </div>
      ))}
    </div>
  );
}

function BoundariesTab({ state }: { state: AdminStewardState }) {
  const lockedActions = [
    { label: "add_course", owner: "SYSADMIN" },
    { label: "add_network", owner: "SYSADMIN" },
    { label: "rebuild_hierarchy", owner: "SYSADMIN" },
    { label: "governance_matrix edit", owner: "PRINCIPAL + SYSADMIN (Meta-Rule)" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-400">Outbox DLQ</p>
          <p className="text-lg font-bold">{state.kpi.dlqCount}</p>
        </div>
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
          <p className="text-xs text-zinc-400">LLM Circuit</p>
          {state.llmCircuit ? (
            <Badge variant={state.llmCircuit.circuitOpen ? "dayout" : "entry"}>
              {state.llmCircuit.circuitOpen ? "OPEN (fast-lookup fallback)" : "CLOSED (healthy)"}
            </Badge>
          ) : (
            <p className="text-xs text-zinc-400">No data</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
          LOCKED — SYSADMIN EXCLUSIVE (clicking routes to QuorumGate)
        </p>
        <div className="flex flex-wrap gap-2">
          {lockedActions.map((a) => (
            <Badge key={a.label} variant="dayout">🔒 {a.label} → {a.owner}</Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
          STATIC CAMPUS WAYFINDING (zero GPS / biometric telemetry)
        </p>
        <EmptyState
          title="Static map"
          description="Blocks, offices, and counters from facilities catalog. Live GPS trails and hostel biometric reader maps are strictly out of scope for ADMIN."
        />
      </div>
    </div>
  );
}
