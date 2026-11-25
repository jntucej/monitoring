"use client";

import { useEffect, useState } from "react";

interface LocationOption {
  id: string;
  code: string;
  name: string;
}

export function SosButton({ onCreated }: { onCreated: (sosId: string) => void }) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [category, setCategory] = useState("unsafe");
  const [priority, setPriority] = useState<"normal" | "urgent" | "critical">("urgent");
  const [chosenLocId, setChosenLocId] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/security/locations")
      .then((r) => r.json())
      .then((j) => setLocations(j?.data?.locations ?? []))
      .catch(() => {});
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, []);

  async function sendSos(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          priority,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          chosen_loc_id: chosenLocId || null,
          description: description.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error?.message ?? "Failed to send SOS");
      } else if (j?.data?.id) {
        onCreated(j.data.id);
      }
    } catch {
      setError("Network error sending SOS");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={sendSos} className="space-y-4">
      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
        <div className="flex flex-wrap gap-2">
          {["harassment", "medical", "theft", "suspicious", "unsafe", "fire", "other"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium capitalize border ${
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Priority</label>
        <div className="flex gap-2">
          {(["normal", "urgent", "critical"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-1.5 text-xs font-medium capitalize border ${
                priority === p
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Location {coords ? `(GPS attached: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "(select place)"}
        </label>
        <select
          value={chosenLocId}
          onChange={(e) => setChosenLocId(e.target.value)}
          className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Auto-detect nearest campus location</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.code})
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional details (landmark, room, what happened)"
        className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
        rows={2}
      />

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-destructive py-3 text-base font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Sending SOS..." : "SEND SOS"}
      </button>
    </form>
  );
}
