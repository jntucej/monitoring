// src/config/roles/emo.ts
// EMO — warm-red · swift

import type { RoleConfig } from "./types";

export const EMO_CONFIG: RoleConfig = {
  id: "emo",
  label: "EMO",
  identity: {
    accent: "warm-red",
    accentMuted: "warm-red-muted",
    surfaceTint: "#fef2f2",
    radius: "sm",
    motionPreset: "swift",
  },
  vocabulary: {
    complaints: "incident reports",
    resolution: "resolution rate",
    streak: "no-incident streak",
    escalations: "escalations",
  },
  home: [
    { widget: "IncidentRadar", size: "lg" },
    { widget: "ResolutionStreak", size: "md" },
  ],
  signature: "IncidentRadar",
  emptyCopy: {
    no_incidents: "No active incidents — {streak} day streak.",
  },
  loadingCopy: {
    dashboard: "Scanning incident feed…",
  },
  botPersona: {
    subtitle: "Incidents · Resolution · Escalations",
    chips: ["Active incidents", "Resolution rate", "Escalations",],
    questions: ["How many incidents are active?", "What's the resolution rate this week?", "Which incidents need escalation?",],
  },
  onboarding: {
    steps: [
      { target: "incident-radar", title: "Incident radar", body: "Active incidents by severity and location, with resolution status." },
    ],
  },
  greetingTemplate: "{incidentCount} active incidents — {resolutionRate}% resolved this week",
};
