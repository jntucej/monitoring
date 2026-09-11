// AI-specific study types extending generic Study Engine types
import type { CheatTopic, StudyUnit, TopicImportance, TopicVisual } from "../../types";

export type Importance = TopicImportance;
export type AiVisualType = TopicVisual["type"];
export type AiCheatTopic = CheatTopic;
export type AiUnit = StudyUnit;

export * from "../../types";
