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
    { widget: "ClassReviewsWidget", size: "md" },
  ],
  signature: "NextClassCard",
  // Class-review capability gate: faculty can view their own class-session
  // reviews (the "My class reviews" card). Universally true for the role —
  // going through the config keeps it gated the same way as everything else.
  capabilities: [
    { id: "class.review.view", label: "View my class reviews", kind: "ux", when: () => true },
    { id: "class.review.reply", label: "Reply to a class review", kind: "ux", when: () => true },
    { id: "class.confirm", label: "Confirm my class sessions", kind: "ux", when: () => true },
    { id: "assignment.view", label: "View my assignments", kind: "ux", when: () => true },
    { id: "dashboard.live-classes.view", label: "View live class state (self)", kind: "ux", when: () => true },
  ],
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
