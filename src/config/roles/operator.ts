// src/config/roles/operator.ts
// Gate Operator — yellow · instant

import type { RoleConfig } from "./types";

export const OPERATOR_CONFIG: RoleConfig = {
  id: "operator",
  label: "Gate Operator",
  identity: {
    accent: "yellow",
    accentMuted: "yellow-muted",
    surfaceTint: "#fefce8",
    radius: "sm",
    motionPreset: "instant",
  },
  vocabulary: {
    students: "visitors",
    passes: "scans",
    gates: "your gate",
    entries: "in",
    exits: "out",
  },
  home: [
    { widget: "Scanner", size: "lg" },
    { widget: "RecentScans", size: "md" },
    { widget: "GateStatusBadge", size: "sm" },
  ],
  signature: "Scanner",
  emptyCopy: {
    no_scans: "No scans yet — camera is ready.",
  },
  loadingCopy: {
    scanner: "Calibrating scanner…",
    recent: "Loading recent scans…",
  },
  botPersona: {
    subtitle: "Scan · In/Out · Status",
    chips: ["Scan pass", "Recent scans", "Gate status",],
    questions: ["How do I scan a visitor?", "What does the red badge mean?", "Show me the last 10 scans",],
  },
  onboarding: {
    steps: [
      { target: "scanner", title: "Scan viewfinder", body: "Camera-first, zero chrome. Point, scan, done." },
    ],
  },
  greetingTemplate: "Gate {gateName} — {streak} days clean, {scanCount} scans today",
};
