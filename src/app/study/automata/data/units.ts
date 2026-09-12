import type { AutomataUnit, UnitId } from "./types";

export const AUTOMATA_UNITS: Record<UnitId, AutomataUnit> = {
  I: {
    id: "I",
    title: "Unit I — Finite Automata",
    subtitle: "Representations · Complexity · Alphabets & Languages · Problems · NFA & Text Search · ε-Transitions · DFA · Subset Construction · Minimization",
    description: "Introduction to Finite Automata, structural representations, automata complexity, central concepts of alphabets/strings/languages, decision problems, formal NFA, text search applications, ε-NFA conversion, DFA definition & string processing, DFA language, subset construction, common DFA design patterns, and DFA minimization via Myhill-Nerode.",
    categories: [
      { name: "Central Concepts & Foundations", topicIds: ["structural-representations", "automata-complexity", "alphabets-strings-languages", "automata-problems"] },
      { name: "Nondeterministic Finite Automata (NFA)", topicIds: ["nfa-formal-definition", "nfa-text-search-app", "epsilon-nfa-definition", "conversion-epsilon-nfa-to-nfa"] },
      { name: "Deterministic Finite Automata (DFA)", topicIds: ["dfa-formal-definition", "dfa-process-strings", "dfa-language", "conversion-nfa-to-dfa", "dfa-design-patterns", "dfa-minimization-myhill-nerode"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Regular Expressions & Context-Free Grammars",
    subtitle: "RE Syntax & Laws · FA-to-RE Arden's & State Elimination · Pumping Lemma Statement & Proofs · CFG, Derivations, Parse Trees & Ambiguity",
    description: "Regular Expressions, algebraic laws, FA-to-RE conversion via Arden's Theorem and State Elimination, Pumping Lemma for Regular Languages statement and non-regularity proofs, Context-Free Grammars (CFG) formal definition, LMD/RMD derivations, parse trees, ambiguity proofs, and disambiguation techniques.",
    categories: [
      { name: "Regular Expressions & Laws", topicIds: ["re-definition-syntax", "re-fa-relationship", "re-applications", "re-algebraic-laws"] },
      { name: "FA to RE Conversions", topicIds: ["fa-to-re-ardens", "fa-to-re-state-elimination"] },
      { name: "Pumping Lemma for Regular Languages", topicIds: ["pumping-lemma-statement", "pumping-lemma-applications"] },
      { name: "Context-Free Grammars (CFG)", topicIds: ["cfg-formal-definition", "cfg-derivations-lmd-rmd", "cfg-language-construction", "cfg-parse-trees", "cfg-ambiguity-proofs", "cfg-disambiguation-precedence"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Pushdown Automata, Turing Machines & Decidability",
    subtitle: "PDA 7-Tuple · Instantaneous Description · Final State vs Empty Stack · CFG ↔ PDA · TM 7-Tuple · TM ID & Moves · Halting & Undecidability",
    description: "Pushdown Automata (PDA) 7-tuple definition, Instantaneous Description (ID), acceptance by final state vs empty stack, equivalence of L(P) and N(P), CFG to PDA & PDA to CFG conversions, Turing Machine physical model & 7-tuple, TM IDs, Turing machine languages (Recursively Enumerable vs Recursive), and Decidability, Halting Problem, Diagonalization & PCP.",
    categories: [
      { name: "Pushdown Automata (PDA)", topicIds: ["pda-formal-definition", "pda-instantaneous-description", "pda-languages-final-state", "pda-languages-empty-stack", "pda-equivalence-modes", "equivalence-cfg-to-pda", "equivalence-pda-to-cfg"] },
      { name: "Turing Machines (TM)", topicIds: ["turing-machine-intro-model", "turing-machine-formal-7tuple", "turing-machine-instantaneous-description", "turing-machine-language"] },
      { name: "Decidability & Undecidability", topicIds: ["decidability-halting-pcp"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Compiler Structure & Lexical Analysis",
    subtitle: "Compiler Architecture · 6 Phase Trace · Symbol Table & Errors · Lexer Role · Tokens/Lexemes · Input Buffering & Sentinels · Lex Tool",
    description: "Structure of a Compiler, front-end analysis vs back-end synthesis, 6 compiler phases trace, symbol table & error handler interfaces, role of lexical analyzer, tokens/lexemes/patterns, input buffering with two-buffer sentinel optimization, token recognition via transition diagrams, lexical conflict resolution, and Lex/Flex analyzer generator tool.",
    categories: [
      { name: "Structure of a Compiler", topicIds: ["compiler-structure-overview", "compiler-6-phases-trace", "symbol-table-error-handler"] },
      { name: "Lexical Analysis & Buffering", topicIds: ["lexical-analyzer-role", "token-lexeme-pattern", "input-buffering-two-buffer", "sentinel-buffer-optimization"] },
      { name: "Token Recognition & Lex Tool", topicIds: ["token-recognition-transition-diagrams", "lexical-conflict-resolution", "lex-analyzer-generator"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Syntax Analysis, SDD & Intermediate Code Generation",
    subtitle: "Parsing Overview · Left Recursion & Factoring · LL(1) FIRST/FOLLOW · Shift-Reduce & Conflicts · SLR/LALR/CLR · SDD & Evaluation · SDTS · AST/DAG/TAC",
    description: "Role of parser, top-down vs bottom-up parsing, eliminating left recursion and left factoring, recursive descent & LL(1) predictive parsing, FIRST and FOLLOW sets calculation, bottom-up shift-reduce parsing, handle pruning, parser conflicts, LR parsing family (SLR(1), LALR(1), CLR(1)), Syntax-Directed Definitions (SDD), synthesized vs inherited attributes, evaluation order dependency graphs, Syntax-Directed Translation Schemes (SDTS), AST, DAG, and Three-Address Code (TAC, Quadruples, Triples).",
    categories: [
      { name: "Syntax Analysis & Grammar Transformations", topicIds: ["syntax-analysis-introduction", "topdown-vs-bottomup", "writing-grammar-left-recursion", "writing-grammar-left-factoring"] },
      { name: "Top-Down & Bottom-Up Parsing", topicIds: ["topdown-recursive-descent", "topdown-predictive-ll1", "first-and-follow-sets", "bottomup-shift-reduce-parsing", "parsing-conflicts-shift-reduce"] },
      { name: "LR Parsing Family", topicIds: ["lr-parsing-slr1", "lr-parsing-lalr1", "lr-parsing-clr1"] },
      { name: "Syntax-Directed Translation (SDT)", topicIds: ["sdd-syntax-directed-definitions", "sdd-evaluation-orders-dependency", "sdts-translation-schemes"] },
      { name: "Intermediate Code Generation (ICG)", topicIds: ["intermediate-code-ast-dag-tac"] },
    ],
  },
};

