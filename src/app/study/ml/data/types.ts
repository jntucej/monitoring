export type Importance = "HIGH" | "MEDIUM" | "LOW";

export type VisualType =
  | "tree"
  | "flow"
  | "pipeline"
  | "comparison"
  | "dendrogram"
  | "sigmoid"
  | "graph"
  | "dbscan"
  | "svm"
  | "rf"
  | "decision-tree";

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
}

export type UnitId = "I" | "II" | "III" | "IV" | "V";

export interface CheatTopic {
  id: string;
  title: string;
  unit: UnitId;
  category: string;
  importance: Importance;
  definition: string;
  coreIdea?: string;
  formula?: FormulaSpec;
  steps?: string[];
  visual?: {
    type: VisualType;
    data?: any;
  };
  keyPoints?: string[];
  differences?: DifferenceRow[];
  examPoints: string[];
  commonMistakes?: string[];
  memoryTrigger: string;
  keywords?: string[];
  recallQuestions?: Array<{ prompt: string; answer: string; hint?: string }>;
}

export interface ComparisonCardData {
  title: string;
  typeA: string;
  typeB: string;
  rows: DifferenceRow[];
  examNote?: string;
}

export interface UnitSpec {
  id: UnitId;
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{
    name: string;
    topicIds: string[];
  }>;
}
