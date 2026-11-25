"use client";

import { useState } from "react";
import { PlacesEditor } from "@/components/security/PlacesEditor";
import { ShiftPublisher } from "@/components/security/ShiftPublisher";
import { LiveMap } from "@/components/security/LiveMap";
import { GateLogsPanel } from "@/components/security/GateLogsPanel";
import { GuardStatsPanel } from "@/components/security/GuardStatsPanel";
import { OpsCompliancePanel } from "@/components/security/OpsCompliancePanel";

type TabKey = "live" | "gates" | "shifts" | "places" | "stats" | "ops";

export default function SupervisorSecurityPage() {
  const [tab, setTab] = useState<TabKey>("live");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Campus Security & Shift Operations</h1>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["live", "Live"],
              ["gates", "Gate Logs & CSV"],
              ["shifts", "Shifts & Handover"],
              ["places", "Places (Geo)"],
              ["stats", "Guard Stats"],
              ["ops", "Ops & Protocols"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase border ${
                tab === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "live" && <LiveMap />}
      {tab === "gates" && <GateLogsPanel />}
      {tab === "shifts" && <ShiftPublisher />}
      {tab === "places" && <PlacesEditor />}
      {tab === "stats" && <GuardStatsPanel />}
      {tab === "ops" && <OpsCompliancePanel />}
    </div>
  );
}
