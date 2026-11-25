"use client";

import { useCallback, useEffect, useState } from "react";

interface SpecialSchedule {
  id: string;
  item_name: string;
  counter_name: string;
  meal_date: string;
  meal_type: string;
  expected_count: number;
  served_count: number;
  status: string;
}

export default function MessSpecialPage() {
  const [items, setItems] = useState<SpecialSchedule[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [counterId, setCounterId] = useState("");
  const [itemName, setItemName] = useState("");
  const [expectedCount, setExpectedCount] = useState("150");

  const load = useCallback(() => {
    fetch("/api/mess/special-items")
      .then((r) => r.json())
      .then((j) => setItems(j?.data?.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    fetch("/api/mess/live")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.session?.id) setSessionId(j.data.session.id);
        if (j?.data?.counters?.[0]?.id) setCounterId(j.data.counters[0].id);
      })
      .catch(() => {});
  }, [load]);

  async function createSpecial(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !counterId || !itemName.trim()) return;
    const r = await fetch("/api/mess/special-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        counter_id: counterId,
        item_name: itemName.trim(),
        expected_count: Number(expectedCount),
      }),
    });
    if (r.ok) {
      setItemName("");
      load();
    }
  }

  async function closeSpecial(id: string) {
    await fetch(`/api/mess/special-items/${id}/close`, { method: "POST" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Special Item Schedules</h1>

      <form onSubmit={createSpecial} className="grid gap-3 border-b border-border pb-4 sm:grid-cols-4">
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Item name (e.g. Paneer Tikka)"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground sm:col-span-2"
          required
        />
        <input
          type="number"
          value={expectedCount}
          onChange={(e) => setExpectedCount(e.target.value)}
          min={1}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          required
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Schedule
        </button>
      </form>

      <div className="divide-y divide-border">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold text-foreground">{it.item_name}</div>
              <div className="text-xs text-muted-foreground">
                {it.meal_date} • {it.meal_type} • {it.counter_name} • {it.served_count}/{it.expected_count} ({it.status})
              </div>
            </div>
            {it.status !== "closed" && (
              <button
                type="button"
                onClick={() => closeSpecial(it.id)}
                className="rounded border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
              >
                Close
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
