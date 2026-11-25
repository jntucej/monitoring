"use client";

import { useCallback, useEffect, useState } from "react";

interface SosDetail {
  sos: { id: string; category: string; priority: string; status: string; location_name: string | null };
  dispatches: Array<{ id: string; operator_name: string | null; status: string; distance_m: number | null }>;
}

export function SosStatusCard({ sosId, onDone }: { sosId: string; onDone?: () => void }) {
  const [detail, setDetail] = useState<SosDetail | null>(null);

  const load = useCallback(() => {
    fetch(`/api/sos/${sosId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.sos) setDetail(j.data);
      })
      .catch(() => {});
  }, [sosId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function cancelSos() {
    await fetch(`/api/sos/${sosId}/cancel`, { method: "POST" });
    load();
    onDone?.();
  }

  if (!detail) return <div className="text-sm text-foreground">Loading SOS status...</div>;

  const activeGuard = detail.dispatches.find((d) =>
    ["accepted", "en_route", "on_scene"].includes(d.status),
  );

  return (
    <div className="space-y-3 border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase text-foreground">
          SOS • {detail.sos.category} ({detail.sos.priority})
        </span>
        <span className="text-xs font-semibold uppercase text-primary">{detail.sos.status}</span>
      </div>
      {detail.sos.location_name && (
        <div className="text-xs text-muted-foreground">Location: {detail.sos.location_name}</div>
      )}
      {activeGuard ? (
        <div className="text-sm text-foreground">
          Guard: {activeGuard.operator_name ?? "Assigned"} ({activeGuard.status.replace("_", " ")})
          {activeGuard.distance_m != null ? ` • ${activeGuard.distance_m}m away` : ""}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Paging nearest guards on shift...</div>
      )}
      {["open", "dispatched", "en_route"].includes(detail.sos.status) && (
        <button
          type="button"
          onClick={cancelSos}
          className="border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
        >
          Cancel SOS
        </button>
      )}
    </div>
  );
}
