// src/config/roles/exam_superintendent.ts
// Exam Superintendent — red-orange · composed

import type { RoleConfig } from "./types";

export const EXAM_SUPERINTENDENT_CONFIG: RoleConfig = {
  id: "exam_superintendent",
  label: "Exam Superintendent",
  identity: {
    accent: "red-orange",
    accentMuted: "red-orange-muted",
    surfaceTint: "#fff7ed",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    students: "candidates",
    classes: "sessions",
    rooms: "halls",
    attendance: "candidate attendance",
    incidents: "exam incidents",
  },
  home: [
    { widget: "ExamDayCommand", size: "lg" },
    { widget: "IncidentFeed", size: "md" },
  ],
  signature: "ExamDayCommand",
  emptyCopy: {
    no_exams: "No exams scheduled today.",
  },
  loadingCopy: {
    dashboard: "Loading exam day command…",
  },
  botPersona: {
    subtitle: "Candidates · Halls · Incidents",
    chips: ["Today's schedule", "Candidate attendance", "Incidents",],
    questions: ["Which halls are active?", "What's the candidate attendance rate?", "Show me today's incident feed",],
  },
  onboarding: {
    steps: [
      { target: "exam-command", title: "Exam day command", body: "Live countdown, hall status, and incident feed — the exam day cockpit." },
    ],
  },
  greetingTemplate: "Exam day — {hallCount} halls active, {candidateCount} candidates, {incidentCount} incidents",
};
