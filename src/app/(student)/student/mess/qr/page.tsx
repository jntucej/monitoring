"use client";

import { useCallback, useEffect, useState } from "react";

interface QrPayload {
  qr: string;
  counter: number;
  expires_in_s: number;
  already_scanned: boolean;
  session: { meal_date: string; meal_type: string };
}

interface PollItem {
  id: string;
  proposed_item: string;
  meal_type: string;
  closes_at: string;
}

export default function StudentMessQrPage() {
  const [qrData, setQrData] = useState<QrPayload | null>(null);
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadQr = useCallback(() => {
    fetch("/api/mess/my-qr")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.qr) {
          setQrData(j.data);
          setError(null);
        } else {
          setError(j?.error?.message ?? "No active meal session");
        }
      })
      .catch(() => setError("Failed to load rotating QR"));
  }, []);

  useEffect(() => {
    loadQr();
    const id = setInterval(loadQr, 15_000);
    fetch("/api/mess/interest-polls?status=open")
      .then((r) => r.json())
      .then((j) => setPolls(j?.data?.polls ?? []))
      .catch(() => {});
    return () => clearInterval(id);
  }, [loadQr]);

  async function vote(pollId: string, v: "yes" | "maybe" | "no") {
    await fetch(`/api/mess/interest-polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: v }),
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-xl font-bold text-foreground">My Rotating Mess Token</h1>

      {error && <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{error}</div>}

      {qrData && (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className="text-sm font-semibold uppercase text-primary">
            {qrData.session.meal_type} • {qrData.session.meal_date}
          </div>
          <div className="mt-3 break-all rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
            {qrData.qr}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Rotates every 30s (refresh in ~{qrData.expires_in_s}s) • Counter #{qrData.counter}
            {qrData.already_scanned ? " • Already scanned this session" : ""}
          </div>
        </div>
      )}

      {polls.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Open Dish Interest Polls</h2>
          {polls.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <div className="font-medium text-foreground">{p.proposed_item}</div>
                <div className="text-xs text-muted-foreground">{p.meal_type}</div>
              </div>
              <div className="flex gap-1.5">
                {(["yes", "maybe", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => vote(p.id, v)}
                    className="rounded border border-border px-2.5 py-1 text-xs font-medium uppercase text-foreground hover:bg-muted"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
