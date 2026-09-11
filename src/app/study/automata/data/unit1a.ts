import type { AutomataCheatTopic } from "./types";

export const unit1Topics: AutomataCheatTopic[] = [
  {
    id: "dfa-vs-nfa",
    unit: "I",
    title: "DFA vs NFA & Formal Definitions",
    category: "Automata Models",
    importance: "HIGH",
    definition:
      "A Finite Automaton reads input strings over an alphabet Σ and decides whether to accept or reject based on state transitions.",
    coreIdea: "DFA: Unique next state δ(q, a) ∈ Q. NFA: Set of next states δ(q, a) ⊆ 2^Q.",
    differences: [
      { feature: "Transition δ", valA: "δ: Q × Σ → Q (Exactly 1 transition per symbol)", valB: "δ: Q × (Σ ∪ {ε}) → 2^Q (Multiple or 0 transitions + ε)" },
      { feature: "Expressive Power", valA: "Recognizes Regular Languages", valB: "Recognizes Regular Languages (Equal Power!)" },
      { feature: "State Count", valA: "May require up to 2^n states vs NFA", valB: "Easier/compact to design" },
    ],
    formula: {
      expression: "DFA M = (Q, Σ, δ, q₀, F)   •   δ: Q × Σ → Q",
      symbols: { Q: "Finite set of states", Σ: "Input alphabet", δ: "Transition function", q0: "Start state", F: "Set of final states" },
    },
    examPoints: [
      "State 5-tuple formal definition of DFA and NFA.",
      "Prove that DFA and NFA accept the exact same class of languages (Regular Languages).",
    ],
    memoryTrigger: "DFA = 1 deterministic arrow per symbol. NFA = choice of arrows + ε moves.",
    keywords: ["DFA", "NFA", "transition function", "5-tuple", "regular language"],
  },
  {
    id: "nfa-to-dfa-subset",
    unit: "I",
    title: "NFA to DFA Conversion (Subset Construction)",
    category: "Automata Models",
    importance: "HIGH",
    definition:
      "Subset Construction converts an NFA (or ε-NFA) into an equivalent DFA where each DFA state corresponds to a subset of NFA states.",
    coreIdea: "New DFA state q_DFA = ε-closure of reachable NFA states for each input symbol.",
    steps: [
      "1. Start state q₀_DFA = ε-closure(q₀_NFA).",
      "2. For each state subset S and input symbol 'a': compute δ_DFA(S, a) = ε-closure( ∪_{q ∈ S} δ_NFA(q, a) ).",
      "3. Repeat until no new state subsets are discovered.",
      "4. Mark any DFA subset containing at least one NFA final state as a DFA Final State.",
    ],
    examPoints: [
      "Convert given 3-state or 4-state NFA/ε-NFA to equivalent DFA — guaranteed 10-mark exam question.",
      "Calculate max possible states in converted DFA: 2^|Q_NFA|.",
    ],
    memoryTrigger: "Subset Construction: DFA states = subsets of NFA states + ε-closure.",
    keywords: ["subset construction", "NFA to DFA", "epsilon closure", "equivalent DFA"],
  },
  {
    id: "dfa-minimization-table",
    unit: "I",
    title: "DFA Minimization (Table Filling / Myhill-Nerode)",
    category: "Minimization",
    importance: "HIGH",
    definition:
      "DFA Minimization finds the unique minimal state DFA accepting the same language by merging equivalent (distinguishable) states.",
    coreIdea: "Two states p, q are 0-distinguishable if one is Final and the other is Non-Final.",
    steps: [
      "1. Remove unreachable states from start state.",
      "2. Draw upper triangular table for all pairs (p, q).",
      "3. Mark 'X' for pairs (p, q) where one is in F and the other is not in F (0-distinguishable).",
      "4. Iteratively mark 'X' for (p, q) if (δ(p, a), δ(q, a)) is already marked 'X' for any symbol 'a'.",
      "5. Unmarked pairs are equivalent: merge them into single states.",
    ],
    examPoints: [
      "Minimize a 6-state or 8-state DFA using the Table Filling Algorithm.",
      "State Myhill-Nerode Theorem for minimal DFA uniqueness.",
    ],
    memoryTrigger: "Table Filling: Mark (Final, Non-Final) → propagate X backwards → merge unmarked pairs.",
    keywords: ["DFA minimization", "table filling algorithm", "distinguishable states", "Myhill-Nerode"],
  },
];
