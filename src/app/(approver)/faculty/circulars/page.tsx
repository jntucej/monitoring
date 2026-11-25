"use client";

import { useCallback, useEffect, useState } from "react";

interface InboxCircular {
  id: string;
  title: string;
  circular_no: string | null;
  deadline: string | null;
  summary: string | null;
  noted_at: string | null;
  my_relay_count: number;
  share_token: string | null;
}

export default function FacultyCircularsPage() {
  const [items, setItems] = useState<InboxCircular[]>([]);
  const [targetLabel, setTargetLabel] = useState("CSE-3A");

  const load = useCallback(() => {
    fetch("/api/circulars/my-inbox")
      .then((r) => r.json())
      .then((j) => setItems(j?.data?.all ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markNoted(id: string) {
    await fetch(`/api/circulars/${id}/noted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    load();
  }

  async function relayToClass(id: string) {
    await fetch(`/api/circulars/${id}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relay_chain: "academic",
        target_label: targetLabel.trim() || "Class / Mentees",
      }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">Faculty Circulars & Class Relay</h1>
        <input
          type="text"
          value={targetLabel}
          onChange={(e) => setTargetLabel(e.target.value)}
          placeholder="Section / Lab / Mentees"
          className="border-b border-border py-1 text-xs text-foreground"
        />
      </div>

      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">No circulars assigned to you yet.</div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-foreground">
              <div>
                <strong>{c.title}</strong>
                {c.circular_no ? ` (${c.circular_no})` : ""}
                <div className="text-xs text-muted-foreground">
                  {c.summary ?? ""} {c.deadline ? `• Deadline: ${c.deadline.slice(0, 10)}` : ""} • Relays: {c.my_relay_count}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={Boolean(c.noted_at)}
                  onClick={() => markNoted(c.id)}
                  className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {c.noted_at ? "Noted" : "Mark Noted"}
                </button>
                <button
                  type="button"
                  onClick={() => relayToClass(c.id)}
                  className="border border-border px-3 py-1 text-xs text-foreground"
                >
                  Relay to {targetLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
