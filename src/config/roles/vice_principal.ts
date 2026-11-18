// src/config/roles/vice_principal.ts
// Vice-Principal — royal-purple · composed

import type { RoleConfig } from "./types";

export const VICE_PRINCIPAL_CONFIG: RoleConfig = {
  id: "vice_principal",
  label: "Vice-Principal",
  identity: {
    accent: "royal-purple",
    accentMuted: "royal-purple-muted",
    surfaceTint: "#faf5ff",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    approvals: "your approvals",
    departments: "department performance",
    principal_bridge: "upstream decisions",
    students: "the campus",
  },
  home: [
    { widget: "ApprovalsQueue", size: "lg" },
    { widget: "DepartmentPerformance", size: "md" },
    { widget: "PrincipalBridge", size: "sm" },
  ],
  signature: "PrincipalBridge",
  emptyCopy: {
    no_approvals: "No pending approvals.",
  },
  loadingCopy: {
    dashboard: "Assembling your view…",
  },
  botPersona: {
    subtitle: "Approvals · Departments · Principal",
    chips: ["Approvals queue", "Dept performance", "Principal bridge",],
    questions: ["What's flowing up to the Principal?", "Which department is underperforming?", "Show me the approval pipeline",],
  },
  onboarding: {
    steps: [
      { target: "principal-bridge", title: "Principal bridge", body: "What's being escalated up, what's being delegated down — the flow at a glance." },
    ],
  },
  greetingTemplate: "Good {greeting}, {title} {lastName} — {approvalCount} approvals, {deptCount} departments in view",
};
