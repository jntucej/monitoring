import type { PdcCheatTopic } from "./types";
import { unit1aTopics } from "./unit1a";
import { unit1bTopics } from "./unit1b";
import { unit1cTopics } from "./unit1c";
import { unit2aTopics } from "./unit2a";
import { unit2bTopics } from "./unit2b";
import { unit2cTopics } from "./unit2c";
import { unit3aTopics } from "./unit3a";
import { unit3bTopics } from "./unit3b";
import { unit3cTopics } from "./unit3c";

export const ALL_PDC_TOPICS: PdcCheatTopic[] = [
  ...unit1aTopics,
  ...unit1bTopics,
  ...unit1cTopics,
  ...unit2aTopics,
  ...unit2bTopics,
  ...unit2cTopics,
  ...unit3aTopics,
  ...unit3bTopics,
  ...unit3cTopics,
];

export const PDC_TOPIC_MAP: Record<string, PdcCheatTopic> = ALL_PDC_TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, PdcCheatTopic>
);