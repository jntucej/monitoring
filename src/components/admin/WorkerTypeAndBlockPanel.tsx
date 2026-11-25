"use client";

import { useCallback, useEffect, useState } from "react";

interface WorkerType {
  id: string;
  code: string;
  label: string;
}

interface WorkerUser {
  id: string;
  unique_id: string;
  name: string;
}

interface AssignmentRow {
  id: string;
  worker_name: string;
  worker_code: string;
  worker_type_label: string | null;
  worker_type_code: string;
  block_id: string | null;
  shift_name: string;
}

interface AttendanceLog {
  id: string;
  worker_name: string;
  worker_code: string;
  worker_type_label: string | null;
  direction: string;
  block_id: string | null;
  logged_at: string;
}

export function WorkerTypeAndBlockPanel() {
  const [types, setTypes] = useState<WorkerType[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [typeCode, setTypeCode] = useState("kitchen");
  const [blockId, setBlockId] = useState("Block A");
  const [shiftName, setShiftName] = useState("Morning");

  const load = useCallback(() => {
    fetch("/api/workers/types")
      .then((r) => r.json())
      .then((j) => setTypes(j?.data?.types ?? []))
      .catch(() => {});
    fetch("/api/workers/assignments")
      .then((r) => r.json())
      .then((j) => {
        setAssignments(j?.data?.assignments ?? []);
        const wList: WorkerUser[] = j?.data?.workers ?? [];
        setWorkers(wList);
        if (wList[0]?.id && !workerId) setWorkerId(wList[0].id);
      })
      .catch(() => {});
    fetch("/api/workers/attendance")
      .then((r) => r.json())
      .then((j) => setLogs(j?.data?.logs ?? []))
      .catch(() => {});
  }, [workerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim()) return;
    await fetch("/api/workers/types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode.trim(), label: newLabel.trim() }),
    });
    setNewCode("");
    setNewLabel("");
    load();
  }

  async function assignWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId) return;
    await fetch("/api/workers/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worker_id: workerId,
        worker_type_code: typeCode,
        block_id: blockId.trim() || null,
        shift_name: shiftName,
      }),
    });
    load();
  }

  return (
    <div className="space-y-6 pt-6">
      <h2 className="text-base font-semibold text-foreground">
        Worker Types, Block Assignments & In/Out Logs
      </h2>

      <form onSubmit={addType} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Type code (e.g. carpentry)"
          className="border-b border-border py-1.5 text-xs text-foreground"
          required
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Respectful label (e.g. Carpentry & Woodwork)"
          className="flex-1 border-b border-border py-1.5 text-xs text-foreground"
          required
        />
        <button type="submit" className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Add Worker Type
        </button>
      </form>

      <form onSubmit={assignWorker} className="grid gap-2 sm:grid-cols-5">
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="border-b border-border py-1.5 text-xs text-foreground"
        >
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.unique_id})
            </option>
          ))}
        </select>
        <select
          value={typeCode}
          onChange={(e) => setTypeCode(e.target.value)}
          className="border-b border-border py-1.5 text-xs text-foreground"
        >
          {types.map((t) => (
            <option key={t.id} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={blockId}
          onChange={(e) => setBlockId(e.target.value)}
          placeholder="Block (e.g. Block A)"
          className="border-b border-border py-1.5 text-xs text-foreground"
        />
        <select
          value={shiftName}
          onChange={(e) => setShiftName(e.target.value)}
          className="border-b border-border py-1.5 text-xs text-foreground"
        >
          <option value="Morning">Morning (06:00–14:00)</option>
          <option value="Evening">Evening (14:00–22:00)</option>
          <option value="Night">Night (22:00–06:00)</option>
        </select>
        <button type="submit" className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Assign Block & Shift
        </button>
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Active Block Assignments ({assignments.length})
          </h3>
          <div className="mt-2 divide-y divide-border">
            {assignments.map((a) => (
              <div key={a.id} className="py-1.5 text-xs text-foreground">
                <strong>{a.worker_name}</strong> ({a.worker_code}) —{" "}
                {a.worker_type_label ?? a.worker_type_code} • {a.block_id ?? "Campus"} • {a.shift_name}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Recent Worker In/Out Logs ({logs.length})
          </h3>
          <div className="mt-2 divide-y divide-border">
            {logs.slice(0, 15).map((l) => (
              <div key={l.id} className="flex justify-between py-1.5 text-xs text-foreground">
                <span>
                  <strong>{l.direction}</strong> • {l.worker_name} ({l.worker_type_label ?? "Support"}) •{" "}
                  {l.block_id ?? "Campus"}
                </span>
                <span className="text-muted-foreground">{new Date(l.logged_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
