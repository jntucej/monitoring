import type { AiCheatTopic } from "./types";

// UNIT-II · Resolution, Horn Clauses, Chaining, Model Checking
export const unit2dTopics: AiCheatTopic[] = [
  {
    id: "resolution-pl",
    title: "Resolution in Propositional Logic",
    unit: "II",
    category: "Logic",
    importance: "HIGH",
    definition:
      "Convert the KB to CNF (conjunction of clauses), add ¬α, then repeatedly resolve pairs of clauses containing complementary literals. Deriving the empty clause proves the KB entails α.",
    coreIdea: "Refutation: to prove KB ⊨ α, show KB ∧ ¬α is a contradiction.",
    formula: {
      expression: "(α ∨ β) ∧ (¬β ∨ γ) ⟹ (α ∨ γ)",
      symbols: { CNF: "conjunction of disjunctions of literals", "□": "empty clause = contradiction = proved" },
      examNote: "Resolution is sound and refutation-complete for propositional logic.",
    },
    steps: [
      "Convert every sentence to CNF: eliminate ⇔, ⇒; move ¬ inward (De Morgan); distribute ∨ over ∧.",
      "Add the negation of the query (¬α) to the clause set.",
      "Repeatedly pick two clauses with complementary literals and resolve them.",
      "Add resolvents; the empty clause (□) means KB ⊨ α.",
    ],
    keyPoints: [
      "CNF conversion order matters: biconditional → implication → De Morgan → distribute.",
      "(P ∨ Q) ∧ (¬P ∨ R) resolves to (Q ∨ R).",
      "Unit resolution: one parent is a single literal — the basis of unit propagation.",
    ],
    differences: [
      { feature: "Direct proof", valA: "Derive α from KB", valB: "Hard to guide" },
      { feature: "Refutation", valA: "Assume ¬α, derive □", valB: "Complete, mechanical" },
      { feature: "Model checking", valA: "Enumerate all models", valB: "Exponential but simple" },
    ],
    examPoints: [
      "Convert (A⇒B)∧A to CNF and resolve — the standard trace question.",
      "Show the empty clause explicitly; state soundness + refutation-completeness.",
    ],
    memoryTrigger: "Resolve complements away; empty clause = contradiction = proved.",
    keywords: ["CNF", "resolution", "refutation", "empty clause"],
  },
  {
    id: "horn-chaining",
    title: "Horn Clauses: Forward & Backward Chaining",
    unit: "II",
    category: "Logic",
    importance: "HIGH",
    definition:
      "A Horn clause has at most one positive literal: definite clauses (P₁∧…∧Pₖ ⇒ Q), facts, or the goal clause. Forward chaining derives all consequences; backward chaining works back from the goal.",
    coreIdea: "Horn form makes inference cheap: FC is data-driven, BC is goal-driven.",
    formula: {
      expression: "(P₁ ∧ P₂ ∧ … ∧ Pₖ) ⇒ Q  — one positive literal",
      symbols: { FC: "data-driven, bottom-up", BC: "goal-driven, top-down" },
      examNote: "FC on Horn clauses is linear in KB size; BC is linear for AND-OR trees.",
    },
    steps: [
      "FC: start from known facts; fire any implication whose premises are all known.",
      "Add the conclusion to the fact set; repeat until no change (or query derived).",
      "BC: start from the query; find implications concluding it.",
      "Recursively prove each premise (AND) or check facts (OR) until all reduce to facts.",
    ],
    keyPoints: [
      "AND-OR graphs: AND = premises of one implication, OR = alternative proofs.",
      "FC avoids re-firing via premise counters — O(kn) for n clauses.",
      "BC follows only relevant links; can loop — needs cycle detection.",
      "Use FC when facts are many; BC (Prolog) when the goal is specific.",
    ],
    differences: [
      { feature: "Forward chaining", valA: "Data-driven", valB: "Derives everything — may be wasteful" },
      { feature: "Backward chaining", valA: "Goal-driven", valB: "Focused; can loop recursively" },
      { feature: "Prolog", valA: "Uses BC", valB: "Depth-first, left-to-right" },
    ],
    examPoints: [
      "Trace FC on a small rule set listing derived facts in order — the classic numerical.",
      "Trace BC on the same KB showing the AND-OR tree.",
      "Why Horn form? FC is linear; BC is focused — general clauses lose both.",
    ],
    memoryTrigger: "FC: facts → conclusions (what's true?). BC: goal → subgoals (how to prove?).",
    keywords: ["Horn clause", "forward chaining", "backward chaining", "AND-OR graph"],
  },
  {
    id: "model-checking",
    title: "Model Checking & Local Search (SAT)",
    unit: "II",
    category: "Logic",
    importance: "MEDIUM",
    definition:
      "Model checking decides entailment by directly searching the space of models: complete backtracking (DPLL) or incomplete local search (WalkSAT) over truth assignments.",
    coreIdea: "Skip proofs — hunt for models. DPLL explores systematically; WalkSAT flips bits randomly.",
    formula: {
      expression: "KB ⊨ α  ⇔  KB ∧ ¬α has no model",
      symbols: { DPLL: "backtracking + unit propagation + pure literal", WalkSAT: "random flips to fix unsatisfied clauses" },
      examNote: "DPLL is complete; WalkSAT is fast but incomplete (may miss models).",
    },
    keyPoints: [
      "DPLL improvements: early termination, pure-symbol heuristic, unit clause propagation.",
      "WalkSAT: pick an unsatisfied clause, flip a symbol minimising new conflicts.",
      "SAT is NP-complete; the Wumpus KB can be solved by finding models.",
    ],
    differences: [
      { feature: "Truth tables", valA: "All 2ⁿ models", valB: "Simple, exponential" },
      { feature: "DPLL", valA: "Prunes early", valB: "Complete backtracking" },
      { feature: "WalkSAT", valA: "Local search", valB: "Incomplete but fast" },
    ],
    examPoints: [
      "DPLL's three prunings: early termination, pure literals, unit propagation.",
      "Compare DPLL vs WalkSAT completeness — one-line theory question.",
    ],
    memoryTrigger: "Entailment = no model of KB ∧ ¬α. DPLL searches all, WalkSAT gambles.",
    keywords: ["DPLL", "WalkSAT", "unit propagation", "pure literal", "SAT"],
  },
];