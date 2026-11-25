"use client";

import { useCallback, useEffect, useState } from "react";

interface GateOption {
  id: string;
  name: string;
  gate_id: string | null;
}

interface GateLogRow {
  id: string;
  roll_no: string | null;
  person_name: string | null;
  direction: string | null;
  timestamp: string;
  operator_name: string | null;
  outcome: string | null;
  curfew_violation: boolean | null;
}

export function GateLogsPanel() {
  const [gates, setGates] = useState<GateOption[]>([]);
  const [gateId, setGateId] = useState("");
  const [filter, setFilter] = useState("");
  const [logs, setLogs] = useState<GateLogRow[]>([]);

  useEffect(() => {
    fetch("/api/security/locations")
      .then((r) => r.json())
      .then((j) => {
        const list: GateOption[] = (j?.data?.locations ?? []).filter(
          (l: GateOption) => Boolean(l.gate_id),
        );
        setGates(list);
        if (list[0]?.gate_id) setGateId(list[0].gate_id);
      })
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(() => {
    if (!gateId) return;
    fetch(`/api/security/gates/${gateId}/logs?q=${encodeURIComponent(filter)}`)
      .then((r) => r.json())
      .then((j) => setLogs(j?.data?.logs ?? []))
      .catch(() => {});
  }, [gateId, filter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={gateId}
          onChange={(e) => setGateId(e.target.value)}
          className="border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {gates.length === 0 && <option value="">No geo-linked gates yet</option>}
          {gates.map((g) => (
            <option key={g.id} value={g.gate_id ?? ""}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Type to filter roll, name, direction..."
          className="flex-1 border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        />
        {gateId && (
          <a
            href={`/api/security/gates/${gateId}/logs.csv`}
            className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Download CSV
          </a>
        )}
      </div>

      <div className="divide-y divide-border">
        {logs.length === 0 ? (
          <div className="py-4 text-xs text-muted-foreground">No movement logs for this gate.</div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2 text-sm text-foreground">
              <span>
                <strong>{l.direction}</strong> • {l.roll_no ?? "—"} {l.person_name ?? ""}
                {l.curfew_violation ? " (CURFEW)" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(l.timestamp).toLocaleString()} • {l.operator_name ?? "System"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
