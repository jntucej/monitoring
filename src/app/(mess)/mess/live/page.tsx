"use client";

import { useCallback, useEffect, useState } from "react";

interface LivePayload {
  session: { id: string; meal_date: string; meal_type: string; window_opens_at: string; window_closes_at: string };
  total_expected: number;
  total_served: number;
  counters: Array<{ id: string; name: string; served: number; capacity: number | null }>;
  specials: Array<{ id: string; item_name: string; counter_name: string; served_count: number; expected_count: number; status: string }>;
  anomalies: Array<{ id: string; roll_no: string; student_name: string; outcome: string; reason_text: string | null; scanned_at: string }>;
}

export default function MessLivePage() {
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/mess/live")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setData(j.data);
        else setError(j?.error?.message ?? "No active session");
      })
      .catch(() => setError("Failed to load live control room"));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="p-6 text-sm text-foreground">Loading live control room...</div>;

  const pct = data.total_expected > 0 ? Math.round((data.total_served / data.total_expected) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-foreground">
            {data.session.meal_type} • {data.session.meal_date}
          </h1>
          <p className="text-sm text-foreground">
            Expected: {data.total_expected} • Served: {data.total_served} ({pct}%) • Remaining:{" "}
            {Math.max(0, data.total_expected - data.total_served)}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {data.counters.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">{c.name}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {c.served}
              {c.capacity ? <span className="text-sm font-normal text-muted-foreground"> / {c.capacity}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {data.specials.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Special Items</h2>
          <div className="mt-2 space-y-2">
            {data.specials.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm text-foreground">
                <span>
                  {s.item_name} ({s.counter_name})
                </span>
                <span className="font-mono">
                  {s.served_count}/{s.expected_count} • {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Live Anomalies</h2>
        {data.anomalies.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No anomalies in this session.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-foreground">
            {data.anomalies.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  {a.roll_no} ({a.student_name}) — {a.outcome}
                </span>
                <span className="text-muted-foreground">{new Date(a.scanned_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
