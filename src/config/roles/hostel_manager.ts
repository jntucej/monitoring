// src/config/roles/hostel_manager.ts
// Hostel Manager — forest · calm

import type { RoleConfig } from "./types";

export const HOSTEL_MANAGER_CONFIG: RoleConfig = {
  id: "hostel_manager",
  label: "Hostel Manager",
  identity: {
    accent: "forest",
    accentMuted: "forest-muted",
    surfaceTint: "#f0fdf4",
    radius: "sm",
    motionPreset: "calm",
  },
  vocabulary: {
    residents: "your residents",
    rooms: "room status",
    blocks: "your blocks",
    allocation: "room allocation",
  },
  home: [
    { widget: "RoomOccupancyHeatmap", size: "lg" },
    { widget: "AllocationQueue", size: "md" },
  ],
  signature: "RoomOccupancyHeatmap",
  emptyCopy: {
    no_rooms: "No rooms in your assignment yet.",
  },
  loadingCopy: {
    dashboard: "Loading room occupancy…",
  },
  botPersona: {
    subtitle: "Rooms · Blocks · Allocation",
    chips: ["Room occupancy", "Allocation queue", "Block status",],
    questions: ["Which rooms are at capacity?", "How many allocation requests are pending?", "What's the occupancy rate per block?",],
  },
  onboarding: {
    steps: [
      { target: "occupancy", title: "Room occupancy heatmap", body: "Colour-coded grid: green is available, amber is partial, red is full." },
    ],
  },
  greetingTemplate: "{blockCount} blocks — {occupancy}% occupancy, {allocationCount} pending allocations",
};
