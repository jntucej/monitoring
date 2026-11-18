// src/config/roles/exam_branch.ts
// Exam Branch — amber · swift

import type { RoleConfig } from "./types";

export const EXAM_BRANCH_CONFIG: RoleConfig = {
  id: "exam_branch",
  label: "Exam Branch",
  identity: {
    accent: "amber",
    accentMuted: "amber-muted",
    surfaceTint: "#fffbeb",
    radius: "sm",
    motionPreset: "swift",
  },
  vocabulary: {
    students: "candidates",
    discrepancies: "discrepancy queue",
    oie: "OIE handoff",
    sessions: "exam sessions",
  },
  home: [
    { widget: "ExamCalendar", size: "lg" },
    { widget: "DiscrepancyRadar", size: "md" },
  ],
  signature: "DiscrepancyRadar",
  emptyCopy: {
    no_discrepancies: "No discrepancies — results are clean.",
  },
  loadingCopy: {
    dashboard: "Loading discrepancy radar…",
  },
  botPersona: {
    subtitle: "Sessions · Discrepancies · Handoff",
    chips: ["Exam calendar", "Discrepancies", "OIE handoff",],
    questions: ["Which sessions have discrepancies?", "What's the OIE handoff status?", "Show me the exam calendar",],
  },
  onboarding: {
    steps: [
      { target: "discrepancy-radar", title: "Discrepancy radar", body: "Flagged candidates by session and severity." },
    ],
  },
  greetingTemplate: "{sessionCount} sessions — {discrepancyCount} flagged, {oieCount} pending OIE handoff",
};
