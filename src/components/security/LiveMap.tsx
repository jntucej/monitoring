"use client";

import { useCallback, useEffect, useState } from "react";

interface LiveGuard {
  assignment_id: string;
  operator_name: string;
  post_name: string;
  assignment_status: string;
  last_ping_at: string | null;
}

interface ActiveSos {
  id: string;
  category: string;
  priority: string;
  status: string;
  location_name: string | null;
  student_roll: string | null;
}

export function LiveMap() {
  const [guards, setGuards] = useState<LiveGuard[]>([]);
  const [sosList, setSosList] = useState<ActiveSos[]>([]);

  const load = useCallback(() => {
    fetch("/api/security/live")
      .then((r) => r.json())
      .then((j) => {
        setGuards(j?.data?.guards ?? []);
        setSosList(j?.data?.active_sos ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Active SOS ({sosList.length})</h3>
        {sosList.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">No active SOS requests.</p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {sosList.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 text-sm text-foreground">
                <span>
                  <strong className="text-destructive">{s.priority.toUpperCase()}</strong> • {s.category} —{" "}
                  {s.location_name ?? "Campus"} ({s.student_roll ?? "Student"})
                </span>
                <span className="text-xs uppercase text-primary">{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Guards On Shift ({guards.length})</h3>
        <div className="mt-2 divide-y divide-border">
          {guards.map((g) => (
            <div key={g.assignment_id} className="flex items-center justify-between py-2 text-sm text-foreground">
              <span>
                {g.operator_name} — {g.post_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {g.assignment_status} •{" "}
                {g.last_ping_at ? new Date(g.last_ping_at).toLocaleTimeString() : "NO PING"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
