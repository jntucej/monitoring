// src/config/roles/sysadmin.ts
// SysAdmin — terminal-green · instant

import type { RoleConfig } from "./types";

export const SYSADMIN_CONFIG: RoleConfig = {
  id: "sysadmin",
  label: "SysAdmin",
  identity: {
    accent: "terminal-green",
    accentMuted: "terminal-green-muted",
    surfaceTint: "#0a0f0a",
    radius: "sm",
    motionPreset: "instant",
  },
  vocabulary: {
    services: "containers",
    gates: "services",
    jobs: "cron jobs",
    health: "posture",
    drift: "config drift",
  },
  home: [
    { widget: "CommandCenter", size: "lg" },
    { widget: "DockerFleetPanel", size: "md" },
    { widget: "HealthScore", size: "sm" },
  ],
  signature: "CommandCenter",
  emptyCopy: {
    no_services: "No containers found.",
  },
  loadingCopy: {
    dashboard: "Scanning fleet posture…",
  },
  botPersona: {
    subtitle: "Services · Posture · Drift",
    chips: ["Fleet status", "Cron jobs", "Config drift",],
    questions: ["What's the current drift score?", "Which containers are unhealthy?", "Show me the last 20 cron runs",],
  },
  onboarding: {
    steps: [
      { target: "command-center", title: "Command center", body: "Fleet posture, drift score, and cron health — one screen." },
    ],
  },
  greetingTemplate: "Fleet — {healthyCount}/{totalCount} healthy, drift {driftScore}, {jobCount} jobs",
};
