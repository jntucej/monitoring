import type { CdCheatTopic } from "./types";

export const unit2Topics: CdCheatTopic[] = [
  {
    id: "first-and-follow",
    unit: "II",
    title: "FIRST & FOLLOW Sets Computation",
    category: "Top-Down Parsing",
    importance: "HIGH",
    definition:
      "FIRST(X) is the set of terminals that begin strings derived from X. FOLLOW(A) is the set of terminals that can appear immediately to the right of A.",
    coreIdea: "FIRST computes prefix terminals; FOLLOW computes right-neighbor terminals (used for LL(1) table & ε-reductions).",
    steps: [
      "FIRST(X): If X is terminal, FIRST(X) = {X}. If X → ε, add ε. If X → Y₁Y₂...Y_k, add FIRST(Y₁) \\ {ε}, and so on.",
      "FOLLOW(A): Add $ to FOLLOW(S). If A → α B β, add FIRST(β) \\ {ε} to FOLLOW(B). If A → α B or A → α B β (with ε ∈ FIRST(β)), add FOLLOW(A) to FOLLOW(B).",
    ],
    examPoints: [
      "Compute FIRST and FOLLOW sets for given grammar — guaranteed 10-mark numerical.",
      "Construct LL(1) parsing table using FIRST and FOLLOW.",
    ],
    memoryTrigger: "FIRST = first terminals. FOLLOW = right-hand neighbor terminals (S gets $).",
    keywords: ["FIRST set", "FOLLOW set", "LL1 parsing", "predictive parser"],
  },
  {
    id: "ll1-parsing-table",
    unit: "II",
    title: "LL(1) Predictive Parsing & Table Construction",
    category: "Top-Down Parsing",
    importance: "HIGH",
    definition:
      "LL(1) is a non-recursive, top-down parser that uses 1 token of lookahead to choose productions from a parse table M[A, a].",
    coreIdea: "Grammar is LL(1) if and only if no parse table cell M[A, a] contains multiple entries (no conflicts!).",
    steps: [
      "1. Calculate FIRST and FOLLOW for all non-terminals.",
      "2. For each production A → α:",
      "   - For each terminal 'a' in FIRST(α), add A → α to M[A, a].",
      "   - If ε ∈ FIRST(α), for each terminal 'b' in FOLLOW(A), add A → α to M[A, b].",
    ],
    examPoints: [
      "Construct LL(1) table and check if grammar is LL(1).",
      "Explain how Left Recursion and Left Factoring cause LL(1) conflicts.",
    ],
    memoryTrigger: "LL(1) Table: Entry at M[A, a] for a ∈ FIRST(α), and M[A, b] for b ∈ FOLLOW(A) if ε ∈ FIRST(α).",
    keywords: ["LL1 parsing", "predictive parse table", "left recursion", "left factoring"],
  },
  {
    id: "lr-parsing-comparison",
    unit: "II",
    title: "LR Parsing Hierarchy: LR(0) vs SLR(1) vs LALR(1) vs CLR(1)",
    category: "Bottom-Up Parsing",
    importance: "HIGH",
    definition:
      "LR parsers build parse trees bottom-up by shifting input tokens and reducing handles using item collection states.",
    differences: [
      { feature: "LR(0)", valA: "Reduces indiscriminately in state", valB: "No lookahead; many Shift-Reduce conflicts" },
      { feature: "SLR(1)", valA: "Reduces A → α only for input ∈ FOLLOW(A)", valB: "Simple Lookahead; uses LR(0) items" },
      { feature: "LALR(1)", valA: "Merges LR(1) states with identical LR(0) cores", valB: "Yacc/Bison parser choice; compact & powerful" },
      { feature: "CLR(1)", valA: "Full LR(1) items [A → α·β, a]", valB: "Most powerful, but huge number of states" },
    ],
    examPoints: [
      "Compare state count and parsing power: LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1).",
      "Identify Shift-Reduce (S-R) and Reduce-Reduce (R-R) conflicts.",
    ],
    memoryTrigger: "Power Order: LR(0) < SLR(1) < LALR(1) < CLR(1). LALR(1) merges CLR(1) states with same core.",
    keywords: ["LR parsing", "SLR1", "LALR1", "CLR1", "shift reduce conflict"],
  },
];
