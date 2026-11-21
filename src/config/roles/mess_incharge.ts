// src/config/roles/mess_incharge.ts
// Mess In-charge — saffron · swift

import type { RoleConfig } from "./types";

export const MESS_INCHARGE_CONFIG: RoleConfig = {
  id: "mess_incharge",
  label: "Mess In-charge",
  identity: {
    accent: "saffron",
    accentMuted: "saffron-muted",
    surfaceTint: "#fffbeb",
    radius: "md",
    motionPreset: "swift",
  },
  vocabulary: {
    students: "diners",
    tokens: "meal tokens",
    menu: "today's menu",
    counts: "head counts",
    scans: "token scans",
  },
  home: [
    { widget: "MealDayBoard", size: "lg" },
    { widget: "TokenScanCounter", size: "md" },
    { widget: "MenuOfDay", size: "sm" },
  ],
  signature: "MealDayBoard",
  // Mess-eligibility dashboard gate (PR4): the in-charge sees the
  // expected/issued/served/excluded reconciliation on /mess/meal-attendance.
  capabilities: [
    { id: "mess.eligibility.view", label: "View mess eligibility reconciliation", kind: "ux", when: () => true },
  ],
  emptyCopy: {
    no_tokens: "No tokens scanned yet — service hasn't started.",
  },
  loadingCopy: {
    dashboard: "Loading today's mess…",
  },
  botPersona: {
    subtitle: "Menu · Tokens · Counts",
    chips: ["Today's menu", "Token count", "Head count",],
    questions: ["What's on the menu today?", "How many tokens have been scanned?", "What's the expected head count?",],
  },
  onboarding: {
    steps: [
      { target: "meal-board", title: "Meal day board", body: "Menu, token count, and expected head count — updated live." },
    ],
  },
  greetingTemplate: "Mess — {scanCount}/{expectedCount} tokens scanned, menu: {menuName}",
};
