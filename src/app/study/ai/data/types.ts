// Typed model for the AI (Artificial Intelligence) visual cheat sheets.
// Mirror of ../pdc/data/types.ts scoped to AI exam topics.

export type Importance = "HIGH" | "MEDIUM" | "LOW";

export type AiVisualType =
  | "search"         // Interactive search-algorithm stepper (BFS/DFS/UCS/Greedy/A*)
  | "alphabeta"      // Interactive alpha-beta game tree stepper
  | "comparison"     // Comparison table (algorithm/property grid)
  | "formula-chip"   // Formula highlight blocks
  | "flow"           // Ordered vertical flow
  | "menu"           // Chip menu / grid
  | "vtable"         // Truth-table style table with any header row
  | "tableau"        // FOL quantifier/unification pairing board
  | "csp";           // Interactive Australia map-colouring CSP solver

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

export type UnitId = "I" | "II" | "III" | "IV" | "V";

export interface AiCheatTopic {
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
    type: AiVisualType;
    data?: any;
  };
  keyPoints?: string[];
  differences?: DifferenceRow[];
  pros?: string[];
  cons?: string[];
  examPoints: string[];
  memoryTrigger: string;
  keywords?: string[];
}

export interface AiUnit {
  id: UnitId;
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{ name: string; topicIds: string[] }>;
}