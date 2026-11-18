// src/config/roles/supervisor.ts
// Supervisor — steel · steady

import type { RoleConfig } from "./types";

export const SUPERVISOR_CONFIG: RoleConfig = {
  id: "supervisor",
  label: "Supervisor",
  identity: {
    accent: "steel",
    accentMuted: "steel-muted",
    surfaceTint: "#f0f9ff",
    radius: "md",
    motionPreset: "steady",
  },
  vocabulary: {
    workers: "your team",
    gates: "all gates",
    shifts: "shift status",
    handovers: "handover queue",
  },
  home: [
    { widget: "ShiftBar", size: "lg" },
    { widget: "GateWall", size: "md" },
    { widget: "TeamRoster", size: "md" },
  ],
  signature: "GateWall",
  emptyCopy: {
    no_gates: "No gates online — check the network.",
    no_team: "No team members on shift.",
  },
  loadingCopy: {
    dashboard: "Loading gate status…",
    team: "Pulling shift roster…",
  },
  botPersona: {
    subtitle: "Shifts · Gates · Team",
    chips: ["Shift status", "Gate wall", "Team on duty",],
    questions: ["Which gates are online?", "Who's on shift at Gate 2?", "What's the handover status?",],
  },
  onboarding: {
    steps: [
      { target: "gate-wall", title: "Gate wall", body: "Live grid of every gate — green is open, amber is degraded, red is down." },
    ],
  },
  greetingTemplate: "Shift {shiftName} — {gateCount} gates online, {teamCount} on duty, handover in {mins} min",
};
