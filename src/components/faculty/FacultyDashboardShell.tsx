"use client";

/**
 * FacultyDashboardShell — the catalog-driven, zero-hardcoded faculty hub.
 *
 * Rendered at /faculty/dashboard:
 *   1. Identity + regulation chip
 *   2. Command strip: Today · SLA Queue · Knowledge Gaps · At-Risk Mentees
 *   3. Today's periods + weekly schedule
 *   4. SLA queue (open escalations)
 *   5. Knowledge gap cards (3+ clustered abstentions)
 *   6. At-risk mentees (hall-ticket locked via the SAME policy engine)
 *   7. Private vault (sensitive doubt categories)
 *
 * No institutional rule is hardcoded — thresholds come from the catalog +
 * resolveAttendanceVerdict (identical to the student dashboard).
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  Shield,
  BrainCircuit,
  AlertTriangle,
  Clock,
  Users,
  DoorOpen,
  Lock,
} from "lucide-react";
import { useFacultyState } from "@/hooks/useFacultyState";
import { useCatalog } from "@/hooks/useCatalog";
import { DevHarnessDrawer } from "@/components/shared/DevHarnessDrawer";

type TabValue = "today" | "sla" | "gaps" | "mentees" | "vault" | "schedule";

export function FacultyDashboardShell() {
  const { state, loading, error } = useFacultyState();
  const { catalog } = useCatalog();
  const [tab, setTab] = useState<TabValue>("today");

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        Loading your faculty state…
      </div>
    );
  }
  if (!state || error) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-text-secondary">
        No faculty state available ({error ?? "not loaded"}).
      </div>
    );
  }

  const { identity, scope, commandStrip, today, slaQueue, knowledgeGaps, mentees, privateVault, schedule } = state;

  const menteeCols: Column<(typeof mentees)[number]>[] = [
    { key: "roll", header: "Roll" },
    { key: "name", header: "Student" },
    { key: "sectionLabel", header: "Section" },
    {
      key: "hallTicketStatus",
      header: "Hall Ticket",
      render: (m) =>
        m.hallTicketStatus ? (
          <Badge variant={m.atRisk ? "error" : "success"} dot={false}>
            {m.hallTicketStatus}
          </Badge>
        ) : (
          <span className="text-xs text-text-secondary">No data</span>
        ),
    },
    {
      key: "aggregatePct",
      header: "Att %",
      render: (m) => (m.aggregatePct != null ? `${m.aggregatePct}%` : "—"),
    },
  ];

  const slaCols: Column<(typeof slaQueue)[number]>[] = [
    { key: "topic", header: "Topic" },
    { key: "targetRole", header: "Routed to" },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge variant="leave" dot={false}>{s.status}</Badge>,
    },
    {
      key: "dueAt",
      header: "SLA Due",
      render: (s) => (s.dueAt ? new Date(s.dueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"),
    },
  ];

  const gapCols: Column<(typeof knowledgeGaps)[number]>[] = [
    { key: "question", header: "Clustered Question" },
    {
      key: "abstentionCount",
      header: "Abstentions",
      render: (g) => <Badge variant="entry" dot={false}>{g.abstentionCount}+</Badge>,
    },
    { key: "groupSlug", header: "Cohort" },
  ];

  const vaultCols: Column<(typeof privateVault)[number]>[] = [
    { key: "topic", header: "Topic" },
    { key: "targetRole", header: "Escalated to" },
    { key: "status", header: "Status" },
    {
      key: "dueAt",
      header: "SLA Due",
      render: (v) => (v.dueAt ? new Date(v.dueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"),
    },
  ];

  const scheduleDays = schedule.filter((d) => d.periods.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">
          {identity.name ?? "Faculty"}
        </h1>
        <Badge variant="entry" dot={false}>
          {identity.role}
          {scope.hasScope ? ` · ${scope.classes.map((c) => c.name || `${c.year} ${c.section}`).join(", ")}` : ""}
        </Badge>
      </div>

      {/* ── Command strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-text-secondary" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold text-text-primary">{commandStrip.todayPeriods}</span>
            <p className="text-xs text-text-secondary">periods scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-text-secondary" />
              SLA Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold text-text-primary">{commandStrip.slaOpen}</span>
            <p className="text-xs text-text-secondary">open escalations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BrainCircuit className="h-4 w-4 text-text-secondary" />
              Knowledge Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold text-text-primary">{commandStrip.knowledgeGapCards}</span>
            <p className="text-xs text-text-secondary">clustered cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-text-secondary" />
              At-Risk Mentees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-2xl font-semibold ${commandStrip.atRiskMentees > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {commandStrip.atRiskMentees}
            </span>
            <p className="text-xs text-text-secondary">hall ticket locked</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <div className="flex flex-wrap gap-1.5">
          {([
            ["today", "Today", CalendarClock],
            ["sla", "SLA Queue", Clock],
            ["gaps", "Knowledge Gaps", BrainCircuit],
            ["mentees", "Mentees", Users],
            ["vault", "Private Vault", Lock],
            ["schedule", "Schedule", DoorOpen],
          ] as const).map(([val, label, Icon]) => (
            <button
              key={val}
              onClick={() => setTab(val as TabValue)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === val
                  ? "bg-sky-600 text-white"
                  : "bg-bg-elevated text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Today */}
        {tab === "today" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's periods</CardTitle>
            </CardHeader>
            <CardContent>
              {today.length === 0 ? (
                <p className="text-sm text-text-secondary">No periods scheduled today.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {today.map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                      <span className="text-text-primary">{p.start}–{p.end} · {p.className}</span>
                      <Badge variant="entry" dot={false}>Period {p.periodNo}{p.hall ? ` · ${p.hall}` : ""}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* SLA Queue */}
        {tab === "sla" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open escalations (SLA)</CardTitle>
            </CardHeader>
            <CardContent>
              {slaQueue.length === 0 ? (
                <p className="text-sm text-text-secondary">No open escalations.</p>
              ) : (
                <Table columns={slaCols} data={slaQueue} rowKey={(r) => r.id} emptyMessage="No open escalations." />
              )}
            </CardContent>
          </Card>
        )}

        {/* Knowledge Gaps */}
        {tab === "gaps" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Knowledge Gap Cards
                {catalog?.routingPolicies?.length ? " (threshold from routing policies)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {knowledgeGaps.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No clustered abstentions yet. When 3+ students ask the same unanswered question, it appears here.
                </p>
              ) : (
                <Table columns={gapCols} data={knowledgeGaps} rowKey={(r) => r.clusterId} emptyMessage="No knowledge gaps." />
              )}
            </CardContent>
          </Card>
        )}

        {/* Mentees */}
        {tab === "mentees" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mentees ({mentees.length} in your sections)</CardTitle>
            </CardHeader>
            <CardContent>
              {mentees.length === 0 ? (
                <p className="text-sm text-text-secondary">No mentees assigned.</p>
              ) : (
                <Table
                  columns={menteeCols}
                  data={mentees.slice(0, 50)}
                  rowKey={(r) => r.studentId}
                  pagination={{ page: 1, limit: 50, total: mentees.length }}
                  emptyMessage="No mentees."
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Private Vault */}
        {tab === "vault" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" />
                Private Vault — sensitive disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {privateVault.length === 0 ? (
                <p className="text-sm text-text-secondary">No private disputes pending.</p>
              ) : (
                <Table columns={vaultCols} data={privateVault} rowKey={(r) => r.id} emptyMessage="No private disputes." />
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        {tab === "schedule" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduleDays.length === 0 ? (
                <p className="text-sm text-text-secondary">No scheduled periods this week.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {scheduleDays.map((d) => (
                    <div key={d.day} className="rounded-lg border border-border p-3">
                      <h4 className="mb-2 text-sm font-medium text-text-primary">
                        {["","Mon","Tue","Wed","Thu","Fri"][d.day]}
                      </h4>
                      <ul className="flex flex-col gap-1.5">
                        {d.periods.map((p, i) => (
                          <li key={i} className="text-xs text-text-secondary">
                            {p.start}–{p.end}
                            <Badge variant="entry" dot={false} className="ml-1">P{p.periodNo}</Badge>
                            <span className="ml-1">{p.className}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* Live Dev Harness — env-gated to development; 404 in prod. */}
      <DevHarnessDrawer />
    </div>
  );
}
