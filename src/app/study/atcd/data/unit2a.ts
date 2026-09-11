import type { AtcdCheatTopic } from "./types";

export const unit2Topics: AtcdCheatTopic[] = [
  {
    id: "fa-to-re-conversion",
    unit: "II",
    title: "Finite Automata to Regular Expression Conversion & Laws",
    category: "Regular Expressions",
    importance: "HIGH",
    definition:
      "Arden's Theorem and State Elimination algorithms convert Finite Automata into equivalent Regular Expressions.",
    formula: {
      expression: "R = Q + RP  ⟹  R = Q P*  (if ε ∉ P)",
      symbols: { R: "Target RE", Q: "Base RE", P: "Loop RE" },
      examNote: "Algebraic Laws: L + L = L, (L*)* = L*, (L + M)* = (L* M*)*",
    },
    examPoints: [
      "Solve state equations using Arden's Theorem to get RE from DFA.",
      "State algebraic laws of regular expressions.",
    ],
    memoryTrigger: "R = Q + RP ⟹ R = QP*. Arden's Theorem solves DFA to RE.",
    keywords: ["regular expressions", "Ardens theorem", "FA to RE", "algebraic laws"],
  },
  {
    id: "pumping-lemma-regular",
    unit: "II",
    title: "Pumping Lemma for Regular Languages",
    category: "Regular Expressions",
    importance: "HIGH",
    definition:
      "The Pumping Lemma provides a property that all regular languages satisfy, used to prove a language is NOT regular.",
    steps: [
      "1. Assume L is regular with pumping length p.",
      "2. Pick string w ∈ L with |w| ≥ p (e.g. w = a^p b^p).",
      "3. Split w = xyz such that |xy| ≤ p and |y| ≥ 1.",
      "4. Show x y^i z ∉ L for some i ≥ 0 (Contradiction!).",
    ],
    examPoints: [
      "Prove L = {aⁿbⁿ | n ≥ 0} is NOT regular using Pumping Lemma — guaranteed 10-marker.",
    ],
    memoryTrigger: "w = xyz | |xy| ≤ p, |y| ≥ 1 ⟹ Pump y^i outside language to disprove regularity.",
    keywords: ["pumping lemma", "regular language proof", "non regular"],
  },
  {
    id: "cfg-derivations-parse-trees",
    unit: "II",
    title: "Context-Free Grammars, Derivations & Parse Trees",
    category: "Context-Free Grammars",
    importance: "HIGH",
    definition:
      "A Context-Free Grammar (CFG) is a 4-tuple G = (V, T, P, S) defining Context-Free Languages via production replacements.",
    differences: [
      { feature: "Leftmost Derivation (LMD)", valA: "Always replaces the leftmost non-terminal first", valB: "Used in Top-Down Parsing" },
      { feature: "Rightmost Derivation (RMD)", valA: "Always replaces the rightmost non-terminal first", valB: "Reverse RMD used in Bottom-Up Parsing" },
    ],
    examPoints: [
      "Construct LMD, RMD, and Parse Tree for given string in CFG.",
      "State formal 4-tuple G = (V, T, P, S) for CFG.",
    ],
    memoryTrigger: "LMD = Expand Leftmost Non-terminal. Parse Tree = Graphical derivation representation.",
    keywords: ["CFG", "context free grammar", "LMD", "RMD", "parse tree"],
  },
  {
    id: "cfg-ambiguity",
    unit: "II",
    title: "Ambiguity in Grammars and Languages",
    category: "Context-Free Grammars",
    importance: "HIGH",
    definition:
      "A CFG is ambiguous if there exists at least one string w ∈ L(G) having 2 or more distinct parse trees (or distinct LMDs).",
    steps: [
      "1. Take grammar (e.g. E → E + E | E * E | id).",
      "2. For string 'id + id * id', construct 2 different parse trees.",
      "3. Parse Tree 1 evaluates '+' first; Parse Tree 2 evaluates '*' first.",
      "4. Disambiguate by rewriting grammar with explicit operator precedence & associativity.",
    ],
    examPoints: [
      "Prove ambiguity of arithmetic expression grammar by producing 2 parse trees for 1 string.",
      "Rewrite ambiguous grammar into unambiguous grammar introducing Factor (F) and Term (T).",
    ],
    memoryTrigger: "Ambiguous = 2+ parse trees for 1 string. Fix with precedence levels (E → E + T | T).",
    keywords: ["ambiguity", "ambiguous grammar", "disambiguation", "precedence"],
  },
];
