import type { AtcdCheatTopic } from "./types";
import { unit1Topics } from "./unit1a";
import { unit2Topics } from "./unit2a";
import { unit3Topics } from "./unit3a";
import { unit4Topics } from "./unit4a";
import { unit5Topics } from "./unit5a";

export const ALL_ATCD_TOPICS: AtcdCheatTopic[] = [
  ...unit1Topics,
  ...unit2Topics,
  ...unit3Topics,
  ...unit4Topics,
  ...unit5Topics,
];

export const ATCD_TOPIC_MAP: Record<string, AtcdCheatTopic> = ALL_ATCD_TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, AtcdCheatTopic>
);
