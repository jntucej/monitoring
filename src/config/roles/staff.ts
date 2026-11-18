// src/config/roles/staff.ts
// Staff — slate · composed

import type { RoleConfig } from "./types";

export const STAFF_CONFIG: RoleConfig = {
  id: "staff",
  label: "Staff",
  identity: {
    accent: "slate",
    accentMuted: "slate-muted",
    surfaceTint: "#f8fafc",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    duties: "your duties",
    requests: "your requests",
    roster: "duty roster",
    shifts: "shifts",
  },
  home: [
    { widget: "MyDay", size: "lg" },
    { widget: "DutyRoster", size: "md" },
  ],
  signature: "DutyRoster",
  emptyCopy: {
    no_duties: "No duties assigned today.",
  },
  loadingCopy: {
    dashboard: "Loading your duties…",
  },
  botPersona: {
    subtitle: "Duties · Roster · Requests",
    chips: ["My duties", "Duty roster", "Requests",],
    questions: ["What's my duty today?", "When is my next shift?", "How do I log a request?",],
  },
  onboarding: {
    steps: [
      { target: "duty-roster", title: "Duty roster", body: "Your assigned duties and upcoming shifts — quiet and clear." },
    ],
  },
  greetingTemplate: "Good {greeting}, {firstName} — {dutyCount} duties today, next shift at {shiftTime}",
};
