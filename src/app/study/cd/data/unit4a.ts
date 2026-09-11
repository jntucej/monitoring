import type { CdCheatTopic } from "./types";

export const unit4Topics: CdCheatTopic[] = [
  {
    id: "activation-records-stack",
    unit: "IV",
    title: "Activation Records (Stack Frames) & Memory Layout",
    category: "Runtime Memory",
    importance: "HIGH",
    definition:
      "An Activation Record (Stack Frame) manages storage required for a single procedure call execution.",
    steps: [
      "Activation Record Components (Top to Bottom):",
      "1. Actual Parameters (passed by caller).",
      "2. Return Value.",
      "3. Control Link (Dynamic Link -> caller's frame pointer).",
      "4. Access Link (Static Link -> lexical parent frame pointer).",
      "5. Saved Machine Status (registers, PC).",
      "6. Local Variables.",
      "7. Temporaries.",
    ],
    examPoints: [
      "Draw complete diagram of an Activation Record and label all 7 fields.",
      "Explain role of Access Link (Static Link) for nested procedure scope resolution.",
    ],
    memoryTrigger: "Activation Record = Params + RetVal + DynamicLink + StaticLink + State + Locals + Temps.",
    keywords: ["activation record", "stack frame", "control link", "access link", "lexical scope"],
  },
  {
    id: "symbol-table-structures",
    unit: "IV",
    title: "Symbol Table Organization & Data Structures",
    category: "Symbol Tables",
    importance: "MEDIUM",
    definition:
      "A Symbol Table stores metadata about identifiers (variable names, types, scopes, memory offsets) across all compiler phases.",
    differences: [
      { feature: "Linear List", valA: "Lookup: O(n)", valB: "Simple, high overhead for large code" },
      { feature: "Hash Table", valA: "Lookup: O(1) average", valB: "Fastest; uses separate chaining for collision" },
      { feature: "Binary Search Tree", valA: "Lookup: O(log n)", valB: "Maintains sorted identifier order" },
    ],
    examPoints: [
      "Compare Linear List, Hash Table, and BST for Symbol Table operations.",
      "Explain scope handling using stack of symbol tables.",
    ],
    memoryTrigger: "Symbol Table: Hash Table gives O(1) lookup. Scope stack manages nested blocks.",
    keywords: ["symbol table", "hash table", "scope stack", "identifier lookup"],
  },
];
