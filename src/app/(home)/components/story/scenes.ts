export type SceneId = "request" | "approval" | "scan" | "shield" | "wholecampus";
export type SceneAccent = "amber" | "emerald" | "steel" | "crimson" | "violet";

export interface SceneStat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export interface Scene {
  id: SceneId;
  order: number;
  accent: SceneAccent;
  tagline: string;
  sub: string;
  stats: [SceneStat, SceneStat];
}

export const SCENES: Scene[] = [
  {
    id: "request",
    order: 1,
    accent: "amber",
    tagline: "A request arrives.",
    sub: "Before the gate opens, the system already knows who asked and why.",
    stats: [
      { label: "Requests today", value: 47 },
      { label: "Avg. time to log", value: 0.8, suffix: "s", decimals: 1 },
    ],
  },
  {
    id: "approval",
    order: 2,
    accent: "emerald",
    tagline: "Four signatures. One click.",
    sub: "HOD, warden, principal, gate — a chain that never breaks.",
    stats: [
      { label: "Median approval", value: 3.2, suffix: "s", decimals: 1 },
      { label: "Approved today", value: 38 },
    ],
  },
  {
    id: "scan",
    order: 3,
    accent: "steel",
    tagline: "Verified in half a second.",
    sub: "Every scan is a nonce. Every nonce is a promise that can't be reused.",
    stats: [
      { label: "Scans today", value: 847 },
      { label: "Median scan", value: 412, suffix: "ms" },
    ],
  },
  {
    id: "shield",
    order: 4,
    accent: "crimson",
    tagline: "Nothing slips through.",
    sub: "When something isn't right, someone already knows.",
    stats: [
      { label: "Unauthorized (30d)", value: 0 },
      { label: "Audit events / day", value: 1247 },
    ],
  },
  {
    id: "wholecampus",
    order: 5,
    accent: "violet",
    tagline: "Everything is accounted for.",
    sub: "This is what quiet looks like when it's working.",
    stats: [
      { label: "On campus now", value: 2847 },
      { label: "Forecast accuracy", value: 98.4, suffix: "%", decimals: 1 },
    ],
  },
];
