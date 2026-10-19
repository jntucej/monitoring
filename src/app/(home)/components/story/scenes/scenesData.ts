export type SceneId = "request" | "approval" | "scan" | "shield" | "wholecampus";
export type SceneAccent = "amber" | "emerald" | "steel" | "crimson" | "violet";

export interface Scene {
  id: SceneId;
  order: number;
  accent: SceneAccent;
  tagline: string;
  sub: string;
}

export const SCENES: Scene[] = [
  {
    id: "request",
    order: 2,
    accent: "amber",
    tagline: "A request arrives.",
    sub: "Live. Real. Happening right now across the campus.",
  },
  {
    id: "approval",
    order: 3,
    accent: "emerald",
    tagline: "Intent. Request. Confirmation.",
    sub: "Three steps. No handoff lost. No approval forgotten.",
  },
  {
    id: "scan",
    order: 4,
    accent: "steel",
    tagline: "Verified in half a second.",
    sub: "Every scan is a nonce. Every nonce is a promise that can't be reused.",
  },
  {
    id: "shield",
    order: 5,
    accent: "crimson",
    tagline: "Nothing slips through.",
    sub: "When something isn't right, someone already knows.",
  },
  {
    id: "wholecampus",
    order: 6,
    accent: "violet",
    tagline: "Everything is connected.",
    sub: "Gate, hostel, mess, exam, labs, visitors, events — one system, always in sync.",
  },
];
