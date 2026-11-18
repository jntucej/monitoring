// src/config/roles/guardian.ts
// Guardian — calm-blue · calm

import type { RoleConfig } from "./types";

export const GUARDIAN_CONFIG: RoleConfig = {
  id: "guardian",
  label: "Guardian",
  identity: {
    accent: "calm-blue",
    accentMuted: "calm-blue-muted",
    surfaceTint: "#eff6ff",
    radius: "sm",
    motionPreset: "calm",
  },
  vocabulary: {
    student: "your child",
    passes: "check-ins",
    mess: "meal status",
    attendance: "present/absent",
    achievements: "progress",
  },
  home: [
    { widget: "ChildStatusCard", size: "lg" },
    { widget: "LastSeenCard", size: "md" },
  ],
  signature: "LastSeenCard",
  emptyCopy: {
    no_child: "No child linked to this account yet.",
  },
  loadingCopy: {
    dashboard: "Fetching your child's status…",
  },
  botPersona: {
    subtitle: "Your child at a glance",
    chips: ["Check-in", "Attendance", "Mess", "Contact",],
    questions: ["When was my child last seen?", "What's my child's attendance this week?", "How do I schedule a visit?",],
  },
  onboarding: {
    steps: [
      { target: "main-content", title: "Your child, in real time", body: "Last-seen status, attendance, and mess balance — always current." },
    ],
  },
  greetingTemplate: "Good {greeting}, {firstName} — {childName} last seen at {gate} {timeAgo}",
};
