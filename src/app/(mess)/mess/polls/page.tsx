"use client";

import { useCallback, useEffect, useState } from "react";
import { InterestResultCard, type InterestResultData } from "@/components/mess/InterestResultCard";

interface PollRow {
  id: string;
  proposed_item: string;
  meal_type: string;
  status: string;
  closes_at: string;
}

export default function MessPollsPage() {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [results, setResults] = useState<Record<string, InterestResultData>>({});
  const [proposedItem, setProposedItem] = useState("");
  const [mealType, setMealType] = useState("lunch");

  const load = useCallback(async () => {
    const r = await fetch("/api/mess/interest-polls");
    const j = await r.json();
    const list: PollRow[] = j?.data?.polls ?? [];
    setPolls(list);
    for (const p of list.slice(0, 10)) {
      fetch(`/api/mess/interest-polls/${p.id}/result`)
        .then((res) => res.json())
        .then((rj) => {
          if (rj?.data) {
            setResults((prev) => ({ ...prev, [p.id]: rj.data }));
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPoll(e: React.FormEvent) {
    e.preventDefault();
    if (!proposedItem.trim()) return;
    const closesAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const r = await fetch("/api/mess/interest-polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposed_item: proposedItem.trim(),
        meal_type: mealType,
        closes_at: closesAt,
      }),
    });
    if (r.ok) {
      setProposedItem("");
      void load();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">Mess Interest Polls</h1>

      <form onSubmit={createPoll} className="flex gap-2 rounded-xl border border-border bg-card p-4">
        <input
          type="text"
          value={proposedItem}
          onChange={(e) => setProposedItem(e.target.value)}
          placeholder="Proposed dish (e.g. Paneer Tikka)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          required
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="snacks">Snacks</option>
          <option value="dinner">Dinner</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
        >
          Open Poll
        </button>
      </form>

      <div className="space-y-4">
        {polls.map((p) =>
          results[p.id] ? (
            <InterestResultCard key={p.id} data={results[p.id]} onDecided={load} />
          ) : (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
              {p.proposed_item} ({p.meal_type}) — {p.status}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
