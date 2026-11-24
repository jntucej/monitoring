// src/config/roles/deputy_warden.ts
// Deputy Warden — burgundy · calm

import type { RoleConfig } from "./types";

export const DEPUTY_WARDEN_CONFIG: RoleConfig = {
  id: "deputy_warden",
  label: "Deputy Warden",
  identity: {
    accent: "burgundy",
    accentMuted: "burgundy-muted",
    surfaceTint: "#fef2f2",
    radius: "sm",
    motionPreset: "calm",
  },
  vocabulary: {
    students: "residents",
    hostels: "your blocks",
    curfew: "curfew status",
    incidents: "overnight incidents",
    rooms: "room status",
  },
  home: [
    { widget: "CurfewCountdown", size: "lg" },
    { widget: "GateMovement", size: "md" },
    { widget: "IncidentFeed", size: "md" },
  ],
  signature: "CurfewCountdown",
  emptyCopy: {
    no_incidents: "No overnight incidents — all blocks are quiet.",
  },
  loadingCopy: {
    dashboard: "Loading hostel status…",
    curfew: "Checking curfew…",
  },
  botPersona: {
    subtitle: "Residents · Curfew · Blocks",
    chips: ["Curfew", "Gate movement", "Incidents",],
    questions: ["When does curfew end?", "Which blocks had incidents last night?", "Show me the overnight gate log",],
  },
  onboarding: {
    steps: [
      { target: "curfew-countdown", title: "Curfew countdown", body: "Live timer to curfew end, with gate-movement overlay." },
    ],
  },
  greetingTemplate: "Hostel Curfew & Resident Overview",
};
