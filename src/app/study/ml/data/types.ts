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

export interface CheatTopic {
  id: string;
  title: string;
  unit: "I" | "II" | "III";
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
  memoryTrigger: string;
  keywords?: string[];
}

export interface ComparisonCardData {
  title: string;
  typeA: string;
  typeB: string;
  rows: DifferenceRow[];
  examNote?: string;
}

export interface UnitSpec {
  id: "I" | "II" | "III";
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{
    name: string;
    topicIds: string[];
  }>;
}
