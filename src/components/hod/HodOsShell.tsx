"use client";

/**
 * HodOsShell — the catalog-driven, zero-hardcoded HOD OS hub.
 *
 * Rendered at /hod/dashboard (inside the existing HodDesktopShell layout):
 *   1. Identity + dept chip
 *   2. Command strip: 4 KPI cards
 *   3. Tabs: Overview · Academics · Faculty · Authority Bridge · Governance
 *   4. HOD Dev Harness (floating, left corner)
 *   5. QuorumGateModal (triggered by any locked action)
 *
 * No institutional rule is hardcoded — thresholds come from the catalog
 * hodOsPolicy layer + /api/hod/os/state (live DB).
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BrainCircuit,
  Shield,
  AlertTriangle,
  Clock,
  Lock,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useHodOsState } from "@/hooks/useHodOsState";
import { useCatalog } from "@/hooks/useCatalog";
import { HodHarnessDrawer } from "@/components/hod/HodHarnessDrawer";
import { QuorumGateModal } from "@/components/hod/QuorumGateModal";
import { HodSchemaFormDrawer } from "@/components/hod/HodSchemaFormDrawer";

type TabValue = "overview" | "academics" | "faculty" | "bridge" | "governance";

export function HodOsShell() {
  const { state, loading, error } = useHodOsState();
  const { catalog } = useCatalog();
  const [tab, setTab] = useState<TabValue>("overview");
  const [quorumAction, setQuorumAction] = useState<{ key: string; label?: string } | null>(null);
  const [formDrawer, setFormDrawer] = useState<string | null>(null);

  const hodPolicy = catalog?.hodOsPolicy ?? null;
  const oneClick = new Set(hodPolicy?.hodActions.oneClick ?? []);
  const quorumLocked = hodPolicy?.hodActions.quorumLocked ?? [];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        Loading your HOD state…
      </div>
    );
  }
  if (!state || error) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        No HOD state available ({error ?? "not loaded"}).
      </div>
    );
  }

  const {
    identity,
    deptSummary,
    courseOfferings,
    countersignQueue,
    facultyRoster,
    approvals,
    authorityBridge,
    committees,
    llmCircuitOpen,
  } = state;

  const deptLabel = identity.department ? `${identity.department.code} · HOD` : "HOD";

  const tabs: Array<{ value: TabValue; label: string; icon: React.ReactNode }> = [
    { value: "overview", label: "Overview", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
    { value: "academics", label: "Academics & Courses", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { value: "faculty", label: "Faculty & Timetable", icon: <Users className="h-3.5 w-3.5" /> },
    { value: "bridge", label: "Authority Bridge", icon: <BrainCircuit className="h-3.5 w-3.5" /> },
    { value: "governance", label: "Governance & Map", icon: <Shield className="h-3.5 w-3.5" /> },
  ];

  const slaCols: Column<(typeof authorityBridge.slaQueue)[number]>[] = [
    { key: "topic", header: "Topic" },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <Badge variant={s.breached ? "error" : "leave"} dot={false}>
          {s.breached ? "SLA BREACHED" : s.status}
        </Badge>
      ),
    },
    {
      key: "dueAt",
      header: "SLA Due",
      render: (s) =>
        s.dueAt ? new Date(s.dueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—",
    },
  ];

  const gapCols: Column<(typeof authorityBridge.knowledgeGaps)[number]>[] = [
    { key: "question", header: "Clustered Question" },
    {
      key: "abstentionCount",
      header: "Abstentions",
      render: (g) => <Badge variant="entry" dot={false}>{g.abstentionCount}+</Badge>,
    },
    { key: "groupSlug", header: "Cohort" },
  ];

  const facultyCols: Column<(typeof facultyRoster)[number]>[] = [
    { key: "name", header: "Faculty" },
    { key: "assignments", header: "Active Assignments" },
    { key: "mentees", header: "Mentees" },
    {
      key: "pendingSwaps",
      header: "Pending Requests",
      render: (f) => (f.pendingSwaps > 0 ? <Badge variant="error" dot={false}>{f.pendingSwaps}</Badge> : <span className="text-text-secondary">—</span>),
    },
  ];

  const circularCols: Column<(typeof authorityBridge.circulars)[number]>[] = [
    { key: "title", header: "Circular" },
    {
      key: "state",
      header: "State",
      render: (c) => (
        <Badge variant={c.recalled ? "error" : "success"} dot={false}>
          {c.recalled ? "SUPERSEDED" : c.state}
        </Badge>
      ),
    },
    { key: "category", header: "Category" },
  ];

  const eligibility = deptSummary.eligibility;
  const totalStudents = deptSummary.totalStudents;
  const slaBreached = authorityBridge.slaQueue.filter((s) => s.breached).length;
  const pendingApprovals = approvals.labSwaps + approvals.classReschedules + approvals.leaveDelegations + countersignQueue.length;

  const kpiCards = [
    {
      label: "SLA Breached",
      value: slaBreached,
      tone: slaBreached > 0 ? "text-rose-600" : "text-emerald-600",
      sub: "escalations overdue",
      icon: <AlertTriangle className="h-4 w-4 text-text-secondary" />,
    },
    {
      label: "Eligibility Health",
      value: eligibility.hasAttendanceData
        ? `${Math.round((eligibility.eligible / Math.max(1, eligibility.total)) * 100)}%`
        : "No data",
      tone: eligibility.hasAttendanceData ? "text-text-primary" : "text-text-secondary",
      sub: eligibility.hasAttendanceData
        ? `${eligibility.eligible} safe · ${eligibility.condonationRequired} condonation · ${eligibility.detained} detained`
        : "attendance_records empty",
      icon: <ChevronRight className="h-4 w-4 text-text-secondary" />,
    },
    {
      label: "Pending Approvals",
      value: pendingApprovals,
      tone: pendingApprovals > 0 ? "text-amber-600" : "text-emerald-600",
      sub: "course reg · lab swap · leave",
      icon: <Clock className="h-4 w-4 text-text-secondary" />,
    },
    {
      label: "IQAC & Lock",
      value: llmCircuitOpen ? "Fast-Lookup" : "OK",
      tone: llmCircuitOpen ? "text-amber-600" : "text-emerald-600",
      sub: llmCircuitOpen ? "LLM circuit open" : "LLM circuit closed",
      icon: <Shield className="h-4 w-4 text-text-secondary" />,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      {/* ── Identity + dept chip ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">
          {identity.name ?? "HOD"}
        </h1>
        <Badge variant="entry" dot={false}>
          {deptLabel}
        </Badge>
        {llmCircuitOpen && (
          <Badge variant="leave" dot={false}>
            Fast-Lookup Mode
          </Badge>
        )}
      </div>

      {/* ── Command strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                {k.icon}
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className={`text-2xl font-semibold ${k.tone}`}>{k.value}</span>
              <p className="text-xs text-text-secondary">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-sky-600 text-white"
                : "bg-bg-elevated text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {deptSummary.sections.length === 0 ? (
                <p className="text-sm text-text-secondary">No department sections found. Check the HOD's department_id linkage.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {deptSummary.sections.map((s) => (
                    <div key={`${s.year}-${s.section}`} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-text-primary">
                        Year {s.year} · {s.section}
                      </p>
                      <p className="text-xs text-text-secondary">{s.students} students</p>
                    </div>
                  ))}
                </div>
              )}
              {eligibility.hasAttendanceData && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>Eligibility health</span>
                    <span>
                      {eligibility.eligible} safe · {eligibility.condonationRequired} condonation · {eligibility.detained} detained
                    </span>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-bg-elevated">
                    <div className="bg-emerald-500" style={{ width: `${Math.round((eligibility.eligible / Math.max(1, eligibility.total)) * 100)}%` }} />
                    <div className="bg-amber-500" style={{ width: `${Math.round((eligibility.condonationRequired / Math.max(1, eligibility.total)) * 100)}%` }} />
                    <div className="bg-rose-500" style={{ width: `${Math.round((eligibility.detained / Math.max(1, eligibility.total)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Committees & IQAC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xl font-semibold text-text-primary">{committees.iqacEntries}</p>
                  <p className="text-xs text-text-secondary">IQAC entries</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xl font-semibold text-text-primary">{committees.boEntries}</p>
                  <p className="text-xs text-text-secondary">BoS / DRC entries</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xl font-semibold text-text-primary">
                    {committees.examResultVerification.pending ? "Pending" : "—"}
                  </p>
                  <p className="text-xs text-text-secondary">Exam result verification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Academics & Courses ──────────────────────────────────────── */}
      {tab === "academics" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Offerings</CardTitle>
            </CardHeader>
            <CardContent>
              {courseOfferings.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No course offerings in the live DB. The HOD OS course-offering
                  table will populate when faculty assignments + enrollment data
                  are seeded for this department.
                </p>
              ) : (
                <Table
                  columns={[
                    { key: "code", header: "Course" },
                    { key: "enrollment", header: "Enrollment" },
                    { key: "sectionCount", header: "Sections" },
                    {
                      key: "flaggedLow",
                      header: "Status",
                      render: (c) =>
                        c.flaggedLow ? (
                          <Badge variant="error" dot={false}>Below Min</Badge>
                        ) : (
                          <Badge variant="success" dot={false}>OK</Badge>
                        ),
                    },
                  ] as Array<Column<(typeof courseOfferings)[number]>>}
                  data={courseOfferings}
                  rowKey={(r) => r.code}
                  emptyMessage="No course offerings."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Countersign Queue</CardTitle>
            </CardHeader>
            <CardContent>
              {countersignQueue.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No pending course-registration countersign requests.
                </p>
              ) : (
                <Table
                  columns={[
                    { key: "subject", header: "Subject" },
                    { key: "student", header: "Student" },
                    { key: "requestType", header: "Type" },
                  ] as Array<Column<(typeof countersignQueue)[number]>>}
                  data={countersignQueue}
                  rowKey={(r) => `${r.student}-${r.requestType}`}
                  emptyMessage="No countersign requests."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Faculty & Timetable ──────────────────────────────────────── */}
      {tab === "faculty" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Faculty Roster</CardTitle>
            </CardHeader>
            <CardContent>
              {facultyRoster.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No faculty assigned to this department in the live DB.
                </p>
              ) : (
                <Table columns={facultyCols} data={facultyRoster} rowKey={(r) => r.id} emptyMessage="No faculty." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Lab Swaps", n: approvals.labSwaps },
                  { label: "Class Reschedules", n: approvals.classReschedules },
                  { label: "Leave Delegations", n: approvals.leaveDelegations },
                ].map((a) => (
                  <div key={a.label} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xl font-semibold text-text-primary">{a.n}</p>
                    <p className="text-xs text-text-secondary">{a.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Authority Bridge ─────────────────────────────────────────── */}
      {tab === "bridge" && (
        <div className="flex flex-col gap-4">
          {llmCircuitOpen && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Fast-Lookup Mode: LLM circuit is open. Verified-KB answers only.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Escalations & Knowledge Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    SLA Escalations ({authorityBridge.slaQueue.length})
                  </h4>
                  {authorityBridge.slaQueue.length === 0 ? (
                    <p className="text-sm text-text-secondary">No open escalations.</p>
                  ) : (
                    <Table columns={slaCols} data={authorityBridge.slaQueue} rowKey={(r) => r.id} emptyMessage="No escalations." />
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    Knowledge Gap Cards ({authorityBridge.knowledgeGaps.length})
                  </h4>
                  {authorityBridge.knowledgeGaps.length === 0 ? (
                    <p className="text-sm text-text-secondary">
                      No clustered abstentions. When 3+ students ask the same
                      unanswered question, it appears here.
                    </p>
                  ) : (
                    <Table columns={gapCols} data={authorityBridge.knowledgeGaps} rowKey={(r) => r.clusterId} emptyMessage="No gaps." />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Private Sensitive Vault
              </CardTitle>
            </CardHeader>
            <CardContent>
              {authorityBridge.privateVault.length === 0 ? (
                <p className="text-sm text-text-secondary">No private disputes pending.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {authorityBridge.privateVault.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <span className="text-text-primary">{v.topic}</span>
                      <Badge variant="error" dot={false}>PRIVATE</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> OIE Escalations & Circulars
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    OIE Escalations ({authorityBridge.oieEscalations.length})
                  </h4>
                  {authorityBridge.oieEscalations.length === 0 ? (
                    <p className="text-sm text-text-secondary">No active OIE escalations.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {authorityBridge.oieEscalations.map((e) => (
                        <div key={e.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                          <span className="text-text-primary">{e.topic}</span>
                          <Badge variant="leave" dot={false}>{e.escalatedTo}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    Published Circulars ({authorityBridge.circulars.length})
                  </h4>
                  {authorityBridge.circulars.length === 0 ? (
                    <p className="text-sm text-text-secondary">No published circulars.</p>
                  ) : (
                    <Table columns={circularCols} data={authorityBridge.circulars} rowKey={(r) => r.id} emptyMessage="No circulars." />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => setFormDrawer("escalate_to_oie")}>
                    Escalate to OIE / Exam Branch
                  </Button>
                  {authorityBridge.circulars.find((c) => !c.recalled) && (
                    <Button variant="secondary" size="sm" onClick={() => setQuorumAction({ key: "circular_recall", label: "Recall & Issue Corrigendum" })}>
                      <span className="inline-flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" /> Recall Circular (Quorum)
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Governance & Static Map ──────────────────────────────────── */}
      {tab === "governance" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Governance Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    1-Click Powers ({oneClick.size})
                  </h4>
                  {oneClick.size === 0 ? (
                    <p className="text-sm text-text-secondary">No 1-click actions in scope.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {[...oneClick].map((k) => (
                        <Badge key={k} variant="success" dot={false}>{k}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-text-primary">
                    Quorum-Locked ({quorumLocked.length})
                  </h4>
                  {quorumLocked.length === 0 ? (
                    <p className="text-sm text-text-secondary">No quorum-locked actions.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {quorumLocked.map((q) => (
                        <button
                          key={q.key}
                          onClick={() => setQuorumAction({ key: q.key, label: q.key.replace(/_/g, " ") })}
                          className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-50 p-2 text-sm text-rose-800 hover:bg-rose-100"
                        >
                          <span>{q.key}</span>
                          <Badge variant="error" dot={false}>{q.approvers} approvers</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Static Campus Wayfinding</CardTitle>
            </CardHeader>
            <CardContent>
              {catalog?.facilities?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalog.facilities.map((f) => (
                    <div key={f.code} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <Badge variant="leave" dot={false}>{f.category}</Badge>
                      <span className="text-text-primary">{f.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No static campus facilities in the catalog. Zero GPS / security telemetry — wayfinding only.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modals & Drawers ─────────────────────────────────────────── */}
      <QuorumGateModal
        actionKey={quorumAction?.key ?? ""}
        open={quorumAction !== null}
        onClose={() => setQuorumAction(null)}
        label={quorumAction?.label}
      />
      {formDrawer && (
        <HodSchemaFormDrawer
          formKey={formDrawer}
          open={!!formDrawer}
          onClose={() => setFormDrawer(null)}
        />
      )}

      {/* HOD Dev Harness (left corner, dev-only) */}
      <HodHarnessDrawer />
    </div>
  );
}
