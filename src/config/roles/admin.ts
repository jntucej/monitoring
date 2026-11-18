// src/config/roles/admin.ts
// Admin — charcoal · composed

import type { RoleConfig } from "./types";

export const ADMIN_CONFIG: RoleConfig = {
  id: "admin",
  label: "Admin",
  identity: {
    accent: "charcoal",
    accentMuted: "charcoal-muted",
    surfaceTint: "#f8fafc",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    students: "people",
    gates: "gates",
    services: "services",
    health: "system health",
    users: "accounts",
  },
  home: [
    { widget: "CampusStatusBar", size: "lg" },
    { widget: "GateHealth", size: "md" },
    { widget: "UserStats", size: "md" },
  ],
  signature: "CampusStatusBar",
  emptyCopy: {
    no_gates: "No gates registered.",
  },
  loadingCopy: {
    dashboard: "Assembling campus status…",
  },
  botPersona: {
    subtitle: "Campus · People · Gates",
    chips: ["Campus status", "Gate health", "User stats",],
    questions: ["What's the overall campus health?", "Which gates are degraded?", "How many users are active today?",],
  },
  onboarding: {
    steps: [
      { target: "campus-status", title: "Campus digital twin", body: "One strip: gate status, service health, user counts, active incidents." },
    ],
  },
  greetingTemplate: "Campus — {gateCount} gates, {serviceCount} services, {userCount} active users",
};
