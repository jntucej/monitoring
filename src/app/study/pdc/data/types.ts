// Typed model for the PDC (Parallel & Distributed Computing) visual cheat sheets.
// Mirror of ../ml/data/types.ts but scoped to parallel-computing cheat cards.

export type Importance = "HIGH" | "MEDIUM" | "LOW";

// Visual types the PDC renderer understands — includes custom interactive diagrams.
export type PdcVisualType =
  | "flynn"          // Interactive Flynn's taxonomy 2x2 selector
  | "prm"            // Multiprocessor / multicomputer / multivector / PRAM chip diagram
  | "pipeline"       // Horizontal stage pipeline
  | "spacetime"      // Linear pipeline space-time diagram (interactive stepper)
  | "reservation"    // Non-linear pipeline reservation table (interactive)
  | "consistency"    // Memory-consistency model comparison
  | "comparison"     // Two-column comparison table (A vs B)
  | "formula-chip"   // Formula highlight box
  | "scale"          // Fixed-strong vs scaled-strong scalability
  | "amdahl"         // Interactive Amdahl's-law slider
  | "flow"           // Ordered vertical flow
  | "menu"           // Simple chip menu / grid
  | "archtree";      // Architectural development track tree

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

export interface PdcCheatTopic {
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
    type: PdcVisualType;
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

export interface PdcUnit {
  id: "I" | "II" | "III";
  title: string;
  subtitle: string;
  description: string;
  categories: Array<{ name: string; topicIds: string[] }>;
}