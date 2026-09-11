import type { AtcdCheatTopic } from "./types";

export const unit3Topics: AtcdCheatTopic[] = [
  {
    id: "pda-definition-acceptance",
    unit: "III",
    title: "Pushdown Automata (PDA) & Stack Acceptance",
    category: "Pushdown Automata",
    importance: "HIGH",
    definition:
      "A Pushdown Automaton is a 7-tuple finite automaton equipped with an infinite stack memory to accept Context-Free Languages.",
    formula: {
      expression: "PDA P = (Q, Σ, Γ, δ, q₀, Z₀, F)   •   δ: Q × (Σ ∪ {ε}) × Γ → 𝒫(Q × Γ*)",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Stack alphabet", Z0: "Initial stack symbol", F: "Final states" },
    },
    differences: [
      { feature: "Acceptance by Final State L(P)", valA: "Halts in a state q ∈ F upon reading whole input string", valB: "Stack state does not matter" },
      { feature: "Acceptance by Empty Stack N(P)", valA: "Clears stack completely (empty stack) upon reading input", valB: "No final state set needed (F = ∅)" },
    ],
    examPoints: [
      "State 7-tuple formal definition of PDA.",
      "Design PDA for L = {aⁿbⁿ | n ≥ 1} or L = {w w^R}.",
    ],
    memoryTrigger: "PDA = NFA + Stack. Push on 'a', Pop on 'b', Accept on Z₀ or Final State.",
    keywords: ["PDA", "pushdown automata", "stack acceptance", "empty stack", "final state"],
  },
  {
    id: "pda-cfg-equivalence",
    unit: "III",
    title: "Equivalence of PDA and CFG",
    category: "Pushdown Automata",
    importance: "MEDIUM",
    definition:
      "A language L is Context-Free if and only if L = L(P) for some Pushdown Automaton P.",
    steps: [
      "1. CFG to PDA: For production A → α, add transition δ(q, ε, A) = (q, α). For terminal 'a', add δ(q, a, a) = (q, ε).",
      "2. Simulates leftmost derivation on stack bottom-up/top-down.",
    ],
    examPoints: [
      "Convert a given CFG into an equivalent 1-state PDA.",
    ],
    memoryTrigger: "CFG ≡ PDA (Every CFG can be converted into a 1-state PDA simulating derivations).",
    keywords: ["PDA CFG equivalence", "grammar to PDA"],
  },
  {
    id: "turing-machine-formal",
    unit: "III",
    title: "Turing Machine Formal Description & 7-Tuple",
    category: "Turing Machines",
    importance: "HIGH",
    definition:
      "A Turing Machine (TM) is a 7-tuple mathematical model of computation consisting of an infinite tape, a read/write head, and a state control.",
    formula: {
      expression: "TM M = (Q, Σ, Γ, δ, q₀, B, F)   •   δ: Q × Γ → Q × Γ × {L, R}",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Tape alphabet (Σ ⊂ Γ)", B: "Blank symbol", F: "Final states" },
    },
    examPoints: [
      "State 7-tuple formal description of Turing Machine.",
      "Design Turing Machine for unary addition, multiplication, or L = {aⁿbⁿcⁿ | n ≥ 1}.",
    ],
    memoryTrigger: "TM = Infinite Tape + Read/Write Head + Left/Right movement.",
    keywords: ["Turing Machine", "7 tuple", "read write head", "tape symbol"],
  },
  {
    id: "instantaneous-descriptions",
    unit: "III",
    title: "Instantaneous Descriptions (ID) & Language of a TM",
    category: "Turing Machines",
    importance: "HIGH",
    definition:
      "An Instantaneous Description (ID) represents the complete current configuration of a Turing Machine: X₁X₂...X_{i-1} q X_i...X_n.",
    coreIdea: "Language of a TM L(M) = set of strings w ∈ Σ* for which M enters an accept state in finite moves.",
    steps: [
      "ID format: α q β where αβ is tape content, q is current state, and head points to first symbol of β.",
      "Move step: X₁X₂ q X₃X₄ ⊢ X₁ p Y X₄ if δ(q, X₃) = (p, Y, L).",
    ],
    examPoints: [
      "Write sequence of Instantaneous Descriptions (IDs) for TM processing string 'aab'.",
      "Distinguish Recursively Enumerable Language (TM halts or loops) vs Recursive Language (TM always halts).",
    ],
    memoryTrigger: "ID: α q β (Captures current tape, head position, and state q).",
    keywords: ["instantaneous description", "ID", "TM moves", "recursively enumerable"],
  },
];
