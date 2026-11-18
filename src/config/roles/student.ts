// src/config/roles/student.ts
// Student — teal · playful

import type { RoleConfig } from "./types";

export const STUDENT_CONFIG: RoleConfig = {
  id: "student",
  label: "Student",
  identity: {
    accent: "teal",
    accentMuted: "teal-muted",
    surfaceTint: "#f0fdfa",
    radius: "md",
    motionPreset: "playful",
  },
  vocabulary: {
    students: "you",
    passes: "your pass",
    mess: "your mess",
    attendance: "your attendance",
    achievements: "your wins",
  },
  home: [
    { widget: "TodayStatus", size: "lg" },
    { widget: "ActivePassCard", size: "md" },
    { widget: "ContextCard", size: "md" },
    { widget: "CampusPulseStrip", size: "sm" },
  ],
  signature: "TodayStatus",
  emptyCopy: {
    no_passes: "No active passes — you're all in.",
    no_attendance: "No attendance records yet this week.",
  },
  loadingCopy: {
    dashboard: "Loading your day…",
    passes: "Checking your passes…",
  },
  botPersona: {
    subtitle: "Policies · Schedules · Services",
    chips: ["Pass rules", "Mess hours", "Leave", "Gate scan",],
    questions: ["How do I request an out-of-campus pass?", "What are the hostel curfew times?", "How do I apply for a leave?",],
  },
  onboarding: {
    steps: [
      { target: "main-content", title: "Your day, at a glance", body: "Today's attendance, pass status, and mess token — all here." },
      { target: "quick-links", title: "Quick actions", body: "One tap to apply for a pass, log a complaint, or check your schedule." },
      { target: "campus-pulse", title: "Campus pulse", body: "Live feed of what's happening on campus right now." },
    ],
  },
  greetingTemplate: "Good {greeting}, {firstName} — {streak} day streak, {passCount} pass active",
};
