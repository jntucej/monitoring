import type { AtcdUnit, UnitId } from "./types";

export const ATCD_UNITS: Record<UnitId, AtcdUnit> = {
  I: {
    id: "I",
    title: "Unit I — Finite Automata (DFA & NFA)",
    subtitle: "Structural Representations · Alphabets & Strings · NFA to DFA · ε-Transitions",
    description: "Central concepts of automata theory, DFA processing, NFA formal definition, text search applications, conversion of ε-NFA to NFA and NFA to DFA.",
    categories: [
      { name: "Automata Fundamentals", topicIds: ["automata-central-concepts", "dfa-vs-nfa-formal"] },
      { name: "Conversions", topicIds: ["epsilon-nfa-conversion", "nfa-to-dfa-subset"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Regular Expressions & Context-Free Grammars",
    subtitle: "Algebraic Laws · FA to RE · Pumping Lemma for RL · CFG & Ambiguity",
    description: "Regular Expressions and laws, FA to RE conversion, Pumping Lemma for Regular Languages, Context-Free Grammars (CFG), leftmost/rightmost derivations, parse trees, and ambiguity.",
    categories: [
      { name: "Regular Expressions", topicIds: ["fa-to-re-conversion", "pumping-lemma-regular"] },
      { name: "Context-Free Grammars", topicIds: ["cfg-derivations-parse-trees", "cfg-ambiguity"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Pushdown Automata & Turing Machines",
    subtitle: "PDA Definition & Languages · Acceptance by Final State · Turing Machine & ID",
    description: "Pushdown Automata (PDA) definition and languages, equivalence of PDA and CFG, acceptance by final state vs empty stack, Turing Machine 7-tuple model, Instantaneous Descriptions (ID).",
    categories: [
      { name: "Pushdown Automata", topicIds: ["pda-definition-acceptance", "pda-cfg-equivalence"] },
      { name: "Turing Machines", topicIds: ["turing-machine-formal", "instantaneous-descriptions"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Compiler Structure & Lexical Analysis",
    subtitle: "Structure of a Compiler · Lexical Analyzer · Input Buffering · Tokens & Lex",
    description: "Phases of compiler, role of lexical analyzer, input buffering techniques (sentinels), recognition of tokens, and Lex lexical analyzer generator.",
    categories: [
      { name: "Compiler Structure", topicIds: ["compiler-structure-phases"] },
      { name: "Lexical Analysis", topicIds: ["lexical-analyzer-buffering", "lex-generator-tool"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Syntax Analysis, SDT & Intermediate Code",
    subtitle: "Top-Down & Bottom-Up Parsing · LR (SLR, LALR, CLR) · SDD & L-Attributed · TAC",
    description: "Writing grammars, Top-Down vs Bottom-Up parsing, LR parsing (SLR, LALR, CLR), Syntax-Directed Definitions (SDD), L-Attributed SDDs, Syntax Trees, and Three-Address Code (TAC).",
    categories: [
      { name: "Syntax Analysis & LR", topicIds: ["topdown-bottomup-parsing", "lr-parsing-slr-lalr-clr"] },
      { name: "SDT & Intermediate Code", topicIds: ["sdd-l-attributed", "three-address-code-variants"] },
    ],
  },
};
