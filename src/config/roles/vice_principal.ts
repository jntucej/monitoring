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
  // VP capability gate — what the VP can SEE / DO, data-driven.
  capabilities: [
    { id: "vp.bridge.flag", label: "Flag an item to the Principal", kind: "ux", when: () => true },
    { id: "vp.bridge.view", label: "View the Principal bridge", kind: "ux", when: () => true },
    { id: "vp.notes.create", label: "Annotate a department or decision", kind: "ux", when: () => true },
    { id: "delegation.vp.view", label: "View my delegations (out + in)", kind: "ux", when: () => true },
    { id: "dashboard.live-classes.view", label: "View live class state", kind: "ux", when: () => true },
    { id: "class.confirm.on_behalf", label: "Confirm a faculty's class on their behalf", kind: "ux", when: () => true },
    { id: "exam.coordination.view", label: "View exam coordination", kind: "ux", when: () => true },
    { id: "hostel.aggregate.view", label: "View hostel aggregate (no PII)", kind: "ux", when: () => true },
  ],
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
