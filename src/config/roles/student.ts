// src/config/roles/student.ts
// Student — teal · playful

import type { RoleConfig, WorkspaceContext } from "./types";

// ── P1: conditions as data, not as `if` in components ──────────────────────
// Each predicate is PURE (no DB, no fetch). The config is the single source
// of truth: adding/hiding a screen or capability is a config edit, not a
// component edit. Fail-closed for security, fail-open for ux (guardrail #2).

const isHosteller = (ctx: WorkspaceContext) => ctx.residentialStatus === "hosteller";
const isDayScholar = (ctx: WorkspaceContext) => ctx.residentialStatus === "day_scholar";
const isInCampus = (ctx: WorkspaceContext) => ctx.campusStatus === "in_campus";
const isOutCampus = (ctx: WorkspaceContext) => ctx.campusStatus === "out_campus";

/** Hosteller OUT with an active leave whose deadline has a value. */
function hostellerOutWithLeave(ctx: WorkspaceContext): boolean {
  return isHosteller(ctx) && isOutCampus(ctx) &&
    ctx.activeAuthorizations.some(a => a.kind === "hostel_leave" && a.status === "active" && !!a.expectedReturnAt);
}

/** Overstay: out + deadline passed. */
function overstay(ctx: WorkspaceContext): boolean {
  if (!hostellerOutWithLeave(ctx)) return false;
  const now = Date.now();
  return ctx.activeAuthorizations.some(a =>
    a.kind === "hostel_leave" && a.status === "active" &&
    !!a.expectedReturnAt && new Date(a.expectedReturnAt).getTime() < now,
  );
}

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

  // ── P1: nav items gated by `when(ctx)` — the config IS the source of truth ──
  // A day scholar's nav never shows hostel surfaces. A hosteller IN shows
  // curfew/leave; a hosteller OUT shows expected-return/overstay instead.
  nav: [
    { key: "home", label: "Home", kind: "ux", when: () => true },
    { key: "classes", label: "Today's Classes", kind: "ux", when: () => true },
    { key: "attendance", label: "Attendance", kind: "ux", when: () => true },
    { key: "movement", label: "My Movement", kind: "ux", when: () => true },
    { key: "credential", label: "My QR / Credential", kind: "security", when: () => true },
    { key: "day-out", label: "Day Out", kind: "security", when: isDayScholar },
    { key: "leave", label: "Hostel Leave", kind: "security", when: (c) => isHosteller(c) && isInCampus(c) },
    { key: "curfew", label: "Curfew", kind: "ux", when: isHosteller },
    { key: "expected-return", label: "Expected Return", kind: "ux", when: hostellerOutWithLeave },
    { key: "overstay", label: "Overstay", kind: "security", when: overstay },
  ],

  // ── P1: capabilities gated by `when(ctx)` — view ≠ act ≠ approve ──────────
  capabilities: [
    { id: "campus.entry", label: "Enter campus", kind: "security", when: () => true },
    { id: "campus.exit", label: "Exit campus", kind: "security", when: () => true },
    { id: "credential.view", label: "See my credential/QR", kind: "security", when: () => true },
    { id: "movement.view", label: "See my gate movement", kind: "ux", when: () => true },
    { id: "classes.view", label: "See today's classes", kind: "ux", when: () => true },
    { id: "attendance.view", label: "See my attendance", kind: "ux", when: () => true },
    { id: "day.out.request", label: "Request a day out", kind: "security", when: isDayScholar },
    { id: "hostel.leave.apply", label: "Apply for hostel leave", kind: "security", when: (c) => isHosteller(c) && isInCampus(c) },
    { id: "hostel.leave.view", label: "See my leave status", kind: "ux", when: isHosteller },
    { id: "curfew.view", label: "See curfew", kind: "ux", when: isHosteller },
    { id: "hostel.occupancy.view", label: "See hostel room/block", kind: "ux", when: (c) => isHosteller(c) && isInCampus(c) },
    { id: "expected-return.view", label: "See expected return", kind: "ux", when: hostellerOutWithLeave },
    { id: "overstay.view", label: "See overstay/late state", kind: "security", when: overstay },
    { id: "return-gate.view", label: "See which gate to return at", kind: "ux", when: hostellerOutWithLeave },
    { id: "mess.off.request", label: "Request mess off", kind: "security", when: (c) => isHosteller(c) && isInCampus(c) },
    { id: "assignment.view", label: "See my assignments", kind: "ux", when: () => true },
    { id: "mess.view", label: "See my mess token", kind: "ux", when: () => true },
    { id: "marks.view", label: "See my marks", kind: "ux", when: () => true },
    { id: "exams.view", label: "See my exam schedule", kind: "ux", when: () => true },
    { id: "fees.view", label: "See my fees", kind: "ux", when: () => true },
    { id: "scholarships.view", label: "See my scholarships", kind: "ux", when: () => true },
    { id: "library.view", label: "See my library issues", kind: "ux", when: () => true },
  ],
};
