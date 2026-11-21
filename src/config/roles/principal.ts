// src/config/roles/principal.ts
// Principal — navy · composed

import type { RoleConfig } from "./types";

export const PRINCIPAL_CONFIG: RoleConfig = {
  id: "principal",
  label: "Principal",
  identity: {
    accent: "navy",
    accentMuted: "navy-muted",
    surfaceTint: "#f8fafc",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    students: "the campus",
    approvals: "your delegations",
    gates: "campus gates",
    incidents: "active incidents",
    chain: "decision ripple",
  },
  home: [
    { widget: "StrategicScorecard", size: "lg" },
    { widget: "EmergencyPulse", size: "md" },
    { widget: "ChainImpact", size: "md" },
  ],
  signature: "ChainImpact",
  // Class-review capability gate (Principal sees the campus-wide roll-up).
  capabilities: [
    { id: "class.review.view", label: "View overall class satisfaction", kind: "ux", when: () => true },
    { id: "vp.inbound.view", label: "View items flagged by the VP", kind: "ux", when: () => true },
    { id: "vp.inbound.respond", label: "Respond to a VP flag", kind: "ux", when: () => true },
    { id: "dashboard.live-classes.view", label: "View live class state (campus)", kind: "ux", when: () => true },
  ],
  emptyCopy: {
    no_incidents: "No active incidents — campus is running normally.",
  },
  loadingCopy: {
    dashboard: "Assembling your campus view…",
  },
  botPersona: {
    subtitle: "Campus · Delegations · Decisions",
    chips: ["Campus status", "Emergency pulse", "Decision ripple",],
    questions: ["What's the current campus status?", "Which decisions have the widest impact?", "Show me the delegation queue",],
  },
  onboarding: {
    steps: [
      { target: "main-content", title: "Strategic scorecard", body: "One view: campus health, incident count, gate status, approval pipeline." },
      { target: "chain-impact", title: "Chain impact", body: "See how one decision ripples through departments and shifts." },
    ],
  },
  greetingTemplate: "Good {greeting}, {title} {lastName} — {incidentCount} active, {approvalCount} delegated, {streak}-day streak",
};
