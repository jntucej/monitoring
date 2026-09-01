// Structured topic model for the ML visual study portal.
// Every concept/page is driven by this typed shape — UI components never
// hardcode syllabus content (spec §36–37).

export type TopicVisual =
  | { type: "tree"; data: { root: string; children: string[][] } }
  | { type: "flow"; data: { steps: string[]; note?: string } }
  | { type: "layers"; data: { layers: string[] } }
  | { type: "pipeline"; data: { stages: string[] } }
  | { type: "comparison"; data: { rows: [string, string][] } }
  | { type: "dendrogram"; data: { leaves: string[] } }
  | { type: "graph"; data: { equation?: string; vars?: string[]; label?: string } };

export interface Topic {
  id: string;
  title: string;
  unit: "I" | "II" | "III";
  category: string;
  importance: "high" | "medium" | "low";

  definition?: string;
  why?: string;
  coreIdea?: string;
  keyPoints?: string[];
  steps?: string[];
  formula?: {
    expression: string;
    symbols?: Record<string, string>;
    usedFor?: string;
    examNote?: string;
  };
  visual?: TopicVisual;
  advantages?: string[];
  limitations?: string[];
  applications?: string[];

  examPoints?: string[];
  memoryTrigger?: string;
  relatedTopics?: string[];
}

export interface Unit {
  id: "I" | "II" | "III";
  title: string;
  description: string;
  // category -> topic ids (ordered as they should appear in nav)
  structure: Array<{ category: string; topics: string[] }>;
}

export const UNIT_TITLES: Record<"I" | "II" | "III", string> = {
  I: "Introduction & Feature Engineering",
  II: "Supervised Learning",
  III: "Unsupervised Learning",
};

export const UNIT_COLORS: Record<"I" | "II" | "III", string> = {
  I: "text-sky-400",
  II: "text-emerald-400",
  III: "text-fuchsia-400",
};

export const UNIT_BORDERS: Record<"I" | "II" | "III", string> = {
  I: "border-sky-500/20",
  II: "border-emerald-500/20",
  III: "border-fuchsia-500/20",
};

export const UNIT_BG: Record<"I" | "II" | "III", string> = {
  I: "bg-sky-500/10",
  II: "bg-emerald-500/10",
  III: "bg-fuchsia-500/10",
};