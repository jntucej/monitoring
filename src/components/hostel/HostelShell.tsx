"use client";

/**
 * HostelShell — the catalog-driven, zero-hardcoded Hostel & Security hub
 * (Chief Warden / Deputy Warden / Hostel Manager). Rendered on 3 routes:
 *
 *   /hostel                        → view="gate"      (KPI strip + 5-step pass
 *                                                        queue / curfew watches /
 *                                                        H0201 biometric feed)
 *   /hostel/mess-and-config        → view="mess"      (Mess Rebate Queue /
 *                                                        Billing Ledger /
 *                                                        facilities.config Studio)
 *   /hostel/bridge-and-telemetry   → view="bridge"    (Hostel Bridge &
 *                                                        Anti-Ragging /
 *                                                        Circulars / Gate
 *                                                        Telemetry)
 *
 * STEWARD BOUNDARY: the chief_warden drafts facilities.config (curfew times,
 * mess rebate minimums, outing pass schema) but NEVER solo-publishes — drafts
 * route to VP / Principal for activation. Enforced in the API layer.
 *
 * ZERO GPS: the telemetry tab shows static gate/block topology + a
 * 30m-cutoff discarded-ping counter only. No live trails / geofences /
 * biometric reader state.
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
  Home, DoorOpen, Timer, Activity,
  Utensils, ScrollText, Radio, Lock, Scale, Rocket,
  RefreshCw, AlertTriangle, CheckCircle2, Map as MapIcon,
} from "lucide-react";
import { useHostelState } from "@/hooks/useHostelState";
import type { HostelState } from "@/app/api/hostel/state/route";

type View = "gate" | "mess" | "bridge";

export function HostelShell({ view }: { view: View }) {
  const { state, loading, error, refetch } = useHostelState();
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
        <CardTitle className="flex items-center gap-2 text-danger"><AlertTriangle /> Hostel dashboard unavailable</CardTitle>
        <p className="mt-2 text-sm text-zinc-400">
          {error === "FORBIDDEN"
            ? "Access denied — requires a warden / hostel_manager role or above."
            : "The hostel state endpoint returned an error."}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onPress={refetch}>
          <RefreshCw className="mr-1 size-4" /> Retry
        </Button>
      </Card>
    );
  }

  const occ = state.occupancy;
  const occPct = occ.total > 0 ? Math.round((occ.inside / occ.total) * 100) : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Top bar: sub-role + @cej_server_bot sync + theme handled by shell */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Hostel & Security</Badge>
        <Badge variant="dayout">Sub-role: {state.identity.subRole}</Badge>
        <Badge>@cej_server_bot synced</Badge>
        {state.llmCircuitOpen && <Badge variant="error">LLM Circuit Open</Badge>}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onPress={refetch}><RefreshCw className="mr-1 size-4" /> Refresh</Button>
        </div>
      </div>

      {view === "gate" && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={Home} title="Campus Occupancy" value={`${occ.inside} in / ${occ.outside} out`} sub={`${occ.total} residents`} pct={occPct}
              note={occ.total === 0 ? "No residents allotted yet" : undefined} />
            <KpiCard icon={DoorOpen} title="Pending Pass Queue" value={String(state.pendingPasses)} sub="awaiting current step in the 5-step chain"
              note={state.pendingPasses === 0 ? "No pending passes" : undefined} />
            <KpiCard icon={Timer} title="Curfew Watches" value={`${state.curfewWatches.open} open`}
              sub={state.curfewWatches.breached > 0 ? `${state.curfewWatches.breached} CURFEW_OVERDUE` : "no breaches"}
              note={state.curfewWatches.breached > 0 ? "Crimson: overdue curfew alerts fired" : undefined} />
            <KpiCard icon={Activity} title="H0201 Anomalies" value={String(state.hardwareAnomalies.total)} sub="non-blocking UNMATCHED tags"
              note={state.hardwareAnomalies.total === 0 ? "No anomalies" : undefined} />
          </div>
          <Card>
            <Tabs value="passes">
              <Tabs.List>
                <Tabs.Tab value="passes"><DoorOpen className="mr-1 size-4" /> 5-Step Pass Queue</Tabs.Tab>
                <Tabs.Tab value="curfew"><Timer className="mr-1 size-4" /> Curfew Watches</Tabs.Tab>
                <Tabs.Tab value="bio"><Activity className="mr-1 size-4" /> H0201 Biometric Feed</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="passes"><PassQueueState passes={state.gatePasses} onInspect={refetch} onOneClick={() => void oneClickPass(state)} /></Tabs.Panel>
              <Tabs.Panel value="curfew"><CurfewWatchesState returns={state.curfewReturns} watches={state.curfewWatches} curfewTimes={state.facilitiesConfig.curfewTimes} /></Tabs.Panel>
              <Tabs.Panel value="bio"><BiometricFeedState feed={state.biometricFeed} hardwareProfile={state.facilitiesConfig.hardwareProfile} gpsCutoff={state.facilitiesConfig.gpsAccuracyCutoffM} /></Tabs.Panel>
            </Tabs>
          </Card>
        </>
      )}

      {view === "mess" && (
        <Card>
          <Tabs value="rebate">
            <Tabs.List>
              <Tabs.Tab value="rebate"><Utensils className="mr-1 size-4" /> Mess Rebate Queue</Tabs.Tab>
              <Tabs.Tab value="billing"><ScrollText className="mr-1 size-4" /> Mess & Hostel Billing Ledger</Tabs.Tab>
              <Tabs.Tab value="config"><Scale className="mr-1 size-4" /> facilities.config Studio</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="rebate"><MessRebateState ledger={state.messLedger} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="billing"><MessBillingState ledger={state.messLedger} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="config"><ConfigStudioState fac={state.facilitiesConfig} onAction={(a) => setQuorum(a)} subRole={state.identity.subRole} /></Tabs.Panel>
          </Tabs>
        </Card>
      )}

      {view === "bridge" && (
        <Card>
          <Tabs value="escalations">
            <Tabs.List>
              <Tabs.Tab value="escalations"><ScrollText className="mr-1 size-4" /> Bridge & Anti-Ragging</Tabs.Tab>
              <Tabs.Tab value="circulars"><FileTextIcon className="mr-1 size-4" /> Circulars & Recall</Tabs.Tab>
              <Tabs.Tab value="telemetry"><Radio className="mr-1 size-4" /> Gate & Perimeter Telemetry</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="escalations"><HostelBridgeState bridge={state.hostelBridge} circuitOpen={state.llmCircuitOpen} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="circulars"><CircularsState onRecall={refetch} onAction={(a) => setQuorum(a)} /></Tabs.Panel>
            <Tabs.Panel value="telemetry"><TelemetryState fac={state.facilitiesConfig} /></Tabs.Panel>
          </Tabs>
        </Card>
      )}

      <QuorumGateModal open={quorum !== null} onClose={() => setQuorum(null)} action={quorum} />
    </div>
  );
}

// ── shared KPI card ──────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, title, value, sub, pct, note }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; value: string; sub?: string; pct?: number; note?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="size-4" /><span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-400">{sub}</div>}
      {pct != null && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
          <div className="h-1.5 rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
      )}
      {note && <div className="mt-2 text-xs text-amber-400">{note}</div>}
    </Card>
  );
}

/** The Steward → Owner boundary: facilities.config / curfew / rebate drafts
 * CANNOT be solo-published by the chief_warden — they route to VP/Principal. */
function QuorumGateModal({ open, onClose, action }: {
  open: boolean; onClose: () => void;
  action: { label: string; requiredRoles: string[]; note?: string } | null;
}) {
  if (!open || !action) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md border-amber-500/40 bg-zinc-950/80 backdrop-blur">
        <CardHeader className="flex items-center gap-2 border-b border-amber-500/20">
          <Lock className="size-5 text-amber-400" /><CardTitle className="text-amber-300">VP / Principal Activation Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-zinc-300">{action.label}</p>
          <p className="text-xs text-zinc-400">Steward drafts only — activation routes to {action.requiredRoles.join(" / ")} (Steward → Owner boundary).</p>
          <div className="flex flex-wrap gap-2">{action.requiredRoles.map((r) => <Badge key={r} variant="success">{r}</Badge>)}</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onPress={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onPress={onClose}><Rocket className="mr-1 size-4" /> Submit to VP / Principal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Gate & Passes ────────────────────────────────────────────────────────────
function PassQueueState({ passes, onInspect, onOneClick }: {
  passes: HostelState["gatePasses"]; onInspect: () => void; onOneClick: () => void;
}) {
  const cols: Array<Column<HostelState["gatePasses"][number]>> = [
    { key: "roll", header: "Roll", render: (r) => r.roll },
    { key: "reason", header: "Reason", render: (r) => r.reason },
    { key: "guardianStatus", header: "Parent", render: (r) => <Badge variant={r.guardianStatus === "PENDING" ? "dayout" : "success"}>{r.guardianStatus}</Badge> },
    { key: "adminStatus", header: "Warden", render: (r) => <Badge variant={r.adminStatus === "PENDING" ? "dayout" : "success"}>{r.adminStatus}</Badge> },
    { key: "finalStatus", header: "Final", render: (r) => <Badge variant={r.finalStatus === "PENDING" ? "error" : "success"}>{r.finalStatus}</Badge> },
  ];
  if (passes.length === 0) return <EmptyNote text="No gate passes in the queue." />;
  return (
    <div className="space-y-3">
      <Table data={passes} columns={cols} onRowClick={onInspect} />
      {passes.some((p) => p.finalStatus === "PENDING" && p.telegramOneClick) && (
        <Button variant="primary" size="sm" onPress={onOneClick}><Radio className="mr-1 size-4" /> 1-Click Telegram Approve (pending passes)</Button>
      )}
    </div>
  );
}

function CurfewWatchesState({ returns, watches, curfewTimes }: {
  returns: HostelState["curfewReturns"]; watches: HostelState["curfewWatches"]; curfewTimes: HostelState["facilitiesConfig"]["curfewTimes"];
}) {
  return (
    <div className="space-y-4">
      {curfewTimes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {curfewTimes.map((c) => (
            <Badge key={c.facility} variant="dayout">{c.name}: {c.curfew ?? "TBD"}</Badge>
          ))}
        </div>
      )}
      {watches.breached > 0 && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle className="mr-1 inline size-4" /> {watches.breached} CURFEW_OVERDUE — parent + warden alerts fired automatically.
        </div>
      )}
      {returns.length === 0 ? (
        <EmptyNote text="No curfew returns logged yet. Verified GATE_OUT punches open a CURFEW_RETURN watch; a valid GATE_IN closes it." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {returns.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-800 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-200">{r.roll ?? "—"}</span>
                <Badge variant={r.compliant === "ON_TIME" ? "success" : "error"}>{r.compliant}</Badge>
              </div>
              <p className="mt-1 text-zinc-500">{r.leaveType} · due {r.expectedReturn}{r.actualReturn ? ` · back ${r.actualReturn}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BiometricFeedState({ feed, hardwareProfile, gpsCutoff }: {
  feed: HostelState["biometricFeed"]; hardwareProfile: string | null; gpsCutoff: number | null;
}) {
  if (feed.length === 0) return <EmptyNote text="No H0201 terminal events in the feed yet. Repeated punches within 300s dedupe silently; offline catch-up enforces monotonic punch_at." />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">H0201 = ground truth. GPS pings &gt; {gpsCutoff ?? 30}m accuracy are discarded. Hardware profile: <code>{hardwareProfile ?? "n/a"}</code></p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {feed.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-2 text-xs">
            <span className="text-zinc-300">{f.device} · {f.punchType}</span>
            <Badge variant={f.idempotency === "ACCEPTED" ? "success" : "dayout"}>{f.idempotency}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mess & Config ────────────────────────────────────────────────────────────
function MessRebateState({ ledger, onAction }: {
  ledger: HostelState["messLedger"]; onAction: (a: { label: string; requiredRoles: string[]; note?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Rebates auto-validate against the catalog minimum: <strong className="text-zinc-200">
          {ledger.rebateMinConsecutiveDays != null ? `≥ ${ledger.rebateMinConsecutiveDays} consecutive mess-days` : "minimum not configured (no data)"}
        </strong>.
      </p>
      {ledger.reconciliation.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ledger.reconciliation.map((r) => (
            <div key={r.day} className="rounded-lg border border-zinc-800 p-3 text-xs">
              <div className="flex items-center justify-between"><span className="text-zinc-300">{r.day}</span><Badge variant="entry">{r.anomalies} anomalies</Badge></div>
              <p className="mt-1 text-zinc-500">issued {r.issued} · consumed {r.consumed} · {r.boarders} boarders</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyNote text="No mess rebate requests open. Approve / reject recalculates monthly mess dues live." />
      )}
      <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Approve / reject mess rebate", requiredRoles: ["chief_warden", "principal"] })}>
        <Utensils className="mr-1 size-4" /> Approve / Reject Rebate
      </Button>
    </div>
  );
}

function MessBillingState({ ledger, onAction }: {
  ledger: HostelState["messLedger"]; onAction: (a: { label: string; requiredRoles: string[] }) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Monthly = Room Rent + Maintenance + (Daily Mess Rate × Active Days) − Approved Rebates.
        Synced to Student Fees & the OIE Hall Ticket Dues Gate.
      </p>
      {ledger.counters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ledger.counters.map((c) => <Badge key={c.block} variant={c.active ? "success" : "dayout"}>{c.block} {c.active ? "active" : "inactive"}</Badge>)}
        </div>
      )}
      <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Post monthly mess bill adjustment", requiredRoles: ["hostel_manager", "principal"] })}>
        <ScrollText className="mr-1 size-4" /> Post Bill Adjustment
      </Button>
    </div>
  );
}

function ConfigStudioState({ fac, onAction, subRole }: {
  fac: HostelState["facilitiesConfig"]; onAction: (a: { label: string; requiredRoles: string[]; note?: string }) => void; subRole: string;
}) {
  const readOnly = subRole === "hostel_manager";
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Steward drafts curfew timings, mess rebate minimums, or new <code>outing_pass</code> JSON-Schema fields
        (e.g. "Train Ticket Upload"). {readOnly ? "Read-only for Hostel Manager — Chief Warden drafts, VP/Principal activates." : "Chief Warden drafts; activation routes to VP / Principal (no solo-publish)."}
      </p>
      <div className="flex flex-wrap gap-2">
        {fac.curfewTimes.map((c) => <Badge key={c.facility} variant="dayout">{c.name}: {c.curfew ?? "TBD"}</Badge>)}
      </div>
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Draft curfew change", requiredRoles: ["chief_warden", "principal"], note: "Steward → Owner: VP/Principal activation." })}>Edit Curfew</Button>
          <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Draft mess rebate minimum", requiredRoles: ["chief_warden", "principal"] })}>Edit Rebate Min</Button>
          <Button variant="primary" size="sm" onPress={() => onAction({ label: "Lint & Dry-Run facilities.config draft", requiredRoles: ["chief_warden", "vice_principal"], note: "DRY_RUN_VERIFIED → submit to VP/Principal." })}>
            <Scale className="mr-1 size-4" /> Lint & Dry-Run → Submit
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Bridge & Telemetry ───────────────────────────────────────────────────────
function HostelBridgeState({ bridge, circuitOpen, onAction }: {
  bridge: HostelState["hostelBridge"]; circuitOpen: boolean;
  onAction: (a: { label: string; requiredRoles: string[] }) => void;
}) {
  return (
    <div className="space-y-4">
      {circuitOpen && <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300"><AlertTriangle className="mr-1 inline size-4" /> LLM circuit open — replies degraded / fallback.</div>}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Staged Hostel/Mess Doubts ({bridge.staged.length})</h4>
        {bridge.staged.length === 0 ? (
          <p className="text-xs text-zinc-500">No staged hostel/mess doubts. Doubts stage at hostel_manager / deputy_warden and auto-escalate to chief_warden on SLA breach.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bridge.staged.map((s) => (
              <div key={s.id} className="rounded-lg border border-zinc-800 p-3 text-xs">
                <div className="flex items-center justify-between"><span className="font-medium text-zinc-200">{s.subject}</span><Badge variant={s.slaWatch === "BREACHED" ? "error" : s.slaWatch ? "dayout" : "success"}>{s.status}{s.slaWatch ? ` · ${s.slaWatch}` : ""}</Badge></div>
                <p className="mt-1 text-zinc-500">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Direct Anti-Ragging / Emergency ({bridge.antiRagging.length})</h4>
        {bridge.antiRagging.length === 0 ? (
          <p className="text-xs text-zinc-500">No Anti-Ragging alerts. Statutory anti-ragging filings bypass staging directly.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bridge.antiRagging.map((g) => (
              <div key={g.id} className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs">
                <div className="flex items-center justify-between"><span className="font-medium text-zinc-200">{g.subject}</span><Badge variant="error">Pinned · Bypassed</Badge></div>
                <p className="mt-1 text-zinc-500">{new Date(g.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Reply / resolve SLA on staged doubt", requiredRoles: ["deputy_warden", "chief_warden"] })}>
        <ScrollText className="mr-1 size-4" /> Reply / Resolve SLA
      </Button>
      <p className="text-xs text-zinc-500">Sensitive categories (<code>medical</code>, <code>disciplinary</code>, <code>fees</code>, <code>ragging</code>) hard-lock the public broadcast toggle off (Private DM only).</p>
    </div>
  );
}

function CircularsState({ onRecall, onAction }: { onRecall: () => void; onAction: (a: { label: string; requiredRoles: string[] }) => void }) {
  return (
    <div className="space-y-3">
      <EmptyNote text="Hostel circulars (notices, timetables) appear here with 1-click Recall & Corrigendum (SUPERSEDED + RAG tombstone)." />
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onPress={onRecall}><RefreshCw className="mr-1 size-4" /> Recall & Issue Corrigendum</Button>
        <Button variant="secondary" size="sm" onPress={() => onAction({ label: "Issue hostel circular", requiredRoles: ["hostel_manager", "chief_warden"] })}>Issue Hostel Circular</Button>
      </div>
    </div>
  );
}

function TelemetryState({ fac }: { fac: HostelState["facilitiesConfig"] }) {
  // Static gate/block topology only — zero live GPS / geofence / reader state.
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {fac.curfewTimes.map((c) => (
          <div key={c.facility} className="rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between text-sm"><span className="text-zinc-200">{c.name}</span><Badge variant="success">online</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">{c.curfew ? `curfew ${c.curfew}` : "no curfew"} · {c.audience ?? "all"}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        GPS pings with accuracy &gt; <strong className="text-zinc-300">{fac.gpsAccuracyCutoffM ?? 30}m</strong> are discarded.
        H0201 terminals are ground truth. No live trails / geofences / reader state shown.
      </p>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">{text}</div>;
}

function FileTextIcon({ className }: { className?: string }) {
  return <ScrollText className={className} />;
}

async function oneClickPass(state: HostelState) {
  try {
    const pending = state.gatePasses.find((p) => p.finalStatus === "PENDING" && p.telegramOneClick);
    if (!pending) return;
    await fetch("/api/hostel/passes/action", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CHIEF_WARDEN_SIGN", passId: pending.id, oneClick: true }),
    });
  } catch { /* handled by refetch */ }
}
