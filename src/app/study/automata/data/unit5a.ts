import type { AutomataCheatTopic } from "./types";

export const unit5Topics: AutomataCheatTopic[] = [
  {
    id: "parsing-techniques",
    unit: "V",
    title: "Syntax Analysis & Parsing Techniques",
    category: "Syntax Analysis",
    importance: "HIGH",
    definition: "Syntax Analysis checks if the token stream forms a valid structure according to a Context-Free Grammar. It builds a syntax tree.",
    coreIdea: "Parsing is divided into Top-Down (starts from root S) and Bottom-Up (starts from leaves).",
    differences: [
      { feature: "Top-Down Parsing", valA: "Generates tree from S down to leaves", valB: "Uses Leftmost Derivation (e.g., Recursive Descent, LL(1))" },
      { feature: "Bottom-Up Parsing", valA: "Reduces leaves up to root S", valB: "Uses Reverse Rightmost Derivation (e.g., Shift-Reduce, LR)" },
    ],
    examPoints: [
      "Eliminate Left Recursion and Left Factoring from a given CFG.",
      "Differentiate between Top-Down and Bottom-Up parsing strategies."
    ],
    memoryTrigger: "Top-Down = Root to Leaf. Bottom-Up = Leaf to Root.",
    keywords: ["Syntax Analysis", "Top-Down", "Bottom-Up", "Left Recursion"],
  },
  {
    id: "lr-parsing",
    unit: "V",
    title: "LR Parsing: Simple LR, LALR, CLR",
    category: "Syntax Analysis",
    importance: "HIGH",
    definition: "LR parsers are table-driven bottom-up parsers. They shift input symbols onto a stack and reduce using grammar rules.",
    coreIdea: "LR(0) items form a DFA. SLR uses FOLLOW sets. CLR uses lookaheads (Item, a). LALR merges states of CLR with same core.",
    differences: [
      { feature: "SLR(1)", valA: "LR(0) items + FOLLOW sets. More conflicts.", valB: "Smallest table, least powerful." },
      { feature: "CLR(1)", valA: "LR(1) items with valid lookaheads.", valB: "Largest table, most powerful." },
      { feature: "LALR(1)", valA: "Merges CLR states with same core items.", valB: "Same table size as SLR, almost as powerful as CLR." },
    ],
    examPoints: [
      "Construct SLR parsing table and sets of LR(0) items.",
      "Compare the power and states of SLR, LALR, and CLR."
    ],
    memoryTrigger: "SLR (Simple), CLR (Canonical/Huge), LALR (Merged/Practial).",
    keywords: ["LR Parsing", "SLR", "LALR", "CLR", "Shift-Reduce"],
  },
  {
    id: "sdd-evaluation",
    unit: "V",
    title: "Syntax-Directed Translation (SDD)",
    category: "Syntax-Directed Translation",
    importance: "MEDIUM",
    definition: "SDD associates grammatical rules with semantic actions. Nodes in the parse tree get 'attributes' assigned to them.",
    coreIdea: "Attributes can be Synthesized (derived from children) or Inherited (derived from parent/siblings).",
    steps: [
      "S-Attributed SDD: Uses ONLY synthesized attributes. Evaluated easily during Bottom-Up parsing.",
      "L-Attributed SDD: Uses synthesized AND inherited attributes (if from left). Evaluated in Left-to-Right Top-Down order.",
    ],
    examPoints: [
      "Define SDD and explain Synthesized vs Inherited Attributes.",
      "Differentiate S-Attributed and L-Attributed definitions."
    ],
    memoryTrigger: "Synthesized = Arrow up. Inherited = Arrow down/sideways.",
    keywords: ["SDD", "Synthesized Attributes", "Inherited Attributes", "S-Attributed", "L-Attributed"],
  },
  {
    id: "three-address-code",
    unit: "V",
    title: "Intermediate-Code Gen: Three-Address Code (TAC)",
    category: "Intermediate-Code Generation",
    importance: "MEDIUM",
    definition: "TAC is an intermediate representation where each instruction has at most three operands (typically 2 sources, 1 destination).",
    coreIdea: "Allows deep optimization independently of the target machine. Common representations: Quadruples, Triples, Indirect Triples.",
    formula: {
      expression: "x = y OP z",
      symbols: { x: "Destination", y: "Source 1", z: "Source 2", OP: "Operator" },
    },
    examPoints: [
      "Convert given expression (e.g., a + b * c) into Directed Acyclic Graph (DAG) or Three-Address Code.",
      "Explain the data structures for TAC: Quadruples, Triples."
    ],
    memoryTrigger: "Three-Address = Max 3 variables per line.",
    keywords: ["Three-Address Code", "TAC", "Quadruples", "Triples", "DAG"],
  },
  {
    id: "writing-grammar-parsing",
    unit: "V",
    title: "Writing Grammars: Eliminating Left Recursion & Left Factoring",
    category: "Syntax Analysis",
    importance: "HIGH",
    definition: "Top-down parsers (like LL(1)) fail on left-recursive grammars (A → Aα | β) due to infinite loops. Left recursion elimination converts A → Aα | β into A → βA' and A' → αA' | ε. Left factoring resolves common prefixes (A → αβ₁ | αβ₂) into A → αA' and A' → β₁ | β₂.",
    coreIdea: "Top-down parsing requires grammars without left-recursion and without common prefixes in RHS alternatives.",
    steps: [
      "1. Immediate Left Recursion A → Aα | β ⟹ Rewrite as A → βA' and A' → αA' | ε.",
      "2. Left Factoring A → αβ₁ | αβ₂ ⟹ Rewrite as A → αA' and A' → β₁ | β₂.",
      "3. Compute FIRST and FOLLOW sets for each non-terminal.",
      "4. Construct LL(1) parsing table; check for multiple entries (conflicts).",
    ],
    examPoints: [
      "Eliminate Left Recursion from a given grammar — guaranteed 5/10-mark question.",
      "Apply Left Factoring to make a grammar suitable for predictive parsing.",
    ],
    memoryTrigger: "A → Aα | β becomes A → βA', A' → αA'|ε. Prevents infinite parser loops!",
    keywords: ["Left Recursion", "Left Factoring", "Writing Grammars", "LL(1)", "FIRST and FOLLOW"],
  },
  {
    id: "syntax-trees-quadruples",
    unit: "V",
    title: "Variants of Syntax Trees, Quadruples & Triples",
    category: "Intermediate-Code Generation",
    importance: "HIGH",
    definition: "Intermediate representations describe source code before target code generation. Abstract Syntax Trees (AST) condense parse trees by removing redundant nodes. Directed Acyclic Graphs (DAG) identify common subexpressions. TAC can be implemented using Quadruples, Triples, or Indirect Triples.",
    coreIdea: "DAG compresses expressions by reusing nodes for identical subexpressions. Quadruples use explicit result fields; Triples reference operation indices.",
    differences: [
      { feature: "Quadruples", valA: "(op, arg1, arg2, result)", valB: "Easy to optimize/reorder; uses explicit temporary names." },
      { feature: "Triples", valA: "(op, arg1, arg2)", valB: "No temp names; uses pointer/index references (difficult to reorder)." },
      { feature: "Indirect Triples", valA: "Array of pointers to triples list", valB: "Easy to reorder via pointer array without moving triples." },
    ],
    examPoints: [
      "Construct AST and DAG for a given arithmetic expression.",
      "Represent Three-Address Code using Quadruples, Triples, and Indirect Triples tables.",
    ],
    memoryTrigger: "Quadruple = 4 columns (op, arg1, arg2, res). Triple = 3 columns (uses pointers).",
    keywords: ["AST", "DAG", "Quadruples", "Triples", "Indirect Triples", "Intermediate Code"],
  },
];
