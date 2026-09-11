import type { AtcdCheatTopic } from "./types";

export const unit1Topics: AtcdCheatTopic[] = [
  {
    id: "automata-central-concepts",
    unit: "I",
    title: "Central Concepts: Alphabets, Strings, Languages & Automata",
    category: "Automata Fundamentals",
    importance: "HIGH",
    definition:
      "Automata theory models discrete mathematical computation. Alphabets (Σ) are finite sets of symbols; Strings (w) are finite sequences of symbols; Languages (L) are sets of strings.",
    formula: {
      expression: "Σ = {a, b}   •   w = abba (|w| = 4)   •   Σ* = set of all strings over Σ",
      symbols: { Σ: "Input alphabet", w: "String over Σ", "|w|": "String length", "Σ*": "Kleene closure (includes ε)" },
    },
    examPoints: [
      "Define Alphabet Σ, String w, Kleene Star Σ*, and Language L.",
      "Distinguish ε (empty string, length 0) from ∅ (empty set, size 0).",
    ],
    memoryTrigger: "Alphabet → String → Language → Automaton (Accepts or Rejects).",
    keywords: ["alphabet", "string", "language", "Kleene star", "automata concepts"],
  },
  {
    id: "dfa-vs-nfa-formal",
    unit: "I",
    title: "Formal Definition of DFA vs NFA",
    category: "Automata Fundamentals",
    importance: "HIGH",
    definition:
      "DFA determines exactly 1 state transition per input symbol; NFA permits 0, 1, or multiple next state transitions per input symbol.",
    differences: [
      { feature: "DFA Transition δ", valA: "δ: Q × Σ → Q", valB: "Exactly 1 deterministic next state for every (state, symbol) pair" },
      { feature: "NFA Transition δ", valA: "δ: Q × (Σ ∪ {ε}) → 2^Q", valB: "Set of possible next states; supports nondeterministic choices & ε-moves" },
    ],
    examPoints: [
      "State formal 5-tuple (Q, Σ, δ, q₀, F) for DFA and NFA.",
      "Trace processing of string 'ab' in DFA vs NFA.",
    ],
    memoryTrigger: "DFA = 1 deterministic path. NFA = tree of parallel computation paths.",
    keywords: ["DFA", "NFA", "formal 5 tuple", "transition function"],
  },
  {
    id: "epsilon-nfa-conversion",
    unit: "I",
    title: "Conversion of ε-NFA to NFA without ε-Transitions",
    category: "Conversions",
    importance: "HIGH",
    definition:
      "Eliminates silent ε-transitions by computing the ε-closure of every state and adjusting transition functions.",
    steps: [
      "1. Compute ε-closure(q) for each state q: all states reachable from q via 0 or more ε-moves.",
      "2. Compute new transition function δ'(q, a) = ε-closure( δ( ε-closure(q), a ) ).",
      "3. New Final States F' = F ∪ {q₀ if ε-closure(q₀) ∩ F ≠ ∅}.",
    ],
    examPoints: [
      "Compute ε-closure for a given state transition diagram.",
      "Convert ε-NFA to equivalent NFA without ε-transitions.",
    ],
    memoryTrigger: "ε-closure = follow all ε arrows. New δ'(q, a) = ε-closure(δ(ε-closure(q), a)).",
    keywords: ["epsilon closure", "epsilon NFA", "NFA conversion"],
  },
  {
    id: "nfa-to-dfa-subset",
    unit: "I",
    title: "NFA to DFA Conversion (Subset Construction)",
    category: "Conversions",
    importance: "HIGH",
    definition:
      "Subset Construction converts an NFA into an equivalent DFA where each DFA state is a subset of NFA states.",
    steps: [
      "1. Start state q₀_DFA = ε-closure({q₀_NFA}).",
      "2. For each state subset S and input symbol 'a': δ_DFA(S, a) = ε-closure( ∪_{q ∈ S} δ_NFA(q, a) ).",
      "3. Repeat until no new subsets appear.",
      "4. Any subset containing an NFA final state becomes a DFA final state.",
    ],
    examPoints: [
      "Convert 3-state NFA/ε-NFA to equivalent DFA — 10-mark numerical certainty.",
      "Calculate max possible states in converted DFA: 2^|Q_NFA|.",
    ],
    memoryTrigger: "Subset Construction: DFA state = subset of NFA states.",
    keywords: ["subset construction", "NFA to DFA", "equivalent DFA"],
  },
];
