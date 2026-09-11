// Generic, subject-agnostic Study Engine Data Types

export type TopicTier = "CORE" | "EXTENDED" | "SUPPORTING";
export type TopicImportance = "HIGH" | "MEDIUM" | "LOW";
export type TopicKind =
  | "concept"
  | "algorithm"
  | "formula"
  | "numerical"
  | "comparison"
  | "proof"
  | "interactive"
  | "workflow"
  | "case-study";

export type TopicVisual =
  | { type: "search"; algorithm?: string; data?: any }
  | { type: "alphabeta"; treeId?: string; data?: any }
  | { type: "csp"; problemId?: string; data?: any }
  | { type: "tableau"; mode?: string; data?: any }
  | { type: "comparison"; data?: { headers?: string[]; rows?: string[][]; note?: string } | any }
  | { type: "vtable"; data?: { headers?: string[]; rows?: string[][]; note?: string } | any }
  | { type: "menu"; data?: { title?: string; chips?: string[]; note?: string } | any }
  | { type: "formula-chip"; data?: { expression?: string; note?: string; blocks?: Array<string | { label: string; value: string }> } | any }
  | { type: "flow"; data?: { title?: string; steps?: string[]; note?: string } | any }
  | { type: "tree"; data?: any }
  | { type: "pipeline"; data?: any }
  | { type: "dendrogram"; data?: any }
  | { type: "sigmoid"; data?: any }
  | { type: "graph"; data?: any }
  | { type: "dbscan"; data?: any }
  | { type: "svm"; data?: any }
  | { type: "rf"; data?: any }
  | { type: "decision-tree"; data?: any };

export interface FormulaSpec {
  expression: string;
  symbols?: Record<string, string>;
  use?: string;
  examNote?: string;
  blocks?: string[] | Array<{ label: string; value: string }>;
}

export interface DifferenceRow {
  feature: string;
  valA: string;
  valB: string;
  valC?: string;
}

export interface ComparisonCardData {
  title: string;
  typeA: string;
  typeB: string;
  rows: DifferenceRow[];
  examNote?: string;
}

export interface RecallQuestion {
  prompt: string;
  answer: string;
  hint?: string;
}

export interface WorkedNumericalStep {
  stepNumber: number;
  title: string;
  formula?: string;
  calculation: string;
  result?: string;
}

export interface WorkedNumerical {
  title: string;
  given: string[];
  formula: string;
  steps: WorkedNumericalStep[];
  answer: string;
}

export interface CheatTopic {
  id: string;
  subjectId?: string;
  unitId?: string;
  unit?: "I" | "II" | "III" | "IV" | "V" | string;
  unitNumber?: "I" | "II" | "III" | "IV" | "V" | string;
  title: string;
  oneLineIdea?: string;
  tier?: TopicTier;
  kind?: TopicKind;
  syllabusRef?: string;
  category: string;
  importance: TopicImportance;
  definition: string;
  coreIdea?: string;
  formula?: FormulaSpec;
  steps?: string[];
  complexity?: {
    time?: string;
    space?: string;
    trainingTime?: string;
    predictionTime?: string;
    completeness?: string;
    optimality?: string;
  };
  visual?: TopicVisual;
  keyPoints?: string[];
  differences?: DifferenceRow[];
  pros?: string[];
  cons?: string[];
  examPoints: string[];
  commonMistakes?: string[];
  memoryTrigger: string;
  keywords?: string[];
  workedNumerical?: WorkedNumerical;
  recallQuestions?: RecallQuestion[];
  deepUnderstanding?: {
    explanation: string;
    example?: string;
  };
}

export interface StudyUnit {
  id: string;
  unitNumber: "I" | "II" | "III" | "IV" | "V";
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{ name: string; topicIds: string[] }>;
}

export interface SubjectMeta {
  id: string;
  title: string;
  code: string;
  description: string;
  units: StudyUnit[];
}


