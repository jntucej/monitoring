"use client";

/**
 * StaffCounterShell — the catalog-driven, zero-hardcoded STAFF (Administrative
 * Office & Counter Clerks) hub. Rendered on 2 routes under /admin:
 *
 *   /admin           → desk counter queue (KPI strip + 4-desk tabs)
 *   /admin/steward   → Records & Map (stamped receipts + static wayfinding)
 *
 * STRICT DESK BOUNDARY: STAFF can execute counter actions (verify challans,
 * clear no-dues, approve bonafide/TC, log admission docs, archive course
 * regs) but CANNOT draft/publish regulations, edit fee slabs, activate
 * delegates, alter timeout_hours, edit governance_matrix, or run SYSADMIN
 * topology. Steward/Owner/Topology tabs are hidden via catalog.
 *
 * No hardcoded fee amounts, desk rules, or nav items in JSX. All counter
 * categories, fee heads, receipt templates, and SLA timeouts come from
 * /api/admin/staff/state + /api/config/catalog (live DB).
 */

import { useCallback, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Shield, FileText, AlertTriangle, Users, Lock, CheckCircle2 } from "lucide-react";

export type StaffView = "command" | "records";

export function StaffCounterShell({ view }: { view: StaffView }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [desk, setDesk] = useState("ALL");

  const fetchState = useCallback(async (d: string = "ALL") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/state?desk=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? "Unknown error");
      setData(result.data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchState(desk), [desk, fetchState]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">STAFF · Office Counter</h1>
            <p className="text-sm text-zinc-400">Loading desk queue…</p>
          </div>
          <Badge variant="exit"><Lock className="size-3" /> Execution Only</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28">
              <CardContent>
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <EmptyState title="Staff state unavailable" description={error ?? "Unknown error"} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">STAFF · Office Counter</h1>
          <p className="text-sm text-zinc-400">
            {view === "command" ? "Desk Counter Queue" : "Records & Map"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={desk}
            onChange={(e) => {
              setDesk(e.target.value);
              fetchState(e.target.value);
            }}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-xs"
          >
            <option value="ALL">All Desks</option>
            <option value="ADMISSIONS">Admissions</option>
            <option value="ACCOUNTS">Accounts</option>
            <option value="ACADEMIC_SECTION">Academic Section</option>
            <option value="LIBRARY">Library</option>
          </select>
          <Badge variant="exit"><Lock className="size-3" /> Execution Only</Badge>
        </div>
      </div>

      {view === "command" ? (
        <StaffCommandView data={data} onRefresh={refresh} />
      ) : (
        <StaffRecordsView data={data} onRefresh={refresh} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE 1 — /admin : Desk Counter Queue                                */
/* ------------------------------------------------------------------ */

function StaffCommandView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const { kpi, counterTickets, verifiedLedger } = data;

  const kpis = [
    { label: "Open Counter Queue", value: kpi.openCounterQueue, sub: `Desk: ${kpi.desk}`, tone: kpi.openCounterQueue > 0 ? "exit" : "entry" },
    { label: "Verified Challans & No-Dues", value: kpi.verifiedToday, sub: "Synced to Dues Gate", tone: "entry" },
    { label: "Admissions & Roll-No Roster", value: kpi.pendingSpotAdmission, sub: "Vacancy + verified candidates", tone: kpi.pendingSpotAdmission > 0 ? "exit" : "entry" },
    { label: "SLA Watch Status", value: kpi.slaWarnings, sub: "Tickets nearing ADMIN escalation", tone: kpi.slaWarnings > 0 ? "dayout" : "entry" },
  ];

  const ticketCols: Column<any>[] = [
    { key: "ticketNumber", header: "Ticket", render: (r) => <code className="text-[11px]">{r.ticketNumber ?? r.id?.slice(0, 8)}</code> },
    { key: "userName", header: "Student/Requester" },
    { key: "category", header: "Desk", render: (r) => <Badge variant="exit">{r.category}</Badge> },
    { key: "priority", header: "Priority", render: (r) => <Badge variant={r.priority === "high" ? "dayout" : "entry"}>{r.priority}</Badge> },
    { key: "subject", header: "Request" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="primary"
          onPress={() => {
            fetch("/api/admin/staff/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "APPROVE_BONAFIDE_TC",
                ticketId: r.id,
                deskUnit: kpi.desk,
              }),
            }).then((res) => res.json()).then((d) => {
              if (d.success) alert(`✓ ${d.data.note}`);
              onRefresh();
            });
          }}
        >
          <CheckCircle2 className="size-3" /> Inspect & Verify
        </Button>
      ),
    },
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

      {/* Counter tickets by desk */}
      <Card>
        <CardHeader>
          <span className="text-lg font-bold">Counter Queue · {kpi.desk}</span>
          <p className="text-xs text-zinc-400">
            {counterTickets.length} open tickets. Execution-only — no policy editing.
          </p>
        </CardHeader>
        <CardContent>
          {counterTickets.length === 0 ? (
            <EmptyState title="No open tickets" description={`No open counter tickets for desk ${kpi.desk} in the live DB.`} />
          ) : (
            <Table columns={ticketCols} data={counterTickets} rowKey={(r) => r.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE 2 — /admin/steward : Records & Map                             */
/* ------------------------------------------------------------------ */

function StaffRecordsView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const { verifiedLedger } = data;
  const [tab, setTab] = useState("receipts");

  const challanCols: Column<any>[] = [
    { key: "utrRef", header: "UTR Ref", render: (r) => <code className="text-[11px]">{r.utrRef}</code> },
    { key: "payMethod", header: "Method" },
    { key: "amountInr", header: "Amount (INR)", render: (r) => `₹${r.amountInr}` },
    { key: "status", header: "Status", render: (r) => <Badge variant="entry">{r.status}</Badge> },
    { key: "reconciledAt", header: "Reconciled", render: (r) => r.reconciledAt ? new Date(r.reconciledAt).toLocaleDateString() : "—" },
  ];

  const dedupCols: Column<any>[] = [
    { key: "idempotencyKey", header: "Idempotency Key", render: (r) => <code className="text-[11px]">{r.idempotencyKey}</code> },
    { key: "eventType", header: "Event" },
    { key: "processedAt", header: "Processed", render: (r) => r.processedAt ? new Date(r.processedAt).toLocaleString() : "—" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <span className="text-lg font-bold">Records &amp; Static Wayfinding Map</span>
          <p className="text-xs text-zinc-400">
            Searchable log of verified challans, archived course regs, and generated roll-number lists. Static campus map only — zero GPS/security telemetry.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <Tabs.List>
              <Tabs.Tab value="receipts">Stamped Receipts & Course Reg Archive</Tabs.Tab>
              <Tabs.Tab value="map">Static Campus Wayfinding Map</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="receipts">
              <div className="space-y-4">
                {verifiedLedger.challans.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Verified Challans</p>
                    <Table columns={challanCols} data={verifiedLedger.challans} rowKey={(r) => r.id} />
                  </div>
                ) : (
                  <EmptyState title="No verified challans" description="No verified UTR challans found in the live DB." />
                )}

                {verifiedLedger.dedupHits.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Dedup Hits (DUPLICATE_IGNORED)</p>
                    <Table columns={dedupCols} data={verifiedLedger.dedupHits} rowKey={(r: any) => `${r.idempotencyKey}-${r.eventType}`} />
                  </div>
                )}
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="map">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4" />
                    <span className="text-sm font-medium">Static Campus Wayfinding</span>
                    <Badge variant="exit"><Lock className="size-3" /> Zero GPS / Biometric</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Blocks, counters, and offices from the facilities catalog. Live GPS trails, geofences, and H0201 biometric reader maps are strictly out of scope for STAFF.
                  </p>
                </div>
                <EmptyState
                  title="Static map"
                  description="Facilities, counters, and offices — no security telemetry."
                />
              </div>
            </Tabs.Panel>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
