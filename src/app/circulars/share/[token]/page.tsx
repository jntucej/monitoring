"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface SharedCircular {
  id: string;
  title: string;
  circular_no: string | null;
  issued_by: string | null;
  deadline: string | null;
  summary: string | null;
}

interface RelayRow {
  relay_chain: string;
  target_label: string;
  relayed_by_name: string | null;
  relayed_by_role: string;
  relayed_at: string;
}

export default function SharedCircularPage() {
  const params = useParams<{ token: string }>();
  const [circ, setCirc] = useState<SharedCircular | null>(null);
  const [relays, setRelays] = useState<RelayRow[]>([]);
  const [noted, setNoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.token) return;
    fetch(`/api/circulars/share/${params.token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.circular) {
          setCirc(j.data.circular);
          setRelays(j.data.relays ?? []);
        } else {
          setError(j?.error?.message ?? "Circular not found");
        }
      })
      .catch(() => setError("Failed to load circular"));
  }, [params?.token]);

  async function markNoted() {
    if (!circ) return;
    const r = await fetch(`/api/circulars/${circ.id}/noted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (r.ok) setNoted(true);
  }

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>;
  if (!circ) return <div className="p-6 text-sm text-foreground">Loading circular...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="text-xl font-bold text-foreground">{circ.title}</h1>
      <div className="text-xs text-muted-foreground">
        {circ.circular_no ? `Ref: ${circ.circular_no} • ` : ""}
        {circ.issued_by ? `Issued by: ${circ.issued_by} • ` : ""}
        {circ.deadline ? `Deadline: ${circ.deadline.slice(0, 10)}` : ""}
      </div>
      {circ.summary && <p className="text-sm text-foreground">{circ.summary}</p>}

      <button
        type="button"
        disabled={noted}
        onClick={markNoted}
        className="bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {noted ? "Marked as Noted" : "Mark Noted"}
      </button>

      {relays.length > 0 && (
        <div className="space-y-1 pt-4">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground">Relay Chain</h2>
          <div className="divide-y divide-border">
            {relays.map((r, i) => (
              <div key={i} className="py-1.5 text-xs text-foreground">
                [{r.relay_chain}] {r.target_label} — by {r.relayed_by_name ?? r.relayed_by_role}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
