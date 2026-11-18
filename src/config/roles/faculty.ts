// src/config/roles/faculty.ts
// Faculty — slate · swift

import type { RoleConfig } from "./types";

export const FACULTY_CONFIG: RoleConfig = {
  id: "faculty",
  label: "Faculty",
  identity: {
    accent: "slate",
    accentMuted: "slate-muted",
    surfaceTint: "#f8fafc",
    radius: "sm",
    motionPreset: "swift",
  },
  vocabulary: {
    students: "your students",
    classes: "your classes",
    attendance: "your register",
    periods: "your periods",
    assignments: "your submissions",
  },
  home: [
    { widget: "TodayTimetable", size: "lg" },
    { widget: "AttendanceQuickTake", size: "md" },
    { widget: "NextClassCard", size: "sm" },
  ],
  signature: "NextClassCard",
  emptyCopy: {
    no_classes: "No classes scheduled today.",
    no_submissions: "No pending submissions.",
  },
  loadingCopy: {
    dashboard: "Loading your timetable…",
    attendance: "Pulling your register…",
  },
  botPersona: {
    subtitle: "Classes · Register · Submissions",
    chips: ["Today's classes", "Take attendance", "View submissions",],
    questions: ["What's my next class?", "How do I take attendance for period 3?", "Which students haven't submitted the assignment?",],
  },
  onboarding: {
    steps: [
      { target: "main-content", title: "Today's classes", body: "Timetable, attendance quick-take, and next-class alert — all in one view." },
      { target: "next-class", title: "Next class alert", body: "You'll know 15 minutes before your next period starts." },
    ],
  },
  greetingTemplate: "Good {greeting}, Dr. {lastName} — next class in {mins} min, {room}, {count} students",
};
