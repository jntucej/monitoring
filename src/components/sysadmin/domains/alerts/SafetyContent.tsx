// Safety — the cockpit sysadmin page body.
//
// Renders:
//   1. Four circular status arcs (one per gate_state, SVG, color by state)
//   2. An incident timeline (vertical list, newest first, open flagged)

"use client";

import { VIZ_THEME } from "@/components/sysadmin/kit/viz";
import type { SafetyData, SafetyGateState } from "@/components/sysadmin/domains/alerts/types";

// ── status → css var ─────────────────────────────────────────────────────────

const GATE_COLORS: Record<SafetyGateState, string> = {
  secure: "var(--action-primary)",
  elevated: "var(--action-warning)",
  critical: "var(--action-danger)",
};

// ── circular status arc (SVG) ────────────────────────────────────────────────

/** A ring whose fill fraction encodes the gate state:
 *   secure   → full ring
 *   elevated → three-quarter ring
 *   critical → half ring
 * The stroke color reflects the state. */
function GateArc({
  code,
  state,
}: {
  code: string;
  state: SafetyGateState;
}) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Fraction of the ring drawn, by state.
  const fraction = state === "secure" ? 1 : state === "elevated" ? 0.75 : 0.5;
  const offset = c * (1 - fraction);

  const color = GATE_COLORS[state];
  const stateLabel =
    state === "secure" ? "Secure" : state === "elevated" ? "Elevated" : "Critical";

  return (
    <div
      className="flex flex-col items-center rounded-lg border p-3"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Gate ${code} — ${stateLabel}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* state ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <p className="mt-2 text-xs font-semibold" style={{ color }}>
        {stateLabel}
      </p>
      <p className="text-[10px] font-mono" style={{ color: VIZ_THEME.muted }}>
        {code}
      </p>
    </div>
  );
}

// ── incident timeline item ───────────────────────────────────────────────────

function IncidentRow({ incident }: { incident: SafetyData["incidents"][number] }) {
  const sev = incident.severity.toLowerCase();
  const sevColor =
    sev === "critical"
      ? "var(--action-danger)"
      : sev === "high"
        ? "var(--action-warning)"
        : sev === "medium"
          ? "var(--action-info)"
          : "var(--text-muted)";

  return (
    <li className="relative pl-5">
      {/* timeline dot */}
      <span
        className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full"
        style={{
          background: incident.resolved ? "var(--text-muted)" : sevColor,
          opacity: incident.resolved ? 0.5 : 1,
        }}
        aria-hidden
      />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className="text-sm font-medium"
          style={{ color: incident.resolved ? "var(--text-muted)" : "var(--text-primary)" }}
        >
          {incident.title}
        </span>
        <span
          className="rounded px-1 text-[10px] font-medium"
          style={{ background: "var(--bg-surface)", color: sevColor, border: "1px solid var(--border)" }}
        >
          {sev}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {new Date(incident.created_at).toLocaleString()}
        </span>
        {!incident.resolved && (
          <span
            className="rounded px-1 text-[10px] font-semibold uppercase"
            style={{ background: "var(--action-danger)", color: "#fff" }}
          >
            open
          </span>
        )}
      </div>
    </li>
  );
}

// ── main export ──────────────────────────────────────────────────────────────

export interface SafetyContentProps {
  data: SafetyData;
}

export function SafetyContent({ data }: SafetyContentProps) {
  const sortedIncidents = [...data.incidents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* 4 circular status arcs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
            Gate posture
          </p>
          <span className="text-xs" style={{ color: VIZ_THEME.muted }}>
            {data.open_incidents} open incident{data.open_incidents !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.gate_states.map((g) => (
            <GateArc key={g.gate_code} code={g.gate_code} state={g.state} />
          ))}
        </div>
      </div>

      {/* incident timeline */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        <p className="mb-3 text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
          Incident timeline
        </p>
        {sortedIncidents.length === 0 ? (
          <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>
            No incidents recorded.
          </p>
        ) : (
          <ul className="space-y-3 border-l pl-4" style={{ borderLeft: "1px solid var(--border)" }}>
            {sortedIncidents.map((inc) => (
              <IncidentRow key={inc.id} incident={inc} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
