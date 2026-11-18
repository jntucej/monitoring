// src/config/roles/oie.ts
// OIE — orange · composed

import type { RoleConfig } from "./types";

export const OIE_CONFIG: RoleConfig = {
  id: "oie",
  label: "OIE",
  identity: {
    accent: "orange",
    accentMuted: "orange-muted",
    surfaceTint: "#fff7ed",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    candidates: "candidates",
    queue: "decision queue",
    history: "decision history",
    records: "exam records",
  },
  home: [
    { widget: "DecisionQueue", size: "lg" },
    { widget: "DecisionHistory", size: "md" },
  ],
  signature: "DecisionQueue",
  emptyCopy: {
    no_queue: "Decision queue is clear.",
  },
  loadingCopy: {
    dashboard: "Loading decision queue…",
  },
  botPersona: {
    subtitle: "Queue · History · Records",
    chips: ["Pending decisions", "Decision history", "Exam records",],
    questions: ["How many decisions are pending?", "What was the last OIE decision?", "Show me the decision history",],
  },
  onboarding: {
    steps: [
      { target: "decision-queue", title: "Decision queue", body: "Pending/escalated/history — one screen, sorted by priority." },
    ],
  },
  greetingTemplate: "{pendingCount} pending — {escalatedCount} escalated, last decision: {lastDecision}",
};
