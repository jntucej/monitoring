import type { AutomataCheatTopic } from "./types";

export const unit2Topics: AutomataCheatTopic[] = [
  {
    id: "re-applications",
    unit: "II",
    title: "Regular Expressions & Algebraic Laws",
    category: "Regular Expressions",
    importance: "HIGH",
    definition: "Regular Expressions (RE) algebraically describe the languages accepted by Finite Automata.",
    coreIdea: "Rules to build REs: Union (A+B), Concatenation (AB), and Kleene Star (A*).",
    formula: {
      expression: "L(R) = L(A) ∪ L(B), L(A)·L(B), or L(A)*",
      symbols: { "+": "Union", "·": "Concatenation", "*": "Zero or more repetitions" },
    },
    examPoints: [
      "Convert Finite Automata to Regular Expressions.",
      "State laws like Idempotent (R+R=R), Commutative (R+S=S+R), and Distributive properties."
    ],
    memoryTrigger: "RE gives the 'algebra' behind the Automata machine.",
    keywords: ["Regular Expression", "Kleene Star", "Algebraic Laws", "FA to RE"],
  },
  {
    id: "pumping-lemma-regular",
    unit: "II",
    title: "Pumping Lemma for Regular Languages",
    category: "Regular Expressions",
    importance: "HIGH",
    definition: "The Pumping Lemma is a proof technique used to prove that a given language is NOT regular.",
    coreIdea: "If L is regular, any long enough string w can be split into w = xyz such that we can 'pump' y (x y^i z ∈ L).",
    steps: [
      "1. Assume L is regular with pumping length p.",
      "2. Choose a specific string w ∈ L with length |w| ≥ p (e.g. w = a^p b^p).",
      "3. Decompose w into xyz with |xy| ≤ p and |y| ≥ 1.",
      "4. Choose i (e.g. i = 2 or i = 0) and show x y^i z ∉ L (Contradiction!).",
      "5. Conclude L is NOT regular.",
    ],
    examPoints: [
      "Prove L = {aⁿbⁿ | n ≥ 0} or L = {w w^R} is NOT regular using Pumping Lemma.",
      "State 3 conditions of Pumping Lemma for Regular Languages.",
    ],
    memoryTrigger: "w = xyz | |xy| ≤ p, |y| ≥ 1 ⟹ Pump y^i outside language to prove Non-Regular!",
    keywords: ["pumping lemma", "non regular language", "proof by contradiction"],
  },
  {
    id: "cfg-derivations-ambiguity",
    unit: "II",
    title: "CFG, Derivations & Ambiguity",
    category: "Context-Free Grammars",
    importance: "HIGH",
    definition: "A Context-Free Grammar (CFG) describes languages using recursive production rules. A grammar is ambiguous if a string has 2 or more distinct leftmost derivations (or parse trees).",
    coreIdea: "CFGs have more expressive power than Regular Expressions, allowing matching parentheses, palidromes, etc.",
    differences: [
      { feature: "Derivation", valA: "Leftmost (LMD): replace leftmost non-terminal", valB: "Rightmost (RMD): replace rightmost non-terminal" },
      { feature: "Ambiguity", valA: "Multiple distinct Parse Trees for 1 string", valB: "Determined structurally by grammar." },
    ],
    formula: {
      expression: "G = (V, T, P, S)",
      symbols: { V: "Variables (Non-terminals)", T: "Terminals", P: "Productions", S: "Start symbol" },
    },
    examPoints: [
      "Write a CFG for L = {aⁿbⁿ | n ≥ 1}.",
      "Prove a given grammar (e.g. E → E + E | E * E | id) is ambiguous.",
    ],
    memoryTrigger: "Ambiguity = 2+ Parse Trees. CFG = Variables replacing into Terminals.",
    keywords: ["CFG", "Derivation", "Parse Tree", "Ambiguity"],
  },
  {
    id: "fa-to-re-conversion",
    unit: "II",
    title: "Conversion of Finite Automata to Regular Expressions (Arden's Theorem)",
    category: "Regular Expressions",
    importance: "HIGH",
    definition: "Arden's Theorem helps convert FA state equations into RE. If P does not contain ε, then R = Q + RP has the unique solution R = QP*. FA-to-RE conversion sets up linear state equations and solves them iteratively using Arden's Law.",
    coreIdea: "Write an equation for each state q_i = ∑ q_j · a_{ji} (+ ε if start). Eliminate non-target states using R = Q + RP ⟹ R = QP*.",
    formula: {
      expression: "R = Q + RP  ⟹  R = Q P*  (valid when ε ∉ P)",
      symbols: { R: "Unknown RE", Q: "RE term", P: "Self-loop factor without ε" },
      examNote: "If P contains ε, R = QP* is a solution but NOT unique!",
    },
    steps: [
      "1. Write state equations for every state in the FA: q_i = ∑ q_j · label(q_j → q_i) (+ ε for start state).",
      "2. Substitute equations into each other to isolate the final state equation.",
      "3. Apply Arden's Theorem R = Q + RP ⟹ R = QP* whenever a state references itself.",
      "4. Express final state equation purely in terms of input symbols = resulting RE.",
    ],
    examPoints: [
      "State Arden's Theorem and its condition for uniqueness (ε ∉ P).",
      "Find the Regular Expression for a 3-state or 4-state DFA using state equations.",
    ],
    memoryTrigger: "R = Q + RP ⟹ R = QP*. Eliminates recursive self-loops in state equations.",
    keywords: ["Ardens Theorem", "FA to RE", "state equations", "regular expression conversion"],
  },
  {
    id: "cfg-parse-trees-derivations",
    unit: "II",
    title: "Derivations (LMD & RMD), Language of CFG & Parse Trees",
    category: "Context-Free Grammars",
    importance: "HIGH",
    definition: "A derivation replaces non-terminals with production RHS step-by-step. Leftmost Derivation (LMD) replaces the leftmost non-terminal first at each step; Rightmost Derivation (RMD) replaces the rightmost first. A Parse Tree is a graphical tree representation of a derivation, independent of LMD/RMD order.",
    coreIdea: "Parse Tree leaves (yield) read left-to-right produce the string w. One parse tree can correspond to 1 LMD and 1 RMD.",
    differences: [
      { feature: "Replacement Order", valA: "LMD: Leftmost non-terminal first", valB: "RMD: Rightmost non-terminal first" },
      { feature: "Parse Tree Link", valA: "Corresponds 1-to-1 with parse tree", valB: "Corresponds 1-to-1 with parse tree" },
      { feature: "Parser Usage", valA: "Used by Top-Down parsers (LL)", valB: "Used by Bottom-Up parsers (LR in reverse)" },
    ],
    examPoints: [
      "Given a CFG and a string, construct Leftmost Derivation, Rightmost Derivation, and Parse Tree.",
      "Show yield of a parse tree matches the target string.",
    ],
    memoryTrigger: "LMD = Expand left variable first. RMD = Expand right variable first. Parse tree = Visual structure.",
    keywords: ["LMD", "RMD", "Leftmost Derivation", "Rightmost Derivation", "Parse Tree", "CFG Language"],
  },
];
