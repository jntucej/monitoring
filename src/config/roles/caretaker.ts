// src/config/roles/caretaker.ts
// Caretaker — earth · composed

import type { RoleConfig, WorkspaceContext } from "./types";

// P1: the hostel approval chain as config data. The pure workflow module
// reads this instead of a hardcoded HOSTEL_CHAIN. Adding/removing/reordering
// a stage is a config edit, not a code edit.
//
// The 4-stage chain: caretaker → deputy_warden → hostel_manager → principal.
// `when()` is always true (all hostel movements go through the full chain);
// a conditional variant (e.g. emergency = 2-stage) would use a `when(ctx)`
// predicate to skip intermediate stages.
const HOSTEL_APPROVAL_STAGES = [
  { role: "caretaker", label: "Caretaker review", domain: "hostel", substitute: "deputy_warden" },
  { role: "deputy_warden", label: "Deputy Warden review", domain: "hostel", substitute: "hostel_manager" },
  { role: "hostel_manager", label: "Hostel Manager sign-off", domain: "hostel", substitute: "principal" },
  { role: "principal", label: "Principal final approval", domain: "hostel", when: () => true },
];

export const CARETAKER_CONFIG: RoleConfig = {
  id: "caretaker",
  label: "Caretaker",
  identity: {
    accent: "earth",
    accentMuted: "earth-muted",
    surfaceTint: "#f5f5dc",
    radius: "sm",
    motionPreset: "composed",
  },
  vocabulary: {
    complaints: "your tickets",
    maintenance: "maintenance queue",
    sla: "SLA countdown",
    blocks: "your blocks",
  },
  home: [
    { widget: "TicketQueue", size: "lg" },
    { widget: "SLACountdown", size: "md" },
  ],
  signature: "TicketQueue",
  emptyCopy: {
    no_tickets: "No open tickets — you're ahead of SLA.",
  },
  loadingCopy: {
    dashboard: "Loading your tickets…",
  },
  botPersona: {
    subtitle: "Tickets · SLA · Blocks",
    chips: ["My tickets", "SLA countdown", "My blocks",],
    questions: ["Which tickets are closest to SLA breach?", "How many open tickets do I have?", "Which block has the most complaints?",],
  },
  onboarding: {
    steps: [
      { target: "ticket-queue", title: "SLA countdown", body: "Open tickets sorted by SLA deadline — closest first." },
    ],
  },
  greetingTemplate: "{ticketCount} open tickets — {urgentCount} within SLA window",

  // P1: the hostel approval chain as config data. The pure workflow module
  // reads `caretaker.stages` instead of the hardcoded HOSTEL_CHAIN.
  stages: HOSTEL_APPROVAL_STAGES,
};
