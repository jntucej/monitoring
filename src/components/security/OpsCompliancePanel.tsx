"use client";

import { useCallback, useEffect, useState } from "react";

interface GateHeadcount {
  gate_id: string;
  gate_name: string;
  in_today: number;
  out_today: number;
  net_inside: number;
}

interface DeviceHealth {
  id: string;
  serial: string;
  station_type: string;
  gate_name: string | null;
  health_state: string;
}

interface ProtocolRow {
  id: string;
  code: string;
  title: string;
  severity: string;
  steps: string[];
}

interface AccessReqRow {
  id: string;
  requester_name?: string;
  requested_role: string;
  reason: string;
  status: string;
}

export function OpsCompliancePanel() {
  const [headcount, setHeadcount] = useState<GateHeadcount[]>([]);
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [protocols, setProtocols] = useState<ProtocolRow[]>([]);
  const [accessReqs, setAccessReqs] = useState<AccessReqRow[]>([]);
  const [framework, setFramework] = useState("JNTUH");
  const [report, setReport] = useState<Record<string, number> | null>(null);
  const [drillMsg, setDrillMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/supervisor/gates/headcount")
      .then((r) => r.json())
      .then((j) => setHeadcount(j?.data?.gates ?? []))
      .catch(() => {});
    fetch("/api/supervisor/gates/hardware-health")
      .then((r) => r.json())
      .then((j) => setDevices(j?.data?.devices ?? []))
      .catch(() => {});
    fetch("/api/security/protocols")
      .then((r) => r.json())
      .then((j) => setProtocols(j?.data?.protocols ?? []))
      .catch(() => {});
    fetch("/api/access-requests")
      .then((r) => r.json())
      .then((j) => setAccessReqs(j?.data?.requests ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runDrill() {
    const r = await fetch("/api/admin/lockdown/drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "campus_lockdown_drill" }),
    });
    const j = await r.json();
    if (j?.data?.drill_id) setDrillMsg(`Drill completed (${j.data.drill_id.slice(0, 8)})`);
  }

  async function loadReport(fw: string) {
    setFramework(fw);
    const r = await fetch(`/api/admin/compliance/report?framework=${fw}`);
    const j = await r.json();
    if (j?.data?.metrics) setReport(j.data.metrics);
  }

  async function decideAccess(id: string, decision: "approved" | "rejected") {
    await fetch(`/api/access-requests/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Multi-Gate Live Headcount</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runDrill}
            className="bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground"
          >
            Run Lockdown Drill
          </button>
          {drillMsg && <span className="text-xs text-primary">{drillMsg}</span>}
        </div>
      </div>

      <div className="divide-y divide-border">
        {headcount.map((g) => (
          <div key={g.gate_id} className="flex justify-between py-1.5 text-xs text-foreground">
            <span>{g.gate_name}</span>
            <span className="font-mono">
              IN: {g.in_today} • OUT: {g.out_today} • Net: {g.net_inside}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Gate Hardware Health ({devices.length})</h2>
        <div className="divide-y divide-border">
          {devices.map((d) => (
            <div key={d.id} className="flex justify-between py-1.5 text-xs text-foreground">
              <span>
                {d.serial} ({d.station_type}) — {d.gate_name ?? "Unassigned"}
              </span>
              <span className="uppercase text-primary">{d.health_state}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Emergency Response Protocols</h2>
        <div className="divide-y divide-border">
          {protocols.map((p) => (
            <div key={p.id} className="py-2 text-xs text-foreground">
              <strong>
                [{p.code}] {p.title}
              </strong>{" "}
              ({p.severity}) — {Array.isArray(p.steps) ? p.steps.join(" → ") : ""}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Compliance Report</h2>
          {(["JNTUH", "AICTE", "NBA"] as const).map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => loadReport(fw)}
              className={`px-2 py-1 text-xs ${
                framework === fw && report ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {fw}
            </button>
          ))}
        </div>
        {report && (
          <div className="text-xs text-foreground">
            Students: {report.active_students} • Faculty: {report.active_faculty} • 30d Movements:{" "}
            {report.gate_movements_30d} • Circulars: {report.circulars_published}/{report.circulars_total} • SOS
            Resolved: {report.sos_resolved}/{report.sos_total} • Drills: {report.lockdown_drills_completed}
          </div>
        )}
      </div>

      {accessReqs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Self-Service Access Requests</h2>
          <div className="divide-y divide-border">
            {accessReqs.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5 text-xs text-foreground">
                <span>
                  {r.requester_name ?? "User"} → <strong>{r.requested_role}</strong> ({r.status}) — {r.reason}
                </span>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => decideAccess(r.id, "approved")} className="text-primary underline">
                      Approve
                    </button>
                    <button type="button" onClick={() => decideAccess(r.id, "rejected")} className="text-destructive underline">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
