import type { AtcdCheatTopic } from "./types";

export const unit5Topics: AtcdCheatTopic[] = [
  {
    id: "topdown-bottomup-parsing",
    unit: "V",
    title: "Top-Down vs Bottom-Up Parsing",
    category: "Syntax Analysis & LR",
    importance: "HIGH",
    definition:
      "Parsing constructs a parse tree for an input token stream based on a CFG.",
    differences: [
      { feature: "Top-Down Parsing", valA: "Starts from Start Symbol S and builds down to leaves", valB: "Recursive Descent, LL(1) Predictive Parser" },
      { feature: "Bottom-Up Parsing", valA: "Starts from input leaves and reduces up to Start Symbol S", valB: "Shift-Reduce, SLR, LALR, CLR Parsers" },
    ],
    examPoints: [
      "Compare Top-Down vs Bottom-Up parsing techniques.",
      "Show how Left Recursion breaks Top-Down LL(1) parsers.",
    ],
    memoryTrigger: "Top-Down = Root S → Leaves (LL). Bottom-Up = Leaves → Root S (LR).",
    keywords: ["top down parsing", "bottom up parsing", "LL1", "LR parsing"],
  },
  {
    id: "lr-parsing-slr-lalr-clr",
    unit: "V",
    title: "LR Parsing: SLR(1), LALR(1) & CLR(1)",
    category: "Syntax Analysis & LR",
    importance: "HIGH",
    definition:
      "LR parsers are efficient bottom-up shift-reduce parsers reading input Left-to-right constructing Rightmost derivation in reverse.",
    differences: [
      { feature: "SLR(1)", valA: "Simple LR: uses LR(0) items + FOLLOW sets for reductions", valB: "Easiest to build, but has conflicts on complex grammars" },
      { feature: "LALR(1)", valA: "Merges CLR(1) states with identical LR(0) cores", valB: "Yacc/Bison default choice; compact state count" },
      { feature: "CLR(1)", valA: "Canonical LR: full LR(1) items [A → α·β, a]", valB: "Most powerful, but largest parse table (hundreds of states)" },
    ],
    examPoints: [
      "Construct LR(0) / SLR(1) canonical collection of items for a grammar.",
      "Compare state counts and power: SLR(1) ⊂ LALR(1) ⊂ CLR(1).",
    ],
    memoryTrigger: "LR Parsing: SLR Uses FOLLOW. LALR merges CLR states with same core. CLR = Full Lookahead.",
    keywords: ["SLR1", "LALR1", "CLR1", "LR parsing", "shift reduce"],
  },
  {
    id: "sdd-l-attributed",
    unit: "V",
    title: "Syntax-Directed Definitions (SDD) & L-Attributed SDD",
    category: "SDT & Intermediate Code",
    importance: "HIGH",
    definition:
      "SDD associates attributes with grammar symbols and semantic rules with productions. L-Attributed SDDs allow top-down evaluation.",
    differences: [
      { feature: "S-Attributed SDD", valA: "Uses ONLY Synthesized Attributes", valB: "Evaluated Bottom-Up post reduction" },
      { feature: "L-Attributed SDD", valA: "Synthesized & Inherited Attributes", valB: "Inherited attributes depend ONLY on parent or left-siblings" },
    ],
    examPoints: [
      "Explain S-Attributed vs L-Attributed SDDs with evaluation order dependency graphs.",
      "Implement L-Attributed SDD during Top-Down LL parsing.",
    ],
    memoryTrigger: "S-Attributed = Bottom-Up Synthesized. L-Attributed = Left-to-Right dependencies.",
    keywords: ["SDD", "syntax directed definition", "L-attributed", "S-attributed"],
  },
  {
    id: "three-address-code-variants",
    unit: "V",
    title: "Intermediate Code: Syntax Trees & Three-Address Code (TAC)",
    category: "SDT & Intermediate Code",
    importance: "HIGH",
    definition:
      "Intermediate Code Generation produces an abstract machine-independent representation such as Syntax Trees or Three-Address Code (TAC).",
    differences: [
      { feature: "Quadruples", valA: "4 Fields: (op, arg1, arg2, result)", valB: "Explicit result field; easy code optimization movement" },
      { feature: "Triples", valA: "3 Fields: (op, arg1, arg2)", valB: "Implicit result via position index (i)" },
    ],
    examPoints: [
      "Generate TAC, Quadruples, and Triples for expression `a = b * -c + b * -c`.",
    ],
    memoryTrigger: "TAC = max 3 addresses (x = y op z). Quadruples = (op, arg1, arg2, res).",
    keywords: ["TAC", "three address code", "quadruple", "triple", "intermediate code"],
  },
];
