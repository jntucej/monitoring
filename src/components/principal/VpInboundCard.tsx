// src/components/principal/VpInboundCard.tsx
// Principal's side of the bridge: items VP has flagged upward, with the
// Principal's ability to acknowledge / respond. Backed by /api/principal/inbound
// + /api/principal/inbound/[id]/respond.

"use client";

import { useEffect, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, ArrowUpRight } from "lucide-react";

interface InboundItem {
  id: string;
  note: string;
  status: string;
  created_by_name: string | null;
  created_at: string;
  ticket_number: string | null;
  response_note: string | null;
}

async function load(): Promise<{ items: InboundItem[]; open: number } | null> {
  try {
    const res = await fetch("/api/principal/inbound", { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function respond(flagId: string, action: "ACKNOWLEDGED" | "RESOLVED", note: string) {
  const res = await fetch(`/api/principal/inbound/${flagId}/respond`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, note }),
  });
  return res;
}

export function VpInboundCard() {
  const [data, setData] = useState<{ items: InboundItem[]; open: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const d = await load();
    if (d) setData(d);
  };

  useEffect(() => {
    refresh();
  }, []);
  usePolling(refresh, { intervalMs: 60_000, enabled: true });

  const open = (data?.items ?? []).filter((i) => i.status === "OPEN");

  const doRespond = async (flagId: string, action: "ACKNOWLEDGED" | "RESOLVED") => {
    setBusy(true);
    await respond(flagId, action, action === "ACKNOWLEDGED" ? "Acknowledged" : "Resolved");
    setBusy(false);
    refresh();
  };

  return (
    <WidgetBoundary name="VpInbound" title="From the Vice Principal">
      <div className="space-y-2">
        {!data ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading bridge…
          </div>
        ) : open.length === 0 ? (
          <div className="py-4 text-center text-sm text-text-muted">
            <Inbox className="w-5 h-5 mx-auto mb-1 text-text-muted" />
            No open items flagged by the Vice Principal.
          </div>
        ) : (
          open.slice(0, 5).map((i) => (
            <div
              key={i.id}
              className="surface-card bg-bg-elevated/30 p-3 space-y-2 min-w-0"
            >
              <div className="flex items-start gap-2 min-w-0">
                <ArrowUpRight className="w-4 h-4 text-action-info shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-text-secondary break-words">{i.note}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {i.created_by_name ?? "VP"}
                    {i.ticket_number ? ` · ${i.ticket_number}` : ""} ·{" "}
                    {new Date(i.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => doRespond(i.id, "ACKNOWLEDGED")}
                  disabled={busy}
                  className="surface-card px-2 py-1 text-xs font-semibold hover:bg-action-info/10 disabled:opacity-50"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => doRespond(i.id, "RESOLVED")}
                  disabled={busy}
                  className="surface-card px-2 py-1 text-xs font-semibold hover:bg-action-success/10 disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetBoundary>
  );
}
