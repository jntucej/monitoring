import type { AutomataUnit, UnitId } from "./types";

export const AUTOMATA_UNITS: Record<UnitId, AutomataUnit> = {
  I: {
    id: "I",
    title: "Unit I — Finite Automata",
    subtitle: "Central Concepts · NFA · DFA · ε-NFA · Subset Construction · Minimization",
    description: "Introduction to Finite Automata, non-deterministic & deterministic machines, string processing, ε-transitions, and DFA minimization.",
    categories: [
      { name: "Automata Models", topicIds: ["intro-finite-automata", "dfa-vs-nfa", "nfa-to-dfa-subset", "epsilon-nfa-conversion", "dfa-definition-language"] },
      { name: "Minimization", topicIds: ["dfa-minimization"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Regular Expressions & CFG",
    subtitle: "Regular Expressions · Arden's Theorem · Pumping Lemma · CFG & Derivations",
    description: "Algebraic laws for RE, FA-to-RE conversion via Arden's Theorem, Pumping Lemma for Regular Languages, and Context-Free Grammars, derivations, and parse trees.",
    categories: [
      { name: "Regular Expressions", topicIds: ["re-applications", "pumping-lemma-regular", "fa-to-re-conversion"] },
      { name: "Context-Free Grammars", topicIds: ["cfg-derivations-ambiguity", "cfg-parse-trees-derivations"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — PDA & Turing Machines",
    subtitle: "Pushdown Automata · CFG Equivalence · Turing Machines · Languages & Halting",
    description: "Definition of Pushdown Automaton, acceptance by final state vs empty stack, equivalence of PDA and CFG, Turing Machine model, instantaneous descriptions, and TM languages.",
    categories: [
      { name: "Pushdown Automata", topicIds: ["pda-acceptance", "pda-cfg-equivalence"] },
      { name: "Turing Machines", topicIds: ["turing-machine-definition", "turing-machine-language"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Compiler Introduction & Lexical Analysis",
    subtitle: "Compiler Structure · Lexical Analyzer · Input Buffering · Tokens · Lex Generator",
    description: "Structure of a Compiler, phases of translation, role of lexical analyzer, sentinel input buffering, token recognition, and Lex tool.",
    categories: [
      { name: "Compiler Introduction", topicIds: ["compiler-structure"] },
      { name: "Lexical Analysis", topicIds: ["lexical-analyzer-role", "lex-generator", "token-recognition-buffering"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Syntax Analysis, SDD & Intermediate Code",
    subtitle: "Grammars · LR Parsing · Syntax-Directed Translation · TAC · AST & Quadruples",
    description: "Top-Down & Bottom-Up parsing, eliminating left recursion, LR Parsing (SLR, LALR, CLR), SDD evaluation schemes, Three-Address Code, and Quadruples/Triples.",
    categories: [
      { name: "Syntax Analysis", topicIds: ["parsing-techniques", "lr-parsing", "writing-grammar-parsing"] },
      { name: "Syntax-Directed Translation", topicIds: ["sdd-evaluation"] },
      { name: "Intermediate-Code Generation", topicIds: ["three-address-code", "syntax-trees-quadruples"] },
    ],
  },
};
