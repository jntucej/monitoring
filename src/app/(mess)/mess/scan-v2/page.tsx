"use client";

import { useEffect, useState } from "react";
import { MessScanner } from "@/components/mess/MessScanner";

interface LiveData {
  session: { id: string; meal_type: string };
  counters: Array<{ id: string; name: string; served: number; capacity: number | null }>;
}

export default function MessScanV2Page() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [counterId, setCounterId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mess/live")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.session) {
          setLive(j.data);
          if (j.data.counters?.[0]?.id) setCounterId(j.data.counters[0].id);
        } else {
          setError(j?.error?.message ?? "No active meal session");
        }
      })
      .catch(() => setError("Failed to load active session"));
  }, []);

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!live || !counterId) return <div className="p-6 text-sm text-foreground">Loading mess scanner...</div>;

  const counter = live.counters.find((c) => c.id === counterId) ?? live.counters[0];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Mess Counter Scanner (Rotating TOTP)</h1>
        <select
          value={counterId}
          onChange={(e) => setCounterId(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
        >
          {live.counters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <MessScanner
        counterId={counter.id}
        counterName={counter.name}
        sessionId={live.session.id}
        mealType={live.session.meal_type}
        initialServed={counter.served}
        capacity={counter.capacity}
      />
    </div>
  );
}
