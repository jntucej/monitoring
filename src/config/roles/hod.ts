// src/config/roles/hod.ts
// HOD — indigo · calm

import type { RoleConfig } from "./types";

export const HOD_CONFIG: RoleConfig = {
  id: "hod",
  label: "HOD",
  identity: {
    accent: "indigo",
    accentMuted: "indigo-muted",
    surfaceTint: "#eef2ff",
    radius: "sm",
    motionPreset: "calm",
  },
  vocabulary: {
    faculty: "your faculty",
    department: "your department",
    approvals: "pending approvals",
    students: "department students",
  },
  home: [
    { widget: "MorningBrief", size: "lg" },
    { widget: "DepartmentPulse", size: "md" },
    { widget: "ApprovalsInbox", size: "md" },
  ],
  signature: "DepartmentPulse",
  emptyCopy: {
    no_approvals: "No pending approvals — your team is ahead of schedule.",
  },
  loadingCopy: {
    dashboard: "Pulling your department's pulse…",
    approvals: "Loading your inbox…",
  },
  botPersona: {
    subtitle: "Department · Approvals · Faculty",
    chips: ["Pending approvals", "Faculty workload", "Department health",],
    questions: ["How many approvals are pending today?", "Which faculty member has the highest load?", "What's the department attendance rate this week?",],
  },
  onboarding: {
    steps: [
      { target: "main-content", title: "Department health scorecard", body: "DepartmentPulse shows attendance, workload, and incident trends at a glance." },
      { target: "approvals", title: "Your approvals inbox", body: "Reshuffle requests, leave approvals, and reschedule requests land here." },
    ],
  },
  greetingTemplate: "Good {greeting}, Prof. {lastName} — {approvalCount} approvals before 5 pm, {streak}-day streak",
};
