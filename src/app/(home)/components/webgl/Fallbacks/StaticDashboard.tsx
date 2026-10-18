"use client";

import type { HomeAccent } from "../../cinematic";

const ACCENT_HEX: Record<HomeAccent, string> = {
  amber: "#F59E0B",
  indigo: "#6366F1",
  steel: "#0EA5E9",
  crimson: "#EF4444",
  navy: "#1E3A5F",
};

export interface StaticDashboardProps {
  accent?: HomeAccent;
}

const METRICS = [
  { label: "Scan Rate", value: "98.4%" },
  { label: "On Campus", value: "2,847" },
  { label: "Open Alerts", value: "3" },
];

export function StaticDashboard({ accent = "amber" }: StaticDashboardProps) {
  const color = ACCENT_HEX[accent];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="min-w-[180px] rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${color}33`,
              boxShadow: `0 8px 32px ${color}11, inset 0 1px 0 rgba(255,255,255,0.06)`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <div
              className="text-xs uppercase tracking-wider"
              style={{ color: "rgba(248,250,252,0.6)" }}
            >
              {m.label}
            </div>
            <div
              className="mt-2 text-3xl font-bold tabular-nums"
              style={{ color: "#FFFFFF" }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
