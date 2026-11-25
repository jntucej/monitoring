"use client";

import { useState } from "react";
import { PlacesEditor } from "@/components/security/PlacesEditor";
import { ShiftPublisher } from "@/components/security/ShiftPublisher";
import { LiveMap } from "@/components/security/LiveMap";

export default function SupervisorSecurityPage() {
  const [tab, setTab] = useState<"live" | "shifts" | "places">("live");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Campus Security & SOS</h1>
        <div className="flex gap-2">
          {(["live", "shifts", "places"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase border ${
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "live" && <LiveMap />}
      {tab === "shifts" && <ShiftPublisher />}
      {tab === "places" && <PlacesEditor />}
    </div>
  );
}
