import type { CheatTopic } from "./types";
import { unit1aTopics } from "./unit1a";
import { unit1bTopics } from "./unit1b";
import { unit1cTopics } from "./unit1c";
import { unit1dTopics } from "./unit1d";
import { unit2aTopics } from "./unit2a";
import { unit2bTopics } from "./unit2b";
import { unit2cTopics } from "./unit2c";
import { unit2dTopics } from "./unit2d";
import { unit3aTopics } from "./unit3a";
import { unit3bTopics } from "./unit3b";
import { unit3cTopics } from "./unit3c";

export const ALL_CHEAT_TOPICS: CheatTopic[] = [
  ...unit1aTopics,
  ...unit1bTopics,
  ...unit1cTopics,
  ...unit1dTopics,
  ...unit2aTopics,
  ...unit2bTopics,
  ...unit2cTopics,
  ...unit2dTopics,
  ...unit3aTopics,
  ...unit3bTopics,
  ...unit3cTopics
];

export const TOPIC_MAP: Record<string, CheatTopic> = ALL_CHEAT_TOPICS.reduce(
  (acc, topic) => {
    acc[topic.id] = topic;
    return acc;
  },
  {} as Record<string, CheatTopic>
);
