import type { CdCheatTopic } from "./types";

export const unit3Topics: CdCheatTopic[] = [
  {
    id: "sdt-s-vs-l-attributed",
    unit: "III",
    title: "Syntax-Directed Translation: S-Attributed vs L-Attributed SDD",
    category: "Syntax-Directed Translation",
    importance: "HIGH",
    definition:
      "Syntax-Directed Definitions (SDD) attach semantic rules/attributes to grammar productions.",
    differences: [
      { feature: "S-Attributed SDD", valA: "Uses ONLY Synthesized Attributes", valB: "Evaluated Bottom-Up (LR parser post-reduction)" },
      { feature: "L-Attributed SDD", valA: "Uses Synthesized & Inherited Attributes", valB: "Inherited attributes depend ONLY on parent or left siblings (Evaluated Top-Down / LL)" },
    ],
    examPoints: [
      "Distinguish Synthesized Attributes (computed from children) vs Inherited Attributes (computed from parent/siblings).",
      "Explain why every S-Attributed SDD is also L-Attributed.",
    ],
    memoryTrigger: "S-Attributed = Synthesized only (Bottom-Up). L-Attributed = Left-to-right dependencies (Top-Down).",
    keywords: ["SDT", "SDD", "synthesized attribute", "inherited attribute", "S attributed", "L attributed"],
  },
  {
    id: "three-address-code-quads",
    unit: "III",
    title: "Three-Address Code (TAC), Quadruples & Triples",
    category: "Intermediate Code",
    importance: "HIGH",
    definition:
      "Three-Address Code (TAC) represents code as a sequence of instructions with at most 3 operands: x = y op z.",
    differences: [
      { feature: "Quadruples", valA: "4 Fields: (op, arg1, arg2, result)", valB: "Explicit result field; easy to reorder during optimization" },
      { feature: "Triples", valA: "3 Fields: (op, arg1, arg2)", valB: "Implicit result via position index (i); hard to move code" },
      { feature: "Indirect Triples", valA: "Array of pointers to Triples", valB: "Pointers can be reordered without moving triples" },
    ],
    examPoints: [
      "Translate expression `a = b * -c + b * -c` into TAC, Quadruples, and Triples.",
      "Compare Quadruples vs Triples for optimization pass flexibility.",
    ],
    memoryTrigger: "Quadruples = (op, arg1, arg2, res). Triples = (op, arg1, arg2) indexed by (i).",
    keywords: ["TAC", "three address code", "quadruple", "triple", "indirect triple"],
  },
];
