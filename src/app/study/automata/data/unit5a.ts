import type { AutomataCheatTopic } from "./types";

export const unit5Topics: AutomataCheatTopic[] = [
  {
    id: "halting-problem-pcp",
    unit: "V",
    title: "Halting Problem & Post Correspondence Problem (PCP)",
    category: "Undecidability",
    importance: "HIGH",
    definition:
      "The Halting Problem asks whether a given TM M halts on input w. Alan Turing proved it is UNDECIDABLE using Diagonalization.",
    coreIdea: "Halting Problem (HALT_TM) and Post Correspondence Problem (PCP) are classic undecidable problems.",
    steps: [
      "1. Assume HALT(M, w) exists that returns True if M halts on w, False if it loops.",
      "2. Construct adversary machine D(M): If HALT(M, ⟨M⟩) is True, D loops forever; else D halts.",
      "3. Run D on ⟨D⟩: D(D) halts ⟺ D(D) loops forever (Contradiction!).",
      "4. Therefore, HALT_TM is Undecidable.",
    ],
    examPoints: [
      "Prove Undecidability of Halting Problem via Diagonalization — 10-mark theory favorite.",
      "State Post Correspondence Problem (PCP) and Modified PCP.",
    ],
    memoryTrigger: "Halting Problem: Self-referential paradox D(D) proves no general algorithm can decide halting.",
    keywords: ["halting problem", "undecidable", "diagonalization", "PCP", "reduction"],
  },
  {
    id: "rices-theorem",
    unit: "V",
    title: "Rice's Theorem & Non-Trivial Semantic Properties",
    category: "Undecidability",
    importance: "HIGH",
    definition:
      "Rice's Theorem states that ANY non-trivial semantic property of the language recognized by a Turing Machine is UNDECIDABLE.",
    coreIdea: "Semantic property = property of the language L(M), not the syntax of M. Non-trivial = true for some TMs, false for others.",
    examPoints: [
      "State Rice's Theorem and apply it to test if 'Is L(M) regular?', 'Is L(M) empty?' are undecidable.",
    ],
    memoryTrigger: "Rice's Theorem: If it asks about L(M) and is non-trivial, it is UNDECIDABLE!",
    keywords: ["Rices Theorem", "semantic property", "non trivial property", "undecidability"],
  },
  {
    id: "p-vs-np-completeness",
    unit: "V",
    title: "P, NP, NP-Complete & NP-Hard Complexity Classes",
    category: "Complexity Classes",
    importance: "HIGH",
    definition:
      "Complexity classes characterize decision problems by computational resource bounds (time and space).",
    differences: [
      { feature: "P (Polynomial Time)", valA: "Solvable in O(n^k) deterministic time.", valB: "Sorting, Shortest Path, MST, BFS/DFS" },
      { feature: "NP (Nondeterministic P)", valA: "Verifiable in O(n^k) deterministic time.", valB: "SAT, TSP, Clique, Vertex Cover" },
      { feature: "NP-Complete (NPC)", valA: "Hardest problems in NP (NP AND NP-Hard).", valB: "3-SAT, Traveling Salesperson, Subset Sum" },
      { feature: "NP-Hard", valA: "At least as hard as any problem in NP (not necessarily in NP).", valB: "Halting Problem, TSP Optimization" },
    ],
    examPoints: [
      "Define P, NP, NP-Complete, and NP-Hard classes with Venn diagrams.",
      "State Cook-Levin Theorem (3-SAT is NP-Complete).",
    ],
    memoryTrigger: "P = Fast Solvable. NP = Fast Verifiable. NP-Complete = Hardest in NP.",
    keywords: ["P vs NP", "NP complete", "NP hard", "Cook Levin theorem", "3-SAT"],
  },
];
