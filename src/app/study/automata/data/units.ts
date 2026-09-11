import type { AutomataUnit, UnitId } from "./types";

export const AUTOMATA_UNITS: Record<UnitId, AutomataUnit> = {
  I: {
    id: "I",
    title: "Unit I — Finite Automata",
    subtitle: "DFA · NFA · ε-NFA · NFA to DFA Subset Construction · Minimization",
    description: "Deterministic & Non-Deterministic Finite Automata, state transitions, equivalence of NFA and DFA, Myhill-Nerode minimization algorithm.",
    categories: [
      { name: "Automata Models", topicIds: ["dfa-vs-nfa", "nfa-to-dfa-subset"] },
      { name: "Minimization", topicIds: ["dfa-minimization-table"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Regular Expressions & Languages",
    subtitle: "Regular Expressions · Arden's Theorem · Pumping Lemma for RL",
    description: "Regular Expressions, conversion to NFA (Thompson's construction), Arden's Theorem, closure properties of RL, and Pumping Lemma proofs.",
    categories: [
      { name: "Regular Expressions", topicIds: ["ardens-theorem", "pumping-lemma-regular"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — CFG & Pushdown Automata (PDA)",
    subtitle: "Context-Free Grammars · Derivation Trees · CNF / GNF · Pushdown Automata",
    description: "Context-free grammars, ambiguous grammars, Chomsky Normal Form (CNF), Greibach Normal Form (GNF), Pushdown Automata (PDA), and Acceptance by Final State vs Empty Stack.",
    categories: [
      { name: "Context-Free Grammars", topicIds: ["cfg-ambiguity-cnf"] },
      { name: "Pushdown Automata", topicIds: ["pda-acceptance"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Turing Machines & Computability",
    subtitle: "Turing Machine Model · Multi-tape TM · Church-Turing Thesis · Halting Problem",
    description: "Turing Machine definition (7-tuple), instantaneous descriptions, multi-track/multi-tape variations, Universal Turing Machine (UTM), and Church-Turing Thesis.",
    categories: [
      { name: "Turing Machines", topicIds: ["turing-machine-definition", "universal-turing-machine"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Decidability & Complexity",
    subtitle: "Decidability · Undecidability · PCP · Rice's Theorem · P vs NP",
    description: "Decidable vs Undecidable problems, Halting problem proof by reduction, Post Correspondence Problem (PCP), Rice's Theorem, P, NP, NP-Complete, NP-Hard classes.",
    categories: [
      { name: "Undecidability", topicIds: ["halting-problem-pcp", "rices-theorem"] },
      { name: "Complexity Classes", topicIds: ["p-vs-np-completeness"] },
    ],
  },
};
