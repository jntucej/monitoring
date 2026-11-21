// src/components/vp/VpBridgeFlagCard.tsx
// The actionable side of the VP → Principal bridge: flag an item upward,
// and see the Principal's responses. Backed by /api/vp/bridge (GET + POST).

"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Flag, MessageSquare, CheckCircle2 } from "lucide-react";

interface Flag {
  id: string;
  ticket_id: string | null;
  note: string;
  status: string;
  created_by_name: string | null;
  created_at: string;
  responded_at: string | null;
}

async function loadFlags(): Promise<{
  vpToPrincipal: Flag[];
  principalToVp: Flag[];
} | null> {
  try {
    const res = await fetch("/api/vp/bridge", { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

export function VpBridgeFlagCard() {
  const [data, setData] = useState<{ vpToPrincipal: Flag[]; principalToVp: Flag[] } | null>(null);
  const [note, setNote] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const d = await loadFlags();
    if (d) setData(d);
  };

  useEffect(() => {
    refresh();
  }, []);
  usePolling(refresh, { intervalMs: 60_000, enabled: true });

  const submit = async () => {
    if (!note.trim()) {
      setError("Write a short note to flag.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vp/bridge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim(), ticketId: ticketId.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error?.message ?? "Failed to flag item.");
      return;
    }
    setNote("");
    setTicketId("");
    refresh();
  };

  const responses = (data?.principalToVp ?? []).slice(0, 3);

  return (
    <WidgetBoundary name="VpBridgeFlag" title="Flag to Principal">
      <div className="space-y-3">
        <div className="grid gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should the Principal know?"
            className="surface-card bg-bg-base px-3 py-2 text-sm min-w-0 w-full"
          />
          <div className="flex gap-2">
            <input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Ticket # (optional)"
              className="surface-card bg-bg-base px-3 py-1.5 text-xs flex-1 min-w-0"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white disabled:opacity-50 shrink-0"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              Flag
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-action-danger">{error}</p>}

        {responses.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> From Principal
            </p>
            {responses.map((r) => (
              <div key={r.id} className="text-xs text-text-secondary flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-action-success shrink-0 mt-0.5" />
                <span>{r.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}
