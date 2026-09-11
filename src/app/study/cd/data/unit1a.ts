import type { CdCheatTopic } from "./types";

export const unit1Topics: CdCheatTopic[] = [
  {
    id: "compiler-phases-overview",
    unit: "I",
    title: "6 Phases of a Compiler & Symbol Table Interface",
    category: "Compiler Phases",
    importance: "HIGH",
    definition:
      "A compiler translates source code written in a high-level language into equivalent target machine code through 6 linear analysis and synthesis phases.",
    coreIdea: "Analysis (Front-End): Lexical → Syntax → Semantic. Synthesis (Back-End): Intermediate Code → Code Opt → Code Gen.",
    steps: [
      "1. Lexical Analyzer (Scanner): Reads characters, outputs stream of Tokens.",
      "2. Syntax Analyzer (Parser): Builds Parse Tree / Syntax Tree.",
      "3. Semantic Analyzer: Performs type checking & scope verification.",
      "4. Intermediate Code Generator: Generates TAC / Abstract Syntax Tree.",
      "5. Code Optimizer: Improves performance (eliminates redundant ops).",
      "6. Code Generator: Emits target assembly / machine code.",
    ],
    examPoints: [
      "Draw complete block diagram of 6 compiler phases with Symbol Table and Error Handler.",
      "Trace intermediate outputs of all 6 phases for 'position = initial + rate * 60'.",
    ],
    memoryTrigger: "Lexical → Syntax → Semantic → ICG → Code Opt → Code Gen.",
    keywords: ["compiler phases", "front end", "back end", "symbol table", "error handler"],
  },
  {
    id: "lexical-analyzer-flex",
    unit: "I",
    title: "Lexical Analyzer, Tokens, Patterns & Lex Tool",
    category: "Lexical Analysis",
    importance: "HIGH",
    definition:
      "The Lexical Analyzer scans source text character-by-character, grouping characters into lexemes and emitting (Token, Attribute) pairs.",
    differences: [
      { feature: "Token", valA: "Abstract symbol (e.g. `id`, `if`, `num`)", valB: "Returned to Parser" },
      { feature: "Lexeme", valA: "Actual character string in source code (e.g. `total_count`, `3.14`)", valB: "Matched by pattern" },
      { feature: "Pattern", valA: "Rule describing set of lexemes (Regular Expression)", valB: "e.g. `[a-zA-Z_][a-zA-Z0-9_]*`" },
    ],
    steps: [
      "Lex File Structure: 3 Sections separated by '%%':",
      "Section 1: Declarations & Headers (%{ ... %}).",
      "Section 2: Rules (Pattern { Action }).",
      "Section 3: C Code (main() and yylex()).",
    ],
    examPoints: [
      "Differentiate Token, Lexeme, and Pattern with examples.",
      "Write Flex/Lex specification to count lines, words, and characters.",
    ],
    memoryTrigger: "Token = Category, Lexeme = Instance, Pattern = Rule. Lex file = Declarations %% Rules %% C Code.",
    keywords: ["lexical analyzer", "token", "lexeme", "pattern", "flex", "yylex"],
  },
];
