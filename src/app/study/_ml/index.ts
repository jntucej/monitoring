import type { Unit, Topic } from "./types";
import { units as unitsA, topicMap as topicMapA } from "./data/content-part1";
import { prepTopicsA } from "./data/content-prepA";
import { prepTopicsB } from "./data/content-prepB";

// Assemble the single content registry (spec §36): units + topic map.


export const UNITS: Record<string, Unit> = unitsA;

export const ALL_TOPICS: Record<string, Topic> = {
  ...topicMapA,
  ...prepTopicsA,
  ...prepTopicsB,
};

// Flatten for search / quick nav (spec §35).
export const TOPIC_LIST: Topic[] = Object.values(ALL_TOPICS);

export function getUnit(id: string): Unit | undefined {
  return UNITS[id];
}

export function getTopic(id: string): Topic | undefined {
  return ALL_TOPICS[id];
}

export function topicsForUnit(unitId: string): Topic[] {
  return TOPIC_LIST.filter((t) => t.unit === unitId);
}

export function searchTopics(query: string): Topic[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return TOPIC_LIST.filter((t) =>
    [t.title, t.definition, ...(t.keyPoints ?? []), ...(t.examPoints ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}