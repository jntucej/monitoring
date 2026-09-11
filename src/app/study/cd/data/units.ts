import type { CdUnit, UnitId } from "./types";

export const CD_UNITS: Record<UnitId, CdUnit> = {
  I: {
    id: "I",
    title: "Unit I — Compiler Structure & Lexical Analysis",
    subtitle: "Phases of Compiler · Lexical Analyzer · Lex / Flex Tool",
    description: "6 Phases of Compiler (Lexical, Syntactic, Semantic, Intermediate Code, Code Opt, Code Gen), symbol table, error handler, Lex tool structure.",
    categories: [
      { name: "Compiler Phases", topicIds: ["compiler-phases-overview"] },
      { name: "Lexical Analysis", topicIds: ["lexical-analyzer-flex"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Syntax Analysis & Parsing",
    subtitle: "Top-Down LL(1) · FIRST & FOLLOW · Bottom-Up LR(0), SLR(1), LALR(1), CLR(1)",
    description: "Top-down predictive parsing, LL(1) parse table construction, FIRST and FOLLOW sets, Bottom-up Shift-Reduce parsing, LR(0), SLR(1), LALR(1), CLR(1) item sets.",
    categories: [
      { name: "Top-Down Parsing", topicIds: ["first-and-follow", "ll1-parsing-table"] },
      { name: "Bottom-Up Parsing", topicIds: ["lr-parsing-comparison"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Syntax-Directed Translation & Intermediate Code",
    subtitle: "SDT · S-Attributed vs L-Attributed · Three-Address Code (TAC)",
    description: "Syntax-Directed Definitions (SDD), S-attributed vs L-attributed SDT, Three-Address Code (TAC) representations: Quadruples, Triples, Indirect Triples.",
    categories: [
      { name: "Syntax-Directed Translation", topicIds: ["sdt-s-vs-l-attributed"] },
      { name: "Intermediate Code", topicIds: ["three-address-code-quads"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Runtime Storage Organization & Symbol Tables",
    subtitle: "Activation Records · Stack Allocation · Heap Management · Symbol Table",
    description: "Runtime memory layout (Code, Static, Heap, Stack), Activation Record structure, Access/Control links, Symbol Table data structures (Hash table, Binary Search Tree).",
    categories: [
      { name: "Runtime Memory", topicIds: ["activation-records-stack"] },
      { name: "Symbol Tables", topicIds: ["symbol-table-structures"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Code Optimization & Target Code Generation",
    subtitle: "Basic Blocks · Flow Graphs · DAG · Peephole Optimization · Register Allocation",
    description: "Principal sources of optimization (Dead code elimination, Constant folding, Loop invariant code motion), Basic Blocks and Flow Graphs, DAG representation, Register Allocation (Graph Coloring).",
    categories: [
      { name: "Optimization Techniques", topicIds: ["code-optimization-dag"] },
      { name: "Code Generation", topicIds: ["register-allocation-graph-coloring"] },
    ],
  },
};
