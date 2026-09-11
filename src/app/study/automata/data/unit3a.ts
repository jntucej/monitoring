import type { AutomataCheatTopic } from "./types";

export const unit3Topics: AutomataCheatTopic[] = [
  {
    id: "cfg-ambiguity-cnf",
    unit: "III",
    title: "Grammar Ambiguity & Chomsky Normal Form (CNF)",
    category: "Context-Free Grammars",
    importance: "HIGH",
    definition:
      "A Context-Free Grammar (CFG) is ambiguous if there exists a string with 2 or more distinct parse trees (or leftmost derivations). CNF standardizes productions into A → BC or A → a.",
    coreIdea: "CNF Format: A → BC (2 Non-Terminals) or A → a (1 Terminal). No ε-productions or Unit productions!",
    steps: [
      "1. Eliminate start symbol from RHS (add S₀ → S).",
      "2. Eliminate ε-productions (A → ε).",
      "3. Eliminate Unit productions (A → B).",
      "4. Convert remaining productions into A → BC or A → a.",
    ],
    examPoints: [
      "Prove a given grammar (e.g. E → E + E | E * E | id) is ambiguous.",
      "Convert a CFG to Chomsky Normal Form (CNF) step-by-step.",
    ],
    memoryTrigger: "CNF: A → BC or A → a. Parse tree length for string w: 2|w| - 1 steps.",
    keywords: ["CNF", "Chomsky Normal Form", "ambiguous grammar", "unit production", "epsilon production"],
  },
  {
    id: "pda-acceptance",
    unit: "III",
    title: "Pushdown Automata (PDA) & Stack Acceptance",
    category: "Pushdown Automata",
    importance: "HIGH",
    definition:
      "A Pushdown Automaton is a 7-tuple finite automaton equipped with an infinite stack (LIFO) memory to accept Context-Free Languages.",
    coreIdea: "Acceptance by Final State vs Acceptance by Empty Stack are equivalent for NPDA.",
    formula: {
      expression: "δ: Q × (Σ ∪ {ε}) × Γ → 𝒫(Q × Γ*)",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Stack alphabet", δ: "Transition function" },
    },
    examPoints: [
      "Design NPDA for L = {aⁿbⁿ | n ≥ 1} or L = {w w^R}.",
      "Convert PDA accepting by empty stack to PDA accepting by final state.",
    ],
    memoryTrigger: "PDA = NFA + Stack. Push on 'a', Pop on 'b', Accept on Z₀ / Final State.",
    keywords: ["PDA", "pushdown automata", "stack memory", "empty stack", "final state"],
  },
];
