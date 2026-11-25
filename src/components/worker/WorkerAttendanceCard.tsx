"use client";

import { useCallback, useEffect, useState } from "react";

interface AssignmentRow {
  id: string;
  worker_type_label: string | null;
  worker_type_code: string;
  block_id: string | null;
  shift_name: string;
  starts_at: string;
  ends_at: string;
}

interface AttendanceLog {
  id: string;
  direction: "IN" | "OUT";
  block_id: string | null;
  logged_at: string;
  notes: string | null;
}

export function WorkerAttendanceCard() {
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [currentState, setCurrentState] = useState<"IN" | "OUT">("OUT");
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/workers/assignments")
      .then((r) => r.json())
      .then((j) => setAssignment(j?.data?.assignments?.[0] ?? null))
      .catch(() => {});
    fetch("/api/workers/attendance")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.current_state) setCurrentState(j.data.current_state);
        setLogs(j?.data?.logs ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function clock(direction: "IN" | "OUT" | "PING") {
    setBusy(true);
    try {
      let coords: { lat?: number; lng?: number } = {};
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({}),
            { enableHighAccuracy: true, timeout: 4000 },
          );
        });
      }
      await fetch("/api/workers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, ...coords }),
      });
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            My Assignment & In/Out Logs
          </h2>
          <p className="text-xs text-muted-foreground">
            {assignment
              ? `${assignment.worker_type_label ?? assignment.worker_type_code} • Block: ${assignment.block_id ?? "Campus"} • ${assignment.shift_name} (${assignment.starts_at.slice(0, 5)}–${assignment.ends_at.slice(0, 5)})`
              : "No block assignment yet — contact Admin / Supervisor"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-primary">
            Status: {currentState}
          </span>
          <button
            type="button"
            disabled={busy || currentState === "IN"}
            onClick={() => clock("IN")}
            className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Clock IN
          </button>
          {currentState === "IN" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => clock("PING")}
              className="border border-border px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-40"
            >
              Ping Location
            </button>
          )}
          <button
            type="button"
            disabled={busy || currentState === "OUT"}
            onClick={() => clock("OUT")}
            className="border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-40"
          >
            Clock OUT
          </button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {logs.length === 0 ? (
          <div className="py-2 text-xs text-muted-foreground">No in/out logs recorded yet.</div>
        ) : (
          logs.slice(0, 15).map((l) => (
            <div key={l.id} className="flex items-center justify-between py-1.5 text-xs text-foreground">
              <span>
                <strong>{l.direction}</strong> • {l.block_id ?? "Campus"}
                {l.notes ? ` — ${l.notes}` : ""}
              </span>
              <span className="text-muted-foreground">{new Date(l.logged_at).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
