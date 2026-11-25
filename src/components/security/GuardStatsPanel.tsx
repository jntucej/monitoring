"use client";

import { useCallback, useEffect, useState } from "react";

interface GuardStat {
  operator_id: string;
  operator_code: string;
  operator_name: string;
  total_shifts: number;
  extra_shifts: number;
  no_shows: number;
  hours_worked: number;
  sos_accepted: number;
  sos_cleared: number;
  avg_ack_seconds: number | null;
}

export function GuardStatsPanel() {
  const [guards, setGuards] = useState<GuardStat[]>([]);
  const [filter, setFilter] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/security/stats?days=30")
      .then((r) => r.json())
      .then((j) => setGuards(j?.data?.guards ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function notifyGuard(operatorId: string, name: string) {
    const msg = noticeMsg.trim() || `Supervisor check-in for ${name}`;
    await fetch("/api/security/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operator_id: operatorId,
        title: "Supervisor Notice",
        message: msg,
        priority: "high",
      }),
    });
    setNoticeMsg("");
  }

  const filtered = guards.filter(
    (g) =>
      !filter.trim() ||
      g.operator_name.toLowerCase().includes(filter.toLowerCase()) ||
      g.operator_code.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter guards by name or code..."
          className="flex-1 border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        />
        <input
          type="text"
          value={noticeMsg}
          onChange={(e) => setNoticeMsg(e.target.value)}
          placeholder="Optional message before clicking Notify"
          className="flex-1 border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        />
      </div>

      <div className="divide-y divide-border">
        {filtered.map((g) => (
          <div key={g.operator_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm text-foreground">
            <div>
              <strong>{g.operator_name}</strong> ({g.operator_code})
              <div className="text-xs text-muted-foreground">
                Hours: {g.hours_worked}h • Shifts: {g.total_shifts} (Extra: {g.extra_shifts}, No-show: {g.no_shows}) • SOS: {g.sos_cleared}/{g.sos_accepted}
                {g.avg_ack_seconds != null ? ` • Avg ack: ${g.avg_ack_seconds}s` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => notifyGuard(g.operator_id, g.operator_name)}
              className="border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Notify
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
