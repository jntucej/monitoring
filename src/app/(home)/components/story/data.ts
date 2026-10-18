export type ChapterId = "leave" | "wait" | "scan" | "alert" | "quiet";
export type Perspective = "student" | "parent" | "guard" | "warden" | "admin";
export type ChapterAccent = "amber" | "indigo" | "steel" | "crimson" | "navy";

export interface Chapter {
  id: ChapterId;
  order: number;
  protagonist: Perspective;
  accent: ChapterAccent;
  title: string;
  setup: string;
  tension: string;
  resolution: string;
  payoff: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "leave",
    order: 1,
    protagonist: "student",
    accent: "amber",
    title: "The Leave",
    setup:
      "Friday, 4:00 PM. Priya has a pass to go home for the weekend.",
    tension:
      "She steps toward the gate. Her parents don't know she's left yet.",
    resolution:
      "The gate scans her ID. The pass is valid. The gate opens. Her phone buzzes: 'Priya has left the campus.'",
    payoff: "She is free — and she is safe. The system made both possible.",
  },
  {
    id: "wait",
    order: 2,
    protagonist: "parent",
    accent: "indigo",
    title: "The Wait",
    setup:
      "Sunday, 8:55 PM. In another city, Priya's mother refreshes the app.",
    tension: "No new scans. Curfew is in five minutes. Where is she?",
    resolution:
      "8:52 PM: 'Entered Hostel Gate 1.' The notification lights up the screen.",
    payoff: "She exhales. She doesn't need to call. She already knows.",
  },
  {
    id: "scan",
    order: 3,
    protagonist: "guard",
    accent: "steel",
    title: "The Scan",
    setup: "Monday, 8:45 AM. The morning rush. Hundreds of students.",
    tension: "A face that doesn't match the ID. The guard looks closer.",
    resolution:
      "The system has already flagged it. A second scan confirms: wrong person.",
    payoff: "The gate doesn't just count people. It knows them.",
  },
  {
    id: "alert",
    order: 4,
    protagonist: "warden",
    accent: "crimson",
    title: "The Alert",
    setup: "Wednesday, 9:15 PM. A student hasn't returned.",
    tension: "The system flags it. The warden's phone buzzes.",
    resolution:
      "A call. The student is at the medical center. Safe. Just delayed.",
    payoff: "The alert wasn't a punishment. It was a hand reaching out.",
  },
  {
    id: "quiet",
    order: 5,
    protagonist: "admin",
    accent: "navy",
    title: "The Quiet",
    setup: "11:30 PM. The campus sleeps.",
    tension: "The gates are locked. The system is still awake.",
    resolution: "No alerts. No exceptions. No news.",
    payoff: "Nothing happened today. That's the point.",
  },
];

export const CHAPTER_BY_ID: Record<ChapterId, Chapter> = CHAPTERS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<ChapterId, Chapter>
);

export const PERSPECTIVE_ACCENT: Record<Perspective, ChapterAccent> = {
  student: "amber",
  parent: "indigo",
  guard: "steel",
  warden: "crimson",
  admin: "navy",
};
