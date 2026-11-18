// src/config/roles/visitor.ts
// Visitor — sky · playful

import type { RoleConfig } from "./types";

export const VISITOR_CONFIG: RoleConfig = {
  id: "visitor",
  label: "Visitor",
  identity: {
    accent: "sky",
    accentMuted: "sky-muted",
    surfaceTint: "#f0f9ff",
    radius: "md",
    motionPreset: "playful",
  },
  vocabulary: {
    host: "your host",
    visit: "your visit",
    gate: "the gate",
    qr: "your QR",
    countdown: "until you arrive",
  },
  home: [
    { widget: "VisitCountdown", size: "lg" },
    { widget: "HostInfo", size: "md" },
  ],
  signature: "VisitCountdown",
  emptyCopy: {
    no_visit: "No visit scheduled — use your QR code at the gate.",
  },
  loadingCopy: {
    dashboard: "Checking your visit…",
  },
  botPersona: {
    subtitle: "Your visit",
    chips: ["My QR", "My host", "Gate info",],
    questions: ["When does my visit end?", "Who is my host?", "Which gate should I use?",],
  },
  onboarding: {
    steps: [
      { target: "visit-countdown", title: "Your visit", body: "Countdown to end time, host name, and gate number — all in one card." },
    ],
  },
  greetingTemplate: "Hi {firstName} — your host is {hostName}, gate {gateName}, ends at {endTime}",
};
