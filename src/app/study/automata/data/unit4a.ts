import type { AutomataCheatTopic } from "./types";

export const unit4Topics: AutomataCheatTopic[] = [
  {
    id: "compiler-structure",
    unit: "IV",
    title: "Introduction and Structure of a Compiler",
    category: "Compiler Introduction",
    importance: "MEDIUM",
    definition: "A Compiler translates source code in a high-level language into low-level machine code through a series of phases.",
    coreIdea: "Translation is split into Analysis (Front-end: Lexical, Syntax, Semantic) and Synthesis (Back-end: Intermediate, Optimization, Code Gen).",
    examPoints: [
      "Draw and explain the block diagram of the phases of a compiler.",
      "Explain the difference between a compiler and an interpreter."
    ],
    memoryTrigger: "Lexical → Syntax → Semantic → ICG → Opt → Code Gen.",
    keywords: ["Compiler phases", "Front-end", "Back-end", "Analysis", "Synthesis"],
  },
  {
    id: "lexical-analyzer-role",
    unit: "IV",
    title: "Role of Lexical Analyzer & Input Buffering",
    category: "Lexical Analysis",
    importance: "HIGH",
    definition: "The Lexical Analyzer reads character streams and groups them into meaningful sequences called tokens.",
    coreIdea: "Input buffering (two-buffer scheme) optimizes reading source code from disk to recognize tokens efficiently.",
    differences: [
      { feature: "Lexeme", valA: "The actual text matched (e.g., '123', 'int')", valB: "Found in source code" },
      { feature: "Token", valA: "The abstract category (e.g., NUMBER, KEYWORD)", valB: "Passed to parser" },
    ],
    examPoints: [
      "Explain the role and tasks of the Lexical Analyzer (removing whitespace/comments, identifying tokens).",
      "Describe the two-buffer scheme with sentinels for input buffering."
    ],
    memoryTrigger: "Lexical Analyzer = Scanner. Characters in, Tokens out.",
    keywords: ["Lexical Analyzer", "Token", "Lexeme", "Input Buffering", "Sentinels"],
  },
  {
    id: "lex-generator",
    unit: "IV",
    title: "The Lexical Analyzer Generator Lex",
    category: "Lexical Analysis",
    importance: "MEDIUM",
    definition: "Lex is a tool used to automatically generate a lexical analyzer from a set of regular expression rules provided by the user.",
    coreIdea: "A Lex file contains declarations, transition rules (regex → action), and auxiliary C/C++ code.",
    steps: [
      "1. Write rules in a .l file mapping regular expressions to C code actions.",
      "2. Run 'lex lex.l' to produce lex.yy.c.",
      "3. Compile lex.yy.c with a C compiler to get the scanner executable.",
    ],
    examPoints: [
      "Explain the structure of a Lex program: Declarations %% Rules %% Auxiliary Code.",
    ],
    memoryTrigger: "Lex uses Regular Expressions to build a DFA scanner automatically.",
    keywords: ["Lex tool", "lex.yy.c", "Regular Expressions", "Scanner Generator"],
  },
  {
    id: "token-recognition-buffering",
    unit: "IV",
    title: "Recognition of Tokens & Sentinel Buffer Scheme",
    category: "Lexical Analysis",
    importance: "HIGH",
    definition: "Token recognition matches input text against regular expressions using transition diagrams (DFAs). Input buffering uses a two-buffer scheme with sentinels (EOF characters) at the end of each buffer to minimize disk I/O and lookahead overhead.",
    coreIdea: "Forward pointer scans ahead to find end of token; Lexeme pointer marks start. Sentinels eliminate boundary testing for every character read.",
    steps: [
      "1. Maintain two N-byte buffers loaded alternately from disk.",
      "2. Move 'forward' pointer to scan next character.",
      "3. If forward reaches sentinel EOF at end of buffer 1: reload buffer 2, set forward to start of buffer 2.",
      "4. If forward reaches true EOF at end of file: terminate lexical scan.",
    ],
    examPoints: [
      "Explain the sentinel-based two-buffer input scheme with buffer pair diagrams.",
      "Construct a transition diagram for recognizing identifiers, numbers, and relational operators.",
    ],
    memoryTrigger: "Sentinels = Special EOF markers at buffer ends. Avoids 2 tests per char!",
    keywords: ["Token Recognition", "Input Buffering", "Sentinels", "Forward Pointer", "Transition Diagram"],
  },
];
