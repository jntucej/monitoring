"use client";

export interface OfferedDispatch {
  id: string;
  sos_id: string;
  category: string;
  priority: string;
  location_name: string | null;
  distance_m: number | null;
  student_roll: string | null;
}

export function SosInbox({
  offer,
  onUpdated,
}: {
  offer: OfferedDispatch;
  onUpdated: () => void;
}) {
  async function accept() {
    await fetch(`/api/sos/${offer.sos_id}/dispatch/${offer.id}/accept`, { method: "POST" });
    onUpdated();
  }

  async function decline() {
    await fetch(`/api/sos/${offer.sos_id}/dispatch/${offer.id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "unavailable" }),
    });
    onUpdated();
  }

  return (
    <div className="space-y-4 border-2 border-destructive bg-card p-5">
      <div className="text-lg font-bold uppercase text-destructive">
        {offer.priority} SOS — {offer.category}
      </div>
      <div className="text-sm text-foreground">
        {offer.location_name ?? "Campus"}
        {offer.distance_m != null ? ` • ${offer.distance_m}m away` : ""}
      </div>
      {offer.student_roll && (
        <div className="text-xs text-muted-foreground">Student: {offer.student_roll}</div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={accept}
          className="flex-1 bg-primary py-2 text-sm font-bold text-primary-foreground"
        >
          ACCEPT
        </button>
        <button
          type="button"
          onClick={decline}
          className="flex-1 border border-border py-2 text-sm font-semibold text-foreground"
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
