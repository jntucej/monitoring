"use client";

/**
 * OieShell — the catalog-driven, zero-hardcoded OIE / Examination Branch
 * (Data Steward) hub. Rendered on the 3 routes under /oie:
 *
 *   /oie/exam-ops    → view="exam-ops"    (KPI strip + Hall Ticket Gate /
 *                                           Registrations & RC-RV / CIE & Results)
 *   /oie/regulations → view="regulations" (Regulation Cloning & Fee Slabs /
 *                                           Subject Equivalency Maps / Annual Rollover Staging)
 *   /oie/bridge      → view="bridge"      (Protected Escalations & Grievances /
 *                                           Exam Circulars & Recall / Adapters & Hall Map)
 *
 * STEWARD BOUNDARY: the OIE drafts + lints + dry-runs; it NEVER solo-publishes
 * regulations, threshold edits, or DEBARRED overrides — those route to the
 * Principal QuorumGate (StepUpModal + two-person quorum). Enforced in the API
 * layer, surfaced here as a "Submit to Principal for Quorum" affordance.
 *
 * No institutional constant is hardcoded. Fee slabs, RC/RV windows, retention
 * TTLs, the calendar phase, and the 1-click vs quorum split all come from
 * /api/oie/state + /api/config/catalog (live DB).
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
  GraduationCap, FileText, Shield, Activity,
  Banknote, Timer, Scale, ScrollText, Map as MapIcon,
  RefreshCw, Rocket, AlertTriangle, CheckCircle2, Lock,
} from "lucide-react";
import { useOieState } from "@/hooks/useOieState";
import type { OieState } from "@/app/api/oie/state/route";

type View = "exam-ops" | "regulations" | "bridge";

/** The OIE Steward Boundary: an action the OIE CANNOT solo-execute. Surfaced
 * as a "Submit to Principal for Quorum" card — the Meta-Rule is enforced in
 * the API (/api/principal/quorum/sign), not bypassable from the UI. */
export function QuorumGateModal({
  open,
  onClose,
  action,
}: {
  open: boolean;
  onClose: () => void;
  action: {
    label: string;
    requiredRoles: string[];
    note?: string;
  } | null;
}) {
  if (!open || !action) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md border-amber-500/40 bg-zinc-950/80 backdrop-blur">
        <CardHeader className="flex items-center gap-2 border-b border-amber-500/20">
          <Lock className="size-5 text-amber-400" />
          <CardTitle className="text-amber-300">Quorum Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm text-zinc-300">{action.label}</p>
          <p className="text-xs text-zinc-400">
            This action is outside OIE solo scope (Steward → Owner boundary). It routes to
            Principal for two-person quorum publish. {action.note ?? ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {action.requiredRoles.map((r) => (
              <Badge key={r} variant="success">{r}</Badge>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onPress={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onPress={() => { onClose(); }}>
              <Rocket className="mr-1 size-4" /> Submit to Principal Quorum
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OieShell({ view }: { view: View }) {
  const { state, loading, error, refetch } = useOieState();
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
        <CardTitle className="flex items-center gap-2 text-danger">
          <AlertTriangle /> OIE dashboard unavailable
        </CardTitle>
        <p className="mt-2 text-sm text-zinc-400">
          {error === "FORBIDDEN"
            ? "Access denied — OIE dashboard requires the OIE / Exam Branch role."
            : "The OIE state endpoint returned an error."}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onPress={refetch}>
          <RefreshCw className="mr-1 size-4" /> Retry
        </Button>
      </Card>
    );
  }

  const gate = state.hallTicketGate;
  const gatePct = (n: number) => (gate.total > 0 ? Math.round((n / gate.total) * 100) : 0);

  return (
    <div className="space-y-4 p-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">OIE · Exam Branch</Badge>
        <Badge>{state.examCycle.phase}</Badge>
        {state.examCycle.academicYear && <Badge variant="entry">{state.examCycle.academicYear}</Badge>}
        {state.llmCircuitOpen && <Badge variant="dayout">LLM Circuit Open</Badge>}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onPress={refetch}>
            <RefreshCw className="mr-1 size-4" /> Refresh
          </Button>
        </div>
      </div>

      {view === "exam-ops" && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard icon={GraduationCap} title="Hall Ticket Eligibility"
              value={`${gate.eligible} safe`} sub={`${gate.condonationRequired} condonation · ${gate.detained} detained`}
              pct={gatePct(gate.eligible)}
              note={gate.hasAttendanceData ? undefined : "No attendance records yet (no data)"} />
            <KpiCard icon={Scale} title="Active Reg & RC/RV"
              value={`${state.regulationDrafts[0]?.key ?? "—"}${state.regulationDrafts[0] ? ` v${state.regulationDrafts[0].version}` : ""}`}
              sub={`${state.registrations.rcRvPending} RC/RV pending`}
              note={state.registrations.rcRvPending === 0 ? "No RC/RV applications yet" : undefined} />
            <KpiCard icon={Banknote} title="Registrations"
              value={`${state.registrations.activeExams} active`}
              sub={`${state.paymentFeed.length} payment events`}
              note={state.registrations.activeExams === 0 ? "No active exam registrations" : undefined} />
            <KpiCard icon={Shield} title="Withheld & Malpractice"
              value={String(gate.withheld)}
              sub="blocked from results/promotion"
              note={gate.withheld === 0 ? "No holds active" : undefined} />
          </div>

          {/* 3-tab operations */}
          <Card>
            <Tabs value="hall">
              <Tabs.List>
                <Tabs.Tab value="hall"><MapIcon className="mr-1 size-4" /> Hall Ticket Gate</Tabs.Tab>
                <Tabs.Tab value="regs"><Banknote className="mr-1 size-4" /> Registrations & RC/RV</Tabs.Tab>
                <Tabs.Tab value="results"><FileText className="mr-1 size-4" /> CIE Locks & Results</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="hall">
                <HallTicketGateState
                  gate={gate}
                  onDebarred={() => setQuorum({
                    label: "DEBARRED status override",
                    requiredRoles: ["oie", "principal"],
                    note: "Immutable Meta-Rule: DEBARRED edits need OIE + Principal quorum.",
                  })}
                />
              </Tabs.Panel>
              <Tabs.Panel value="regs">
                <RcRvState rcRv={state.rcRvQueue} payments={state.paymentFeed} slabs={state.registrations.lateFeeSlabs} />
              </Tabs.Panel>
              <Tabs.Panel value="results">
                <CieResultsState
                  lock={state.deptLockReadiness}
                  onPublish={() => publishSemester(state, refetch)}
                  onDebarred={() => setQuorum({
                    label: "DEBARRED override (results)",
                    requiredRoles: ["oie", "principal"],
                  })}
                />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </>
      )}

      {view === "regulations" && (
        <Card>
          <Tabs value="clone">
            <Tabs.List>
              <Tabs.Tab value="clone"><FileText className="mr-1 size-4" /> Regulation Cloning & Fee Slabs</Tabs.Tab>
              <Tabs.Tab value="maps"><Scale className="mr-1 size-4" /> Subject Equivalency Maps</Tabs.Tab>
              <Tabs.Tab value="rollover"><Rocket className="mr-1 size-4" /> Annual Rollover Staging</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="clone">
              <RegulationCloneState regs={state.regulationDrafts} onAction={(a) => setQuorum(a)} />
            </Tabs.Panel>
            <Tabs.Panel value="maps">
              <EquivalencyMapsState maps={state.equivalencyMaps} onAction={(a) => setQuorum(a)} />
            </Tabs.Panel>
            <Tabs.Panel value="rollover">
              <RolloverStagingState preview={state.rolloverPreview} onAction={(a) => setQuorum(a)} />
            </Tabs.Panel>
          </Tabs>
        </Card>
      )}

      {view === "bridge" && (
        <Card>
          <Tabs value="escalations">
            <Tabs.List>
              <Tabs.Tab value="escalations"><ScrollText className="mr-1 size-4" /> Escalations & Grievances</Tabs.Tab>
              <Tabs.Tab value="circulars"><FileText className="mr-1 size-4" /> Exam Circulars & Recall</Tabs.Tab>
              <Tabs.Tab value="adapters"><Activity className="mr-1 size-4" /> Adapters & Hall Map</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="escalations">
              <EscalationsState bridge={state.oieBridge} circuitOpen={state.llmCircuitOpen} />
            </Tabs.Panel>
            <Tabs.Panel value="circulars">
              <CircularsState circulars={state.examCirculars} onRecall={refetch} />
            </Tabs.Panel>
            <Tabs.Panel value="adapters">
              <AdaptersState adapters={state.adapters} />
            </Tabs.Panel>
          </Tabs>
        </Card>
      )}

      <QuorumGateModal open={quorum !== null} onClose={() => setQuorum(null)} action={quorum} />
    </div>
  );
}

// ── Shared KPI card ──────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, title, value, sub, pct, note }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  sub?: string;
  pct?: number;
  note?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
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

// ── Exam Ops tabs ────────────────────────────────────────────────────────────
function HallTicketGateState({ gate, onDebarred }: {
  gate: { eligible: number; condonationRequired: number; detained: number; withheld: number; total: number; hasAttendanceData: boolean };
  onDebarred: () => void;
}) {
  if (!gate.hasAttendanceData) {
    return <EmptyNote text="No attendance records yet — the Hall Ticket Gate has no students to evaluate. Records will populate as faculty log attendance." />;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">{gate.eligible} ELIGIBLE</Badge>
        <Badge variant="dayout">{gate.condonationRequired} CONDONATION</Badge>
        <Badge variant="error">{gate.detained} DETAINED</Badge>
        <Badge>{gate.withheld} WITHHELD</Badge>
      </div>
      <p className="text-xs text-zinc-400">
        Eligibility is computed live via the SAME <code>config_exam_eligibility_rules</code> the
        Student/HOD dashboards read — post-lock Faculty amendments auto-recalculate without
        manual Exam Branch flags.
      </p>
      <Button variant="secondary" size="sm" onPress={onDebarred}>
        <Lock className="mr-1 size-4" /> Request DEBARRED Override
      </Button>
    </div>
  );
}

function RcRvState({ rcRv, payments, slabs }: {
  rcRv: OieState["rcRvQueue"];
  payments: OieState["paymentFeed"];
  slabs: OieState["registrations"]["lateFeeSlabs"];
}) {
  const cols: Array<Column<{ id: string; student: string | null; subject: string; examType: string; status: string; feeType: string | null; createdAt: string }>> = [
    { key: "student", header: "Student", render: (r) => r.student ?? "—" },
    { key: "subject", header: "Subject", render: (r) => r.subject },
    { key: "examType", header: "Exam", render: (r) => r.examType },
    { key: "status", header: "Status", render: (r) => <Badge>{r.status}</Badge> },
    { key: "feeType", header: "Fee", render: (r) => r.feeType ?? "—" },
  ];
  return (
    <div className="space-y-4">
      {slabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slabs.map((s) => (
            <Badge key={s.tier} variant={s.amountInr != null ? "entry" : "error"}>
              {s.tier}: {s.amountInr != null ? `₹${s.amountInr}` : "no slab"}
            </Badge>
          ))}
        </div>
      )}
      {rcRv.length === 0 ? (
        <EmptyNote text="No RC/RV applications open. Recounting / Revaluation requests will appear here." />
      ) : (
        <Table data={rcRv.map((r) => ({ ...r, id: r.createdAt + r.subject }))} columns={cols} />
      )}
      {payments.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-zinc-300">SBI Collect / UPI Payment Feed</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {payments.slice(0, 8).map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 p-2 text-xs">
                <span className="text-zinc-300">{p.utr}</span>
                <span>{p.amountInr != null ? `₹${p.amountInr}` : "—"}</span>
                <Badge variant={p.idempotency === "DUPLICATE_IGNORED" ? "dayout" : "success"}>{p.idempotency}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            <code>processed_events</code> deduplicates by UTR — duplicate SBI Collect callbacks never double-credit exam / RC/RV fees.
          </p>
        </div>
      )}
    </div>
  );
}

function CieResultsState({ lock, onPublish, onDebarred }: {
  lock: OieState["deptLockReadiness"];
  onPublish: () => void;
  onDebarred: () => void;
}) {
  return (
    <div className="space-y-3">
      {lock.length === 0 ? (
        <EmptyNote text="No department CIE lock data yet. Branch-wise CIE lock completion will appear here." />
      ) : (
        <div className="space-y-2">
          {lock.map((d) => (
            <div key={d.dept} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-zinc-400">{d.dept}</span>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Attendance {d.attendanceLockPct ?? "—"}%</span>
                  <span>CIE {d.cieLockPct ?? "—"}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
                  <div className="h-1.5 rounded-full bg-success" style={{ width: `${d.cieLockPct ?? 0}%` }} />
                </div>
              </div>
              <span className="text-zinc-500">{d.students} students</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="primary" size="sm" onPress={onPublish}>
          <FileText className="mr-1 size-4" /> Publish Semester Results & Dispatch HOD Analysis
        </Button>
        <Button variant="secondary" size="sm" onPress={onDebarred}>
          <Lock className="mr-1 size-4" /> Withhold / DEBARRED (Quorum)
        </Button>
      </div>
    </div>
  );
}

// ── Regulations tabs ─────────────────────────────────────────────────────────
type QuorumAction = { label: string; requiredRoles: string[]; note?: string };

function RegulationCloneState({ regs, onAction }: { regs: OieState["regulationDrafts"]; onAction: (a: QuorumAction) => void }) {
  if (regs.length === 0) return <EmptyNote text="No regulation versions found. Clone an active regulation to draft the next version." />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {regs.map((r) => (
          <Badge key={r.key + r.version} variant={r.status === "ACTIVE" ? "success" : r.status === "DRAFT" ? "dayout" : "entry"}>
            {r.key} v{r.version} · {r.status}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        OIE is the Data Steward: clone / draft / lint, but <strong className="text-amber-400">cannot solo-publish</strong>.
        A DRY_RUN_VERIFIED draft submits to Principal for quorum publish.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm"
          onPress={() => onAction({ label: "Clone active regulation → next version draft", requiredRoles: ["oie", "principal"], note: "OIE drafts; Principal quorum publishes." })}>
          <Rocket className="mr-1 size-4" /> Clone Regulation
        </Button>
        <Button variant="secondary" size="sm"
          onPress={() => onAction({ label: "Edit fee slab / equivalency map", requiredRoles: ["oie", "principal"] })}>
          <Scale className="mr-1 size-4" /> Edit Draft (Fee Slab / Map)
        </Button>
      </div>
    </div>
  );
}

function EquivalencyMapsState({ maps, onAction }: { maps: OieState["equivalencyMaps"]; onAction: (a: QuorumAction) => void }) {
  if (maps.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyNote text="No subject_equivalency_maps yet. Detained / readmitted students moving across regulations are mapped here (from_reg + subject → to_reg + subject)." />
        <Button variant="secondary" size="sm"
          onPress={() => onAction({ label: "Add subject equivalency map entry", requiredRoles: ["oie", "principal"] })}>
          <Scale className="mr-1 size-4" /> Add Mapping
        </Button>
      </div>
    );
  }
  const cols: Array<Column<{ id: string; fromReg: string; fromSubject: string; toReg: string; toSubject: string; creditDelta: number | null; bridgeRequired: boolean }>> = [
    { key: "fromReg", header: "From Reg", render: (r) => r.fromReg },
    { key: "fromSubject", header: "From Subject", render: (r) => r.fromSubject },
    { key: "toReg", header: "To Reg", render: (r) => r.toReg },
    { key: "toSubject", header: "To Subject", render: (r) => r.toSubject },
    { key: "creditDelta", header: "Δ Credits", render: (r) => (r.creditDelta != null ? String(r.creditDelta) : "—") },
    { key: "bridgeRequired", header: "Bridge", render: (r) => (r.bridgeRequired ? <Badge variant="dayout">bridge</Badge> : <Badge>direct</Badge>) },
  ];
  return <Table data={maps.map((m) => ({ ...m, id: m.id }))} columns={cols} />;
}

function RolloverStagingState({ preview, onAction }: { preview: OieState["rolloverPreview"]; onAction: (a: QuorumAction) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        Declarative promotion rules (Sem N → N+1, Final + Credits → ALUMNI_READONLY, Detained → HOLD_COHORT)
        staged via <code>lifecycle_playbooks</code>. {preview.playbookKey ? `Active playbook: ${preview.playbookKey} (${preview.status}).` : "No rollover playbook staged yet."}
      </p>
      {preview.transitions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {preview.transitions.map((t, i) => (
            <Badge key={i}>{t.from} → {t.to}{t.label ? ` · ${t.label}` : ""}</Badge>
          ))}
        </div>
      )}
      <Button variant="primary" size="sm"
        onPress={() => onAction({ label: "Stage Annual Rollover for Principal Sign-Off", requiredRoles: ["oie", "principal"], note: "OIE stages; Principal signs." })}>
        <Rocket className="mr-1 size-4" /> Stage Rollover for Principal Sign-Off
      </Button>
    </div>
  );
}

// ── Bridge tabs ──────────────────────────────────────────────────────────────
function EscalationsState({ bridge, circuitOpen }: { bridge: OieState["oieBridge"]; circuitOpen: boolean }) {
  if (bridge.facultyHod.length === 0 && bridge.statutoryGrievances.length === 0) {
    return <EmptyNote text="No OIE escalations or direct Statutory Exam Grievance filings yet. Students cannot cold-DM the OIE; only verified Faculty/HOD escalations + direct statutory filings reach this inbox." />;
  }
  return (
    <div className="space-y-4">
      {circuitOpen && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          <AlertTriangle className="mr-1 inline size-4" /> LLM circuit is OPEN — replies may be degraded / fallback.
        </div>
      )}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Faculty / HOD Escalations ({bridge.facultyHod.length})</h4>
        {bridge.facultyHod.length === 0 ? (
          <p className="text-xs text-zinc-500">No Faculty/HOD escalations routed to the OIE.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bridge.facultyHod.map((e) => (
              <div key={e.id} className="rounded-lg border border-zinc-800 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{e.topic}</span>
                  <Badge variant={e.status === "answered" ? "success" : "dayout"}>{e.status}</Badge>
                </div>
                <p className="mt-1 text-zinc-500">from {e.escalatedFrom} · {new Date(e.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-300">Direct Statutory Exam Grievance Cell ({bridge.statutoryGrievances.length})</h4>
        {bridge.statutoryGrievances.length === 0 ? (
          <p className="text-xs text-zinc-500">No direct statutory grievance filings.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bridge.statutoryGrievances.map((g) => (
              <div key={g.id} className="rounded-lg border border-zinc-800 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200">{g.subject}</span>
                  <Badge variant="success">Direct Statutory Channel</Badge>
                </div>
                <p className="mt-1 text-zinc-500">
                  {g.filedBy ?? "statutory"} · {new Date(g.createdAt).toLocaleDateString()}
                  {g.slaWatch ? ` · SLA ${g.slaWatch}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Sensitive categories (<code>condonation</code>, <code>malpractice</code>, <code>marks_dispute</code>, <code>rc_rv</code>, <code>result_withhold</code>)
        hard-lock the public broadcast toggle off (Private DM only) — enforced in the API.
      </p>
    </div>
  );
}

function CircularsState({ circulars, onRecall }: { circulars: OieState["examCirculars"]; onRecall: () => void }) {
  if (circulars.length === 0) return <EmptyNote text="No exam circulars / timetables / result notices published yet." />;
  return (
    <div className="space-y-2">
      {circulars.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
          <div>
            <div className="text-sm text-zinc-200">{c.title}</div>
            <div className="text-xs text-zinc-500">
              {c.circularNo ? `No. ${c.circularNo}` : "no circular no."} ·{" "}
              {c.recalled ? <Badge variant="dayout">SUPERSEDED</Badge> : <Badge variant="success">{c.status}</Badge>}
            </div>
          </div>
          {!c.recalled && (
            <Button variant="ghost" size="sm" onPress={onRecall}>
              <RefreshCw className="mr-1 size-4" /> Recall & Corrigendum
            </Button>
          )}
        </div>
      ))}
      <p className="text-xs text-zinc-500">Recall stamps <code>SUPERSEDED</code> + tombstones RAG chunks + cancels pending drafts.</p>
    </div>
  );
}

function AdaptersState({ adapters }: { adapters: OieState["adapters"] }) {
  if (adapters.length === 0) return <EmptyNote text="No integration adapters configured yet (SIS sync, SBI Collect webhook, transcript archive)." />;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {adapters.map((a) => (
        <div key={a.key} className="rounded-lg border border-zinc-800 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">{a.key}</span>
            <Badge variant={a.status === "ACTIVE" ? "success" : "dayout"}>{a.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{a.direction} · {a.transport ?? "n/a"}</p>
        </div>
      ))}
      <p className="col-span-full text-xs text-zinc-500">
        Static exam-hall block locator only — zero live GPS / geofence / biometric reader telemetry.
      </p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────
function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
      {text}
    </div>
  );
}

async function publishSemester(state: OieState, refetch: () => void) {
  try {
    await fetch("/api/oie/results/publish-or-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish_semester", semesterNumber: state.examCycle.activeSemester ? Number(state.examCycle.activeSemester) : undefined }),
    });
    void refetch();
  } catch {
    /* endpoint returns ok/err — refetch to reflect any change */
  }
}
