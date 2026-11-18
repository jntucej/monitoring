// src/config/roles/worker.ts
// Worker — olive · composed

import type { RoleConfig } from "./types";

export const WORKER_CONFIG: RoleConfig = {
  id: "worker",
  label: "Worker",
  identity: {
    accent: "olive",
    accentMuted: "olive-muted",
    surfaceTint: "#f5f5f4",
    radius: "lg",
    motionPreset: "composed",
  },
  vocabulary: {
    tasks: "your tasks",
    shifts: "your shifts",
    handovers: "handover",
    done: "completed",
    assigned: "assigned to you",
  },
  home: [
    { widget: "MyDay", size: "lg" },
    { widget: "TaskQueue", size: "md" },
  ],
  signature: "MyDay",
  emptyCopy: {
    no_tasks: "All caught up — no tasks assigned today.",
  },
  loadingCopy: {
    dashboard: "Loading your tasks…",
  },
  botPersona: {
    subtitle: "Tasks · Shifts · Done",
    chips: ["My tasks", "My shifts", "Handover",],
    questions: ["What's assigned to me today?", "When is my shift?", "How do I complete a task?",],
  },
  onboarding: {
    steps: [
      { target: "my-day", title: "Your day", body: "Tasks, shift times, and handover status — large taps, minimal text." },
    ],
  },
  greetingTemplate: "{taskCount} tasks today — next: {taskName} at {time}",
};
