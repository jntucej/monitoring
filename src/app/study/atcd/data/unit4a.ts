import type { AtcdCheatTopic } from "./types";

export const unit4Topics: AtcdCheatTopic[] = [
  {
    id: "compiler-structure-phases",
    unit: "IV",
    title: "Structure & 6 Phases of a Compiler",
    category: "Compiler Structure",
    importance: "HIGH",
    definition:
      "A compiler translates source code into equivalent target code in 6 phases: Lexical Analysis, Syntax Analysis, Semantic Analysis, Intermediate Code Gen, Code Optimization, Code Gen.",
    steps: [
      "1. Lexical Analyzer: Characters → Tokens.",
      "2. Syntax Analyzer: Tokens → Parse Tree.",
      "3. Semantic Analyzer: Type checking & Scope verification.",
      "4. Intermediate Code Generator: Generates 3-Address Code (TAC).",
      "5. Code Optimizer: Removes redundant instructions.",
      "6. Code Generator: Emits target machine assembly.",
    ],
    examPoints: [
      "Draw 6-phase compiler block diagram showing Symbol Table and Error Handler interfaces.",
      "Trace phase outputs for statement `position = initial + rate * 60`.",
    ],
    memoryTrigger: "Lexer → Parser → Semantic → ICG → Opt → CodeGen.",
    keywords: ["compiler structure", "compiler phases", "symbol table", "error handler"],
  },
  {
    id: "lexical-analyzer-buffering",
    unit: "IV",
    title: "Role of Lexical Analyzer & Input Buffering",
    category: "Lexical Analysis",
    importance: "HIGH",
    definition:
      "The Lexical Analyzer reads source characters, strips whitespace/comments, and emits tokens. Input Buffering uses two N-byte buffers with Sentinels to speed up character scanning.",
    coreIdea: "Two-Buffer Scheme with Sentinel `eof` avoids boundary testing on every single character read.",
    steps: [
      "1. Two buffers of size N (e.g. N = 4096 bytes) used alternately.",
      "2. `forward` pointer advances character by character.",
      "3. When `forward` hits `eof` at buffer end: reload opposite buffer and reset `forward`.",
    ],
    examPoints: [
      "Explain 2-buffer input buffering mechanism and sentinel optimization.",
      "Differentiate Token, Lexeme, and Pattern.",
    ],
    memoryTrigger: "Input Buffering: 2 buffers + EOF sentinel avoids checking buffer boundary on every char.",
    keywords: ["lexical analyzer", "input buffering", "sentinel", "lexeme", "token"],
  },
  {
    id: "lex-generator-tool",
    unit: "IV",
    title: "The Lexical Analyzer Generator (Lex / Flex)",
    category: "Lexical Analysis",
    importance: "HIGH",
    definition:
      "Lex is a Unix tool that automatically generates a C lexical analyzer (`lex.yy.c`) from regular expression pattern rules.",
    steps: [
      "Lex File Structure (3 Sections separated by '%%'):",
      "Section 1: Declarations & Includes (%{ #include <stdio.h> %}).",
      "Section 2: Rules (Pattern { Action C code }).",
      "Section 3: Auxiliary User Functions (main(), yywrap()).",
    ],
    examPoints: [
      "Write a complete Lex program to count vowels, consonants, lines, and words in an input file.",
      "Explain role of `yylex()`, `yytext`, `yyleng`, and `yywrap()`.",
    ],
    memoryTrigger: "Lex File: Declarations %% Rules %% User Code. Generates lex.yy.c compiled with gcc -lfl.",
    keywords: ["Lex tool", "Flex", "yylex", "yytext", "lex.yy.c"],
  },
];
