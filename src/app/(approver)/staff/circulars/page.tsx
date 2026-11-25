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
}

export default function StaffCircularsPage() {
  const [actionItems, setActionItems] = useState<InboxCircular[]>([]);
  const [personalItems, setPersonalItems] = useState<InboxCircular[]>([]);
  const [dutyLabel, setDutyLabel] = useState("Lab / Office Desk");

  const load = useCallback(() => {
    fetch("/api/circulars/my-inbox")
      .then((r) => r.json())
      .then((j) => {
        setActionItems(j?.data?.action_required_items ?? []);
        setPersonalItems(j?.data?.personal_notices ?? []);
      })
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

  async function logDutyRelay(id: string) {
    await fetch(`/api/circulars/${id}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        relay_chain: "operational",
        target_label: dutyLabel.trim() || "Operational Duty",
      }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-foreground">Staff Circulars & Operational Duties</h1>
        <input
          type="text"
          value={dutyLabel}
          onChange={(e) => setDutyLabel(e.target.value)}
          placeholder="Duty / Lab / Office"
          className="border-b border-border py-1 text-xs text-foreground"
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-destructive">
          Circulars Requiring Staff Action ({actionItems.length})
        </h2>
        <div className="divide-y divide-border">
          {actionItems.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-foreground">
              <div>
                <strong>{c.title}</strong>
                <div className="text-xs text-muted-foreground">
                  {c.summary ?? ""} {c.deadline ? `• Due: ${c.deadline.slice(0, 10)}` : ""}
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
                  onClick={() => logDutyRelay(c.id)}
                  className="border border-border px-3 py-1 text-xs text-foreground"
                >
                  Log Duty ({dutyLabel})
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">
          Personal Notices ({personalItems.length})
        </h2>
        <div className="divide-y divide-border">
          {personalItems.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm text-foreground">
              <span>{c.title}</span>
              <button
                type="button"
                disabled={Boolean(c.noted_at)}
                onClick={() => markNoted(c.id)}
                className="text-xs text-primary underline disabled:opacity-40"
              >
                {c.noted_at ? "Noted" : "Mark Noted"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
