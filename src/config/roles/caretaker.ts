// src/config/roles/caretaker.ts
// Caretaker — earth · composed

import type { RoleConfig } from "./types";

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
};
