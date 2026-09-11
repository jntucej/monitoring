export type Importance = "HIGH" | "MEDIUM" | "LOW";
export type UnitId = "I" | "II" | "III" | "IV" | "V";

export interface FormulaSpec {
  expression: string;
  symbols?: Record<string, string>;
  use?: string;
  examNote?: string;
}

export interface DifferenceRow {
  feature: string;
  valA: string;
  valB: string;
  valC?: string;
}

export interface DccnCheatTopic {
  id: string;
  title: string;
  unit: UnitId;
  category: string;
  importance: Importance;
  definition: string;
  coreIdea?: string;
  formula?: FormulaSpec;
  steps?: string[];
  keyPoints?: string[];
  differences?: DifferenceRow[];
  examPoints: string[];
  memoryTrigger: string;
  keywords?: string[];
}

export interface DccnUnit {
  id: UnitId;
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{ name: string; topicIds: string[] }>;
}
