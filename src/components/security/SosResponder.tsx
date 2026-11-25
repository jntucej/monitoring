"use client";

import { useState } from "react";

export function SosResponder({
  sosId,
  dispatchId,
  status,
  onUpdated,
}: {
  sosId: string;
  dispatchId: string;
  status: string;
  onUpdated: () => void;
}) {
  const [notes, setNotes] = useState("");

  async function step(action: "en_route" | "on_scene" | "cleared") {
    await fetch(`/api/sos/${sosId}/dispatch/${dispatchId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes.trim() || undefined }),
    });
    onUpdated();
  }

  return (
    <div className="space-y-3 border border-border bg-card p-4">
      <div className="text-sm font-semibold text-foreground">
        Active SOS Response • Status: {status.replace("_", " ")}
      </div>
      {status === "accepted" && (
        <button
          type="button"
          onClick={() => step("en_route")}
          className="w-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
        >
          Mark En Route
        </button>
      )}
      {status === "en_route" && (
        <button
          type="button"
          onClick={() => step("on_scene")}
          className="w-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
        >
          Mark On Scene
        </button>
      )}
      {status === "on_scene" && (
        <div className="space-y-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Resolution notes"
            className="w-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => step("cleared")}
            className="w-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Mark Cleared / Resolved
          </button>
        </div>
      )}
    </div>
  );
}
