"use client";

import { useCallback, useEffect, useState } from "react";

interface ShiftRow {
  id: string;
  shift_date: string;
  template_name: string | null;
  status: string;
  is_extra?: boolean;
  extra_reason?: string | null;
}

interface PendingSlot {
  post_id: string;
  name: string;
  location_name: string;
  shift_id: string;
  shift_date: string;
  assigned_count: number;
  min_guards: number;
}

interface HandoverRow {
  id: string;
  post_name: string;
  from_name: string;
  to_name: string;
  status: string;
  notes: string | null;
}

export function ShiftPublisher() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [pending, setPending] = useState<PendingSlot[]>([]);
  const [handovers, setHandovers] = useState<HandoverRow[]>([]);
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [extraPostId, setExtraPostId] = useState("");
  const [extraOpId, setExtraOpId] = useState("");
  const [extraReason, setExtraReason] = useState("");

  const load = useCallback(() => {
    fetch("/api/security/shifts")
      .then((r) => r.json())
      .then((j) => setShifts(j?.data?.shifts ?? []))
      .catch(() => {});
    fetch("/api/security/shifts/pending-slots")
      .then((r) => r.json())
      .then((j) => setPending(j?.data?.pending_slots ?? []))
      .catch(() => {});
    fetch("/api/security/shifts/handover")
      .then((r) => r.json())
      .then((j) => setHandovers(j?.data?.handovers ?? []))
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

  async function createExtraShift(e: React.FormEvent) {
    e.preventDefault();
    if (!extraPostId.trim() || !extraOpId.trim()) return;
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    await fetch("/api/security/shifts/extra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: extraPostId.trim(),
        operator_id: extraOpId.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        reason: extraReason.trim() || "Extra coverage",
      }),
    });
    setExtraPostId("");
    setExtraOpId("");
    setExtraReason("");
    load();
  }

  async function acceptHandover(id: string) {
    await fetch(`/api/security/shifts/handover/${id}/accept`, { method: "POST" });
    load();
  }

  return (
    <div className="space-y-6">
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

      {pending.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase text-destructive">
            Pending Place Slots ({pending.length})
          </h3>
          <div className="divide-y divide-border">
            {pending.map((p) => (
              <div key={`${p.shift_id}-${p.post_id}`} className="flex justify-between py-1.5 text-xs text-foreground">
                <span>
                  {p.name} ({p.location_name}) — {p.shift_date.slice(0, 10)}
                </span>
                <span className="text-destructive">
                  {p.assigned_count}/{p.min_guards} assigned
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={createExtraShift} className="grid gap-2 sm:grid-cols-4">
        <input
          type="text"
          value={extraPostId}
          onChange={(e) => setExtraPostId(e.target.value)}
          placeholder="Post UUID"
          className="border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          required
        />
        <input
          type="text"
          value={extraOpId}
          onChange={(e) => setExtraOpId(e.target.value)}
          placeholder="Guard UUID"
          className="border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          required
        />
        <input
          type="text"
          value={extraReason}
          onChange={(e) => setExtraReason(e.target.value)}
          placeholder="Extra shift reason"
          className="border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        />
        <button type="submit" className="bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Assign Extra Shift
        </button>
      </form>

      {handovers.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Shift Handovers</h3>
          <div className="divide-y divide-border">
            {handovers.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-xs text-foreground">
                <span>
                  {h.post_name}: {h.from_name} → {h.to_name} ({h.status})
                </span>
                {h.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => acceptHandover(h.id)}
                    className="border border-border px-2 py-0.5 text-xs text-primary"
                  >
                    Accept Handover
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {shifts.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 text-sm text-foreground">
            <span>
              {s.shift_date.slice(0, 10)} • {s.is_extra ? `Extra (${s.extra_reason ?? "coverage"})` : s.template_name ?? "Shift"}
            </span>
            <span className="text-xs font-medium uppercase text-primary">{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
