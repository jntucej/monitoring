import type { AutomataCheatTopic } from "./types";

export const unit2Topics: AutomataCheatTopic[] = [
  {
    id: "ardens-theorem",
    unit: "II",
    title: "Arden's Theorem & RE Solving",
    category: "Regular Expressions",
    importance: "HIGH",
    definition:
      "Arden's Theorem provides a unique solution for linear equations of regular expressions of the form R = Q + RP.",
    coreIdea: "If P does not contain ε, then R = Q + RP has the unique solution R = QP*.",
    formula: {
      expression: "R = Q + RP  ⟹  R = Q P*",
      symbols: { R: "Unknown RE", Q: "RE term", P: "RE factor (must not contain ε)" },
      examNote: "If P contains ε, R = QP* is a solution, but NOT unique.",
    },
    steps: [
      "1. Write state equation for each state q_i: q_i = ∑ q_j · a_{ji} (+ ε if start state).",
      "2. Substitute equations to isolate target final state equation.",
      "3. Apply Arden's Theorem (R = Q + RP ⟹ R = QP*) to eliminate self-loops.",
    ],
    examPoints: [
      "Find Regular Expression for a given DFA using Arden's Theorem equations.",
      "State condition required for Arden's Theorem uniqueness (ε ∉ P).",
    ],
    memoryTrigger: "R = Q + RP ⟹ R = QP* (Eliminates recursive self-reference).",
    keywords: ["Ardens theorem", "regular expression", "DFA to RE", "linear equations"],
  },
  {
    id: "pumping-lemma-regular",
    unit: "II",
    title: "Pumping Lemma for Regular Languages",
    category: "Regular Expressions",
    importance: "HIGH",
    definition:
      "The Pumping Lemma is a proof technique used to prove that a given language is NOT regular.",
    coreIdea: "If L is regular, any string w ∈ L with |w| ≥ p can be split into w = xyz such that |xy| ≤ p, |y| ≥ 1, and x y^i z ∈ L for all i ≥ 0.",
    steps: [
      "1. Assume L is regular with pumping length p.",
      "2. Choose a specific string w ∈ L with length |w| ≥ p (e.g. w = a^p b^p).",
      "3. Decompose w into xyz with |xy| ≤ p and |y| ≥ 1 (forcing y = a^k for k ≥ 1).",
      "4. Choose i (e.g. i = 2 or i = 0) and show x y^i z ∉ L (Contradiction!).",
      "5. Conclude L is NOT regular.",
    ],
    examPoints: [
      "Prove L = {aⁿbⁿ | n ≥ 0} or L = {w w^R} is NOT regular using Pumping Lemma — guaranteed 10-marker.",
      "State 3 conditions of Pumping Lemma for Regular Languages.",
    ],
    memoryTrigger: "w = xyz | |xy| ≤ p, |y| ≥ 1 ⟹ Pump y^i outside language to prove Non-Regular!",
    keywords: ["pumping lemma", "non regular language", "proof by contradiction", "a^n b^n"],
  },
];
