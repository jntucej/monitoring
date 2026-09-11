import type { AutomataCheatTopic } from "./types";

export const unit3Topics: AutomataCheatTopic[] = [
  {
    id: "pda-acceptance",
    unit: "III",
    title: "Pushdown Automata (PDA) & Acceptance",
    category: "Pushdown Automata",
    importance: "HIGH",
    definition: "A Pushdown Automaton is a finite automaton equipped with an infinite stack (LIFO) memory to accept Context-Free Languages.",
    coreIdea: "It transitions based on State, Input symbol, and Top of Stack. Acceptance can be by Final State or Empty Stack (both are equivalent).",
    formula: {
      expression: "δ: Q × (Σ ∪ {ε}) × Γ → 𝒫(Q × Γ*)",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Stack alphabet", δ: "Transition function" },
    },
    examPoints: [
      "Design NPDA for L = {w c w^R} or balanced parentheses.",
      "Understand the equivalence between PDA and Context-Free Grammars (CFG).",
    ],
    memoryTrigger: "PDA = NFA + Stack. Push, Pop, or Skip on Stack.",
    keywords: ["PDA", "pushdown automata", "stack memory", "empty stack", "final state"],
  },
  {
    id: "turing-machine-definition",
    unit: "III",
    title: "Turing Machine Model & Instantaneous Descriptions",
    category: "Turing Machines",
    importance: "HIGH",
    definition: "A Turing Machine (TM) is a 7-tuple mathematical model of computation consisting of an infinite tape, a read/write head, and a state control.",
    coreIdea: "Transition δ(q, X) = (p, Y, L/R): Read X, write Y, change state to p, move head Left or Right.",
    formula: {
      expression: "TM M = (Q, Σ, Γ, δ, q₀, B, F)",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Tape alphabet (Σ ⊂ Γ)", B: "Blank symbol", F: "Final states" },
    },
    examPoints: [
      "State 7-tuple formal description of a Turing Machine.",
      "Design a Turing Machine for unary addition, multiplication, or L = {aⁿbⁿcⁿ | n ≥ 1}.",
      "Write down Instantaneous Descriptions (IDs) to trace execution."
    ],
    memoryTrigger: "TM = Infinite Tape + Read/Write Head + L/R move. Ultimate computing model!",
    keywords: ["Turing Machine", "7 tuple", "read write head", "tape symbol", "L R move"],
  },
  {
    id: "pda-cfg-equivalence",
    unit: "III",
    title: "Equivalence of PDA and Context-Free Grammars (CFG)",
    category: "Pushdown Automata",
    importance: "HIGH",
    definition: "PDAs and CFGs are equivalent in expressive power: for every CFG G, there exists a PDA M such that L(M) = L(G), and vice versa. Conversion algorithms convert a CFG to a 1-state PDA by placing start symbol on stack and simulating derivations.",
    coreIdea: "CFG generates strings top-down; PDA recognizes strings using stack. CFG → PDA algorithm uses stack to match production RHS.",
    steps: [
      "1. Given CFG G = (V, T, P, S), create 1-state PDA M = ({q}, T, V ∪ T, δ, q, S, ∅).",
      "2. For each variable production A → α: add transition δ(q, ε, A) contains (q, α).",
      "3. For each terminal 'a': add transition δ(q, a, a) contains (q, ε) [Pop matching terminal].",
      "4. PDA accepts by empty stack iff string w ∈ L(G).",
    ],
    examPoints: [
      "Prove equivalence of CFG and PDA.",
      "Convert a given CFG into an equivalent 1-state Pushdown Automaton.",
    ],
    memoryTrigger: "CFG → PDA: Variable production ⟹ Push RHS; Terminal match ⟹ Pop terminal.",
    keywords: ["CFG to PDA", "PDA equivalence", "pushdown automaton conversion", "empty stack acceptance"],
  },
  {
    id: "turing-machine-language",
    unit: "III",
    title: "The Language of a Turing Machine & Acceptance vs Halting",
    category: "Turing Machines",
    importance: "HIGH",
    definition: "The language recognized by a Turing Machine M, denoted L(M), is the set of all input strings w for which M eventually enters an accepting final state. TMs can accept, reject (by halting in non-final state), or loop infinitely.",
    coreIdea: "Recursively Enumerable (RE) Languages = recognized by TMs (may loop on invalid inputs). Recursive (Decidable) Languages = decided by TMs that halt on ALL inputs.",
    differences: [
      { feature: "Recursive Language (Decidable)", valA: "TM halts on ALL inputs (Accept or Reject).", valB: "Algorithm exists; no infinite loops." },
      { feature: "Recursively Enumerable (RE)", valA: "TM accepts valid inputs; may LOOP forever on invalid inputs.", valB: "Semi-decidable; no guarantee of halting on reject." },
    ],
    examPoints: [
      "Differentiate between Turing Acceptable (RE) and Turing Decidable (Recursive) languages.",
      "Explain the 3 possible outcomes of running a TM on input w: Accept, Reject, Loop.",
    ],
    memoryTrigger: "Decidable = Always Halts. Semi-Decidable (RE) = Halts on Accept, May Loop on Reject.",
    keywords: ["Turing Machine Language", "Recursively Enumerable", "Recursive Language", "Halting", "L(M)"],
  },
];
