"use client";

/**
 * SysadminShell — the catalog-driven, zero-hardcoded Sysadmin (System
 * Custodian) hub. Rendered on 3 routes under /sysadmin:
 *
 *   /sysadmin/kernel-health            → view="kernel"     (KPI strip +
 *                                                          Outbox DLQ / LLM
 *                                                          Circuit / Dedup+R2)
 *   /sysadmin/adapters-and-runtime     → view="adapters"   (Adapters /
 *                                                          runtime_profiles /
 *                                                          program blueprints
 *                                                          + form registry)
 *   /sysadmin/security-and-topology    → view="security"   (1-Click Topology
 *                                                          / RBAC + Quorum
 *                                                          co-sign / Hardware
 *                                                          & Network telemetry)
 *
 * CUSTODIAN BOUNDARY: the sysadmin enforces system integrity + topology. It
 * can NEVER solo-publish academic regulations / thresholds / fee slabs —
 * those render read-only with a "Custodian View Only" badge; activation is
 * the OIE/Principal Steward → Owner flow. 1-Click Topology is exclusive to
 * the sysadmin + always emits TOPOLOGY_MUTATED + a Principal audit alert.
 *
 * THE IMMUTABLE META-RULE: governance_matrix edits ALWAYS require
 * StepUpModal + Two-Person Quorum (principal + sysadmin) — hard-enforced in
 * the API (/api/sysadmin/quorum/cosign), surfaced here via QuorumGateModal.
 *
 * No reliability knob is hardcoded — runtime_profiles, the Meta-Rule action
 * split, retention TTLs, and adapter mappings all come from
 * /api/sysadmin/state + /api/config/catalog (live DB).
 */
import { useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Server, Bot, Timer, Database,
  Plug, Settings, Layers,
  Network, Lock, Shield, Activity,
  RefreshCw, AlertTriangle, CheckCircle2, Rocket, Radio,
  Eye, FlaskConical,
} from "lucide-react";
import { useSysadminState } from "@/hooks/useSysadminState";
import type { SysadminState } from "@/app/api/sysadmin/state/route";

type View = "kernel" | "adapters" | "security";

export function SysadminShell({ view }: { view: View }) {
  const { state, loading, error, refetch } = useSysadminState();
  const [quorum, setQuorum] = useState<{ label: string; requiredRoles: string[]; note?: string } | null>(null);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !state) {
    return (
      <Card className="p-6">
        <CardTitle className="flex items-center gap-2 text-danger"><AlertTriangle /> Sysadmin dashboard unavailable</CardTitle>
        <p className="mt-2 text-sm text-zinc-400">
          {error === "FORBIDDEN" ? "Access denied — the Custodian surface requires the sysadmin role." : "The sysadmin state endpoint returned an error."}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onPress={refetch}><RefreshCw className="mr-1 size-4" /> Retry</Button>
      </Card>
    );
  }

  const outbox = state.kernel.outbox;

  return (
    <div className="space-y-4 p-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Sysadmin · Custodian</Badge>
        <Badge>Catalog cache: live</Badge>
        {state.rbacQuorum.pendingQuorum.length > 0 && <Badge variant="dayout">{state.rbacQuorum.pendingQuorum.length} quorum co-sign pending</Badge>}
        {state.llmCircuitOpen && <Badge variant="error">LLM Circuit OPEN</Badge>}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onPress={refetch}><RefreshCw className="mr-1 size-4" /> Refresh</Button>
        </div>
      </div>

      {view === "kernel" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Server} title="Outbox Relay & DLQ" value={`${outbox.sent} sent`}
              sub={`${outbox.pending} pending`}
              note={outbox.deadLetter > 0 ? `${outbox.deadLetter} DEAD_LETTER` : "no dead-letter"}
              danger={outbox.deadLetter > 0} />
            <KpiCard icon={Bot} title="LLM Circuit Breaker"
              value={state.llmCircuitOpen ? "OPEN" : "CLOSED"}
              sub={state.llmCircuitOpen ? "Fast-lookup fallback · 30s probe" : "Healthy · deterministic"}
              danger={state.llmCircuitOpen} />
            <KpiCard icon={Timer} title="Deadline Sweep & Dedup"
              value={`${state.kernel.deadlineSweep.open} open`}
              sub={state.kernel.deadlineSweep.breached > 0 ? `${state.kernel.deadlineSweep.breached} breached` : "no breaches"}
              note={`${state.dedupHits.length} dedup hits inspected`} danger={state.kernel.deadlineSweep.breached > 0} />
            <KpiCard icon={Database} title="Storage & R2 Archival"
              value={`${state.kernel.retention.length} retention policies`}
              sub="30d casual / 1yr hot → 8yr cold R2" />
          </div>

          <Card>
            <Tabs value="dlq">
              <Tabs.List>
                <Tabs.Tab value="dlq"><Server className="mr-1 size-4" /> domain_outbox DLQ & Replay</Tabs.Tab>
                <Tabs.Tab value="llm"><Bot className="mr-1 size-4" /> LLM Circuit & ECA Workflows</Tabs.Tab>
                <Tabs.Tab value="dedup"><Timer className="mr-1 size-4" /> Dedup & R2 Retention</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="dlq"><DlqState dlq={state.outboxDlq} outbox={outbox} onReplay={refetch} /></Tabs.Panel>
              <Tabs.Panel value="llm"><LlmState circuit={state.kernel.llmCircuit} workflows={state.automationWorkflows} /></Tabs.Panel>
              <Tabs.Panel value="dedup"><DedupRetentionState dedup={state.dedupHits} retention={state.kernel.retention} onDryRun={refetch} /></Tabs.Panel>
            </Tabs>
          </Card>
        </>
      )}

      {view === "adapters" && (
        <Card>
          <Tabs value="adapters">
            <Tabs.List>
              <Tabs.Tab value="adapters"><Plug className="mr-1 size-4" /> integration_adapters Registry</Tabs.Tab>
              <Tabs.Tab value="runtime"><Settings className="mr-1 size-4" /> runtime_profiles & Hardware Knobs</Tabs.Tab>
              <Tabs.Tab value="blueprints"><Layers className="mr-1 size-4" /> Program Blueprints & Form Schemas</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="adapters"><AdaptersState adapters={state.adapters} onTest={refetch} /></Tabs.Panel>
            <Tabs.Panel value="runtime"><RuntimeState profiles={state.runtimeProfiles} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="blueprints"><BlueprintsState blueprints={state.programBlueprints} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
          </Tabs>
        </Card>
      )}

      {view === "security" && (
        <Card>
          <Tabs value="topology">
            <Tabs.List>
              <Tabs.Tab value="topology"><Network className="mr-1 size-4" /> 1-Click Campus Topology</Tabs.Tab>
              <Tabs.Tab value="rbac"><Shield className="mr-1 size-4" /> Dynamic RBAC & Quorum Co-Sign</Tabs.Tab>
              <Tabs.Tab value="telemetry"><Activity className="mr-1 size-4" /> Hardware & Network Telemetry</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="topology"><TopologyState onAction={refetch} /></Tabs.Panel>
            <Tabs.Panel value="rbac"><RbacQuorumState rbac={state.rbacQuorum} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="telemetry"><TelemetryState adapters={state.adapters} profiles={state.runtimeProfiles} /></Tabs.Panel>
          </Tabs>
        </Card>
      )}

      <QuorumGateModal open={quorum !== null} onClose={() => setQuorum(null)} action={quorum} />
    </div>
  );
}

// ── shared KPI ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, title, value, sub, note, danger }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; value: string; sub?: string; note?: string; danger?: boolean;
}) {
  return (
    <Card className={`p-4 ${danger ? "border-danger/40" : ""}`}>
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="size-4" /><span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : "text-zinc-100"}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-400">{sub}</div>}
      {note && <div className={`mt-2 text-xs ${danger ? "text-danger" : "text-amber-400"}`}>{note}</div>}
    </Card>
  );
}

/** The Immutable Meta-Rule: governance_matrix / RBAC / break-glass co-sign
 * CANNOT be executed solo — it routes to the Principal + Sysadmin quorum. */
function QuorumGateModal({ open, onClose, action }: {
  open: boolean; onClose: () => void;
  action: { label: string; requiredRoles: string[]; note?: string } | null;
}) {
  if (!open || !action) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md border-amber-500/40 bg-zinc-950/80 backdrop-blur">
        <CardHeader className="flex items-center gap-2 border-b border-amber-500/20">
          <Lock className="size-5 text-amber-400" /><CardTitle className="text-amber-300">StepUpModal · Two-Person Quorum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-zinc-300">{action.label}</p>
          <p className="text-xs text-zinc-400">
            Immutable Meta-Rule: 6-digit StepUp verification + typed confirm, then {action.requiredRoles.join(" + ")} quorum.
            {action.note ? ` ${action.note}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {action.requiredRoles.map((r) => <Badge key={r} variant="success">{r}</Badge>)}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onPress={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onPress={onClose}><Rocket className="mr-1 size-4" /> Verify + Co-Sign</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Kernel tabs ──────────────────────────────────────────────────────────────
function DlqState({ dlq, outbox, onReplay }: {
  dlq: SysadminState["outboxDlq"]; outbox: SysadminState["kernel"]["outbox"]; onReplay: () => void;
}) {
  const cols: Array<Column<SysadminState["outboxDlq"][number]>> = [
    { key: "eventType", header: "Event", render: (r) => r.eventType },
    { key: "attempts", header: "Attempts", render: (r) => <Badge variant={r.attempts >= 5 ? "error" : "dayout"}>{r.attempts}/5</Badge> },
    { key: "lastError", header: "Last Error", render: (r) => <span className="text-xs text-danger">{r.lastError ?? "—"}</span> },
    { key: "createdAt", header: "Created", render: (r) => <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];
  if (dlq.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyNote text="No DEAD_LETTER outbox events. The relay is healthy — replay re-triggers the exponential backoff." />
        <Button variant="secondary" size="sm" onPress={onReplay}><RefreshCw className="mr-1 size-4" /> Replay All DLQ</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Table data={dlq} columns={cols} onRowClick={() => {}} />
      <div className="flex flex-wrap gap-2">
        {dlq.slice(0, 3).map((d) => (
          <Button key={d.id} variant="secondary" size="sm" onPress={() => {
            void fetch("/api/sysadmin/outbox/replay", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "one", outboxId: d.id }) }).then(onReplay);
          }}>Replay {d.eventType.slice(0, 24)}</Button>
        ))}
        <Button variant="primary" size="sm" onPress={async () => {
          await fetch("/api/sysadmin/outbox/replay", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "all" }) });
          onReplay();
        }}><Rocket className="mr-1 size-4" /> Replay All DLQ</Button>
      </div>
      <p className="text-xs text-zinc-500">{outbox.total} total outbox events · {outbox.pending} pending · {outbox.sent} sent.</p>
    </div>
  );
}

function LlmState({ circuit, workflows }: {
  circuit: SysadminState["kernel"]["llmCircuit"]; workflows: SysadminState["automationWorkflows"];
}) {
  const cols: Array<Column<SysadminState["automationWorkflows"][number]>> = [
    { key: "key", header: "Workflow", render: (r) => r.key },
    { key: "trigger", header: "Trigger", render: (r) => <Badge variant="entry">{r.trigger}</Badge> },
    { key: "status", header: "Status", render: (r) => <Badge variant={r.status === "ACTIVE" ? "success" : "dayout"}>{r.status}</Badge> },
    { key: "pipeline", header: "Pipeline", render: (r) => <span className="text-xs text-zinc-500">{r.pipeline.length} steps</span> },
  ];
  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${circuit.open ? "border-danger/40 bg-danger/10" : "border-zinc-800"}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-200">LLM Circuit Breaker</span>
          <Badge variant={circuit.open ? "error" : "success"}>{circuit.open ? "OPEN · Fast-lookup Fallback" : "CLOSED · Healthy"}</Badge>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {circuit.open
            ? `Auto-opened after ${circuit.consecutiveFailures} consecutive failures. 30s half-open probe · deterministic verified-KB template fallback. Last probe: ${circuit.lastProbeAt ? new Date(circuit.lastProbeAt).toLocaleTimeString() : "—"}`
            : "Deterministic verified-KB templates active. 60s failure window → auto-opens."}
        </p>
      </div>
      {workflows.length > 0 ? <Table data={workflows} columns={cols} /> : <EmptyNote text="No automation workflows registered." />}
      <p className="text-xs text-zinc-500">ECA workflows: <code>trigger_event → condition_jsonlogic → action_pipeline[]</code>.</p>
    </div>
  );
}

function DedupRetentionState({ dedup, retention, onDryRun }: {
  dedup: SysadminState["dedupHits"]; retention: SysadminState["kernel"]["retention"]; onDryRun: () => void;
}) {
  const cols: Array<Column<SysadminState["kernel"]["retention"][number]>> = [
    { key: "artifactType", header: "Artifact", render: (r) => r.artifactType },
    { key: "hotTtlDays", header: "Hot (DB)", render: (r) => `${r.hotTtlDays}d` },
    { key: "coldTtlYears", header: "Cold (R2)", render: (r) => `${r.coldTtlYears}yr` },
    { key: "exportFormat", header: "Format", render: (r) => <Badge variant="entry">{r.exportFormat}</Badge> },
  ];
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Recent processed_events dedup hits ({dedup.length})</h4>
        {dedup.length === 0 ? <p className="text-xs text-zinc-500">No deduplication hits yet (biometric / SBI Collect ingress).</p> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {dedup.slice(0, 8).map((d) => (
              <div key={d.key} className="rounded-lg border border-zinc-800 p-2 text-xs">
                <div className="flex items-center justify-between"><code className="text-zinc-300">{d.key}</code><Badge variant="dayout">{d.eventType}</Badge></div>
                <p className="mt-1 text-zinc-500">{d.source} · {new Date(d.processedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Retention ledger</h4>
        {retention.length > 0 ? <Table data={retention} columns={cols} /> : <EmptyNote text="No retention policies configured." />}
        <Button variant="secondary" size="sm" className="mt-3" onPress={onDryRun}><Database className="mr-1 size-4" /> Trigger R2 Archival Dry-Run</Button>
      </div>
    </div>
  );
}

// ── Adapters & Runtime tabs ──────────────────────────────────────────────────
function AdaptersState({ adapters, onTest }: { adapters: SysadminState["adapters"]; onTest: () => void }) {
  if (adapters.length === 0) return <EmptyNote text="No integration adapters registered." />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {adapters.map((a) => (
        <div key={a.key} className="rounded-lg border border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">{a.key}</span>
            <Badge variant={a.status === "DRY_RUN_VERIFIED" || a.status === "ACTIVE" ? "success" : "dayout"}>{a.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{a.direction} · {a.transport ?? "n/a"}</p>
          {a.idempotencyTemplate && <code className="mt-1 block text-[11px] text-zinc-400">{a.idempotencyTemplate}</code>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onPress={() => {
              void fetch("/api/sysadmin/adapters/upsert-or-test", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test_payload", adapterKey: a.key, testPayload: { simulated: true } }) }).then(onTest);
            }}><Radio className="mr-1 size-4" /> Send Test Webhook</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RuntimeState({ profiles, onAction }: {
  profiles: SysadminState["runtimeProfiles"]; onAction: (a: { label: string; requiredRoles: string[] }) => void;
}) {
  if (profiles.length === 0) return <EmptyNote text="No runtime profiles registered." />;
  return (
    <div className="space-y-4">
      {profiles.map((p) => {
        const knobs = p.config as Record<string, unknown>;
        return (
          <div key={p.key} className="rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">{p.key} <Badge variant="entry">v{p.version}</Badge></span>
              <Badge variant={p.status === "ACTIVE" ? "success" : "dayout"}>{p.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(knobs).map(([k, v]) => (
                <div key={k} className="rounded-md bg-zinc-900/60 p-2 text-xs">
                  <div className="text-zinc-500">{k}</div>
                  <div className="text-sm font-medium text-zinc-200">{String(v)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Zod-validated · 1-click rollback_pointer · saves invalidate the Redis catalog.</p>
          </div>
        );
      })}
      <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Update runtime_profiles knobs", requiredRoles: ["sysadmin"] })}>
        <Settings className="mr-1 size-4" /> Edit Knobs (JsonConfigDrawer)
      </Button>
    </div>
  );
}

function BlueprintsState({ blueprints, onAction }: {
  blueprints: SysadminState["programBlueprints"]; onAction: (a: { label: string; requiredRoles: string[] }) => void;
}) {
  return (
    <div className="space-y-3">
      {blueprints.length === 0 ? <EmptyNote text="No program blueprints registered (B.Tech / M.Tech / Minor-Honours / Lateral Entry)." /> : (
        <div className="flex flex-wrap gap-2">
          {blueprints.map((bp) => <Badge key={bp.key} variant="entry">{bp.name} · {bp.key} · {bp.status}</Badge>)}
        </div>
      )}
      <p className="text-xs text-zinc-400">
        Zero-Deploy Form Registry: edit live JSON-Schema forms (<code>outing_pass</code>, <code>mess_rebate</code>, <code>spot_attendance_dispute</code>) — UI updates propagate to all roles with zero deploy.
      </p>
      <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Add program blueprint / form schema", requiredRoles: ["sysadmin"] })}>
        <Layers className="mr-1 size-4" /> Add Blueprint / Schema
      </Button>
    </div>
  );
}

// ── Security & Topology tabs ─────────────────────────────────────────────────
function TopologyState({ onAction }: { onAction: () => void }) {
  const run = (action: string, detail: Record<string, unknown>) =>
    void fetch("/api/sysadmin/topology/execute", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, detail }),
    }).then(onAction);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 p-4">
        <p className="text-xs text-zinc-400">
          1-Click Campus Topology is EXCLUSIVE to the sysadmin. Every execution emits
          <code> TOPOLOGY_MUTATED</code> → domain_outbox + an immutable audit alert to the Principal.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onPress={() => run("add_course", { year: 2026, section: "A", deptCode: "CSE" })}><Network className="mr-1 size-4" /> add_course</Button>
          <Button variant="secondary" size="sm" onPress={() => run("add_network", { detail: "nkn-lan" })}><Network className="mr-1 size-4" /> add_network</Button>
          <Button variant="secondary" size="sm" onPress={() => run("rebuild_hierarchy", { detail: "full" })}><Layers className="mr-1 size-4" /> rebuild_hierarchy</Button>
        </div>
        <p className="mt-2 text-xs text-amber-400">On success: "Topology updated · Catalog invalidated · Audit alert dispatched to Principal."</p>
      </div>
      <p className="text-xs text-zinc-500 flex items-center gap-1"><Eye className="size-3.5" /> Academic regulations / thresholds / fee slabs render <strong>Custodian View Only</strong> — the sysadmin can inspect but never solo-publish (OIE/Principal Steward → Owner).</p>
    </div>
  );
}

function RbacQuorumState({ rbac, onAction }: {
  rbac: SysadminState["rbacQuorum"]; onAction: (a: { label: string; requiredRoles: string[]; note?: string }) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Dynamic RBAC roles ({rbac.roles.length})</h4>
        <div className="flex flex-wrap gap-1.5">
          {rbac.roles.slice(0, 14).map((r) => <Badge key={r.code} variant={r.code === "sysadmin" ? "success" : "entry"}>{r.code}</Badge>)}
          {rbac.roles.length > 14 && <Badge>…{rbac.roles.length - 14} more</Badge>}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" onPress={() => onAction({ label: "Add dynamic RBAC office (e.g. dean_academics)", requiredRoles: ["sysadmin"] })}>
          <Shield className="mr-1 size-4" /> Add Role / Office
        </Button>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Pending Two-Person Quorum Co-Signatures</h4>
        {rbac.pendingQuorum.length === 0 ? (
          <p className="text-xs text-zinc-500">No pending quorum requests. governance_matrix / RBAC / break-glass lifts are drafted by the Principal and co-signed here.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rbac.pendingQuorum.map((q, i) => (
              <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                <div className="flex items-center justify-between"><span className="font-medium text-zinc-200">{q.actionKey}</span><Badge variant="dayout">pending</Badge></div>
                <p className="mt-1 text-zinc-500">drafted by {q.requestedBy ?? "principal"} · {new Date(q.createdAt).toLocaleDateString()}</p>
                <Button variant="primary" size="sm" className="mt-2" onPress={() => onAction({ label: `Co-sign ${q.actionKey} (Immutable Meta-Rule)`, requiredRoles: ["principal", "sysadmin"], note: "StepUpModal + Two-Person Quorum." })}>
                  <Lock className="mr-1 size-4" /> Co-Sign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">governance_matrix (Meta-Rule actions)</h4>
        <div className="flex flex-wrap gap-1.5">
          {rbac.governance.map((g) => (
            <Badge key={g.actionKey} variant={g.isMetaRule ? "dayout" : "entry"}>
              {g.actionKey} · {g.requiredApprovers}p · {g.channel}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function TelemetryState({ adapters, profiles }: {
  adapters: SysadminState["adapters"]; profiles: SysadminState["runtimeProfiles"];
}) {
  const gps = Number((profiles[0]?.config as Record<string, unknown>)?.gps_accuracy_cutoff_m ?? 30);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {adapters.filter((a) => a.key.includes("h0201") || a.key.includes("biometric")).map((a) => (
          <div key={a.key} className="rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between text-sm"><span className="text-zinc-200">{a.key}</span><Badge variant="success">online</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">H0201 biometric terminal · ground truth</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        GPS accuracy filter: pings &gt; <strong className="text-zinc-300">{gps}m</strong> discarded. NKN/LAN gateway filters authorized live. No live trails / geofences exposed.
      </p>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">{text}</div>;
}
