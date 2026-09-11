import type { CheatTopic } from "../../types";
import { unit1aTopics } from "./unit1a";
import { unit1bTopics } from "./unit1b";
import { unit2aTopics } from "./unit2a";
import { unit2bTopics } from "./unit2b";
import { unit2cTopics } from "./unit2c";
import { unit2dTopics } from "./unit2d";
import { unit3aTopics } from "./unit3a";
import { unit3bTopics } from "./unit3b";
import { unit4Topics } from "./unit4a";
import { unit5Topics } from "./unit5a";

export const ALL_AI_TOPICS: CheatTopic[] = [
  ...unit1aTopics,
  ...unit1bTopics,
  ...unit2aTopics,
  ...unit2bTopics,
  ...unit2cTopics,
  ...unit2dTopics,
  ...unit3aTopics,
  ...unit3bTopics,
  ...unit4Topics,
  ...unit5Topics,
];

export const AI_TOPIC_MAP: Record<string, CheatTopic> = ALL_AI_TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, CheatTopic>
);

