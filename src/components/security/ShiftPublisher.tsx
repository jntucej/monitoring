"use client";

import { useCallback, useEffect, useState } from "react";

interface ShiftRow {
  id: string;
  shift_date: string;
  template_name: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
}

export function ShiftPublisher() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(() => {
    fetch("/api/security/shifts")
      .then((r) => r.json())
      .then((j) => setShifts(j?.data?.shifts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function publishToday() {
    await fetch("/api/security/shifts/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_date: shiftDate }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={publishToday}
          className="bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Publish Shifts
        </button>
      </div>

      <div className="divide-y divide-border">
        {shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 text-sm text-foreground">
            <span>
              {s.shift_date.slice(0, 10)} • {s.template_name ?? "Shift"}
            </span>
            <span className="text-xs font-medium uppercase text-primary">{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
