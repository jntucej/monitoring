import type { AutomataCheatTopic } from "./types";

export const unit4Topics: AutomataCheatTopic[] = [
  {
    id: "compiler-structure-overview",
    unit: "IV",
    title: "Overview & Structure of a Compiler",
    category: "Structure of a Compiler",
    importance: "HIGH",
    definition:
      "A Compiler is a program that translates high-level source code (e.g. C, Java) into equivalent low-level target machine code.",
    coreIdea: "Compiler translation is split into Front-End Analysis (machine independent) and Back-End Synthesis (target machine dependent).",
    differences: [
      { feature: "Compiler", valA: "Translates entire source program into machine code before execution", valB: "Faster execution; upfront compilation phase" },
      { feature: "Interpreter", valA: "Translates and executes source program line-by-line during runtime", valB: "Slower execution; immediate execution without binary creation" },
    ],
    examPoints: [
      "Define Compiler and contrast Compiler vs Interpreter.",
      "Explain Front-End Analysis vs Back-End Synthesis architecture."
    ],
    memoryTrigger: "Compiler = Whole program translation upfront. Interpreter = Line-by-line translation at runtime.",
    keywords: ["compiler overview", "front-end", "back-end", "compiler vs interpreter"],
  },
  {
    id: "compiler-6-phases-trace",
    unit: "IV",
    title: "The 6 Phases of a Compiler & Execution Trace",
    category: "Structure of a Compiler",
    importance: "HIGH",
    definition:
      "Compiler translation proceeds in 6 sequential phases: Lexical Analysis, Syntax Analysis, Semantic Analysis, Intermediate Code Gen (ICG), Code Optimization, and Code Generation.",
    coreIdea: "Phases transform program representation: Characters → Tokens → Parse Tree → Checked Tree → TAC → Optimized TAC → Machine Code.",
    steps: [
      "1. Lexical Analyzer: Character stream `position = initial + rate * 60` → Tokens `<id,1> <=> <id,2> <+> <id,3> <*> <num,60>`.",
      "2. Syntax Analyzer: Tokens → Parse Tree verifying context-free grammar.",
      "3. Semantic Analyzer: Performs type checking & coercions (e.g. integer `60` → float `60.0`).",
      "4. Intermediate Code Generator: Generates Three-Address Code (TAC).",
      "5. Code Optimizer: Eliminates redundant temporaries and operations.",
      "6. Code Generator: Emits target machine assembly instructions.",
    ],
    examPoints: [
      "Draw 6-phase compiler block diagram showing Symbol Table and Error Handler interfaces.",
      "Trace phase outputs for statement `position = initial + rate * 60` — 10-mark question."
    ],
    memoryTrigger: "6 Phases: Lex → Parse → Semantic → ICG → Opt → CodeGen.",
    keywords: ["compiler phases", "phase trace", "6 phases", "lexical syntax semantic ICG opt codegen"],
  },
  {
    id: "symbol-table-error-handler",
    unit: "IV",
    title: "Symbol Table Management & Error Handling Interfaces",
    category: "Structure of a Compiler",
    importance: "HIGH",
    definition:
      "The Symbol Table is a central data structure storing variable names, types, scope levels, memory offsets, and function signatures. The Error Handler reports syntax/semantic errors across all phases.",
    coreIdea: "Symbol Table and Error Handler interact with all 6 compiler phases throughout the translation pipeline.",
    differences: [
      { feature: "Symbol Table", valA: "Stores identifier metadata (type, scope, memory offset)", valB: "Queried & updated by all 6 phases" },
      { feature: "Error Handler", valA: "Detects, reports, and recovers from phase-specific errors", valB: "Provides line numbers and error diagnostics" },
    ],
    examPoints: [
      "Explain the data structures used for Symbol Tables (Hash Tables, Binary Search Trees).",
      "Describe error detection and recovery strategies in compiler front-end."
    ],
    memoryTrigger: "Symbol Table & Error Handler interface with ALL 6 compiler phases.",
    keywords: ["symbol table", "error handler", "error recovery", "identifier metadata"],
  },
  {
    id: "lexical-analyzer-role",
    unit: "IV",
    title: "Role of the Lexical Analyzer (Scanner)",
    category: "Lexical Analysis & Buffering",
    importance: "HIGH",
    definition:
      "The Lexical Analyzer reads the source character stream, strips whitespace & comments, identifies lexemes, inserts entry in symbol table, and returns tokens `<token_name, attribute_value>` to the parser.",
    coreIdea: "Lexer serves as the front-line scanner interfacing with the parser via `getNextToken()` API calls.",
    steps: [
      "1. Read source character stream.",
      "2. Strip comments and whitespace characters (spaces, tabs, newlines).",
      "3. Track source line numbers for diagnostic error reporting.",
      "4. Return token tuple `<token_name, attribute_pointer>` on `getNextToken()` call.",
    ],
    examPoints: [
      "Explain primary tasks of the Lexical Analyzer.",
      "Describe the interface between Lexer and Parser."
    ],
    memoryTrigger: "Lexical Analyzer: Characters in, Tokens out. Strips whitespace & comments.",
    keywords: ["lexical analyzer", "role of lexer", "getNextToken", "scanner tasks"],
  },
  {
    id: "token-lexeme-pattern",
    unit: "IV",
    title: "Distinguishing Tokens, Lexemes & Patterns",
    category: "Lexical Analysis & Buffering",
    importance: "HIGH",
    definition:
      "Lexical analysis defines 3 distinct concepts: Token (abstract symbol category), Lexeme (actual character sequence in source code), and Pattern (regular expression rule describing lexeme set).",
    coreIdea: "Pattern defines the rule; Lexeme is the matching text string; Token is the abstract symbol passed to parser.",
    differences: [
      { feature: "Token", valA: "Abstract category symbol (e.g. `<id>`, `<number>`, `<if>`)", valB: "Returned to parser" },
      { feature: "Lexeme", valA: "Actual matched string text (e.g. `'rate'`, `'3.14'`, `'if'`)", valB: "Extracted from source code" },
      { feature: "Pattern", valA: "Regular expression rule (e.g. `[a-zA-Z_][a-zA-Z0-9_]*`)", valB: "Defines valid lexeme format" },
    ],
    examPoints: [
      "Differentiate Token, Lexeme, and Pattern with concrete examples — 5-mark conceptual classic.",
      "Identify tokens and lexemes in a given source code statement."
    ],
    memoryTrigger: "Pattern = Regex Rule. Lexeme = Actual Text. Token = Abstract Symbol.",
    keywords: ["token", "lexeme", "pattern", "lexical categories"],
  },
  {
    id: "input-buffering-two-buffer",
    unit: "IV",
    title: "Input Buffering: Two-Buffer Scheme & Pointer Management",
    category: "Lexical Analysis & Buffering",
    importance: "HIGH",
    definition:
      "Input Buffering reduces system call disk I/O overhead by maintaining two N-byte buffers loaded alternately. Lexeme beginning pointer (`lexeme_beginning`) marks start of token; forward pointer (`forward`) scans ahead.",
    coreIdea: "Reading 1 character at a time from disk via system calls is prohibitively slow. Two-Buffer scheme loads blocks of N bytes into memory.",
    steps: [
      "1. Maintain two N-byte buffer halves (e.g. N = 4096 bytes) loaded alternately from disk.",
      "2. Pointer `lexeme_beginning` points to start of current candidate token.",
      "3. Pointer `forward` advances character by character until token boundary is matched.",
      "4. When token is accepted: `lexeme_beginning` is set to `forward` position.",
    ],
    examPoints: [
      "Explain the two-buffer input buffering mechanism with buffer diagrams.",
      "Describe `lexeme_beginning` and `forward` pointer movements."
    ],
    memoryTrigger: "Two-Buffer Scheme: Load N-byte blocks. `lexeme_beginning` = start, `forward` = scanner.",
    keywords: ["input buffering", "two-buffer scheme", "lexeme_beginning", "forward pointer", "buffer size N"],
  },
  {
    id: "sentinel-buffer-optimization",
    unit: "IV",
    title: "Sentinel Buffer Scheme Optimization",
    category: "Lexical Analysis & Buffering",
    importance: "HIGH",
    definition:
      "Sentinel optimization places a special `eof` character at the end of each N-byte buffer half to eliminate boundary testing on every single character read.",
    coreIdea: "Without sentinels: 2 tests per char (Check end of buffer AND check symbol). With sentinels: 1 test per char (Check symbol; if `eof` test buffer end).",
    steps: [
      "1. Place sentinel symbol `eof` at index N and 2N in buffer memory.",
      "2. When `forward` scans character: if character != `eof` → process character directly.",
      "3. If character == `eof`: determine whether hit buffer half end (reload next buffer) or true end of file (terminate scan).",
    ],
    examPoints: [
      "Explain how sentinel `eof` eliminates double boundary checks for every character scan — 10-mark question.",
      "Draw sentinel-based buffer pair layout."
    ],
    memoryTrigger: "Sentinels = Special EOF markers at buffer ends. Reduces 2 tests per char to 1 test!",
    keywords: ["sentinel optimization", "eof sentinel", "boundary checks", "buffer optimization"],
  },
  {
    id: "token-recognition-transition-diagrams",
    unit: "IV",
    title: "Recognition of Tokens & Transition Diagrams",
    category: "Token Recognition & Lex Tool",
    importance: "HIGH",
    definition:
      "Token Recognition matches input lexemes against regular expression specifications using Transition Diagrams (DFAs). Transition diagrams model states for recognizing relational operators (`<`, `<=`, `<>`), identifiers, and numbers.",
    coreIdea: "Transition diagrams act as state machines for lexers to scan and return token structures `<token_name, attribute_pointer>`.",
    steps: [
      "1. Draw transition diagram starting from state 0 for each token pattern.",
      "2. State 0 branches on input character: `<` moves to state 1; `=` moves to state 2 (`<=`); `>` moves to state 3 (`<>`).",
      "3. Retract step (*): If scanner scans 1 extra character past token boundary, retract `forward` pointer by 1.",
    ],
    examPoints: [
      "Draw Transition Diagrams for relational operators (`<`, `<=`, `=`, `<>`, `>`, `>=`) and identifiers/numbers.",
      "Explain the retract star (*) mechanism on accepting states."
    ],
    memoryTrigger: "Transition Diagrams = DFAs for Lexer. Retract (*) moves pointer back 1 symbol.",
    keywords: ["token recognition", "transition diagrams", "relational operators", "retract pointer", "lexer states"],
  },
  {
    id: "lexical-conflict-resolution",
    unit: "IV",
    title: "Lexical Conflict Resolution: Longest Match & Keyword Priority",
    category: "Token Recognition & Lex Tool",
    importance: "HIGH",
    definition:
      "Lexical analyzers resolve scanning ambiguities using two fundamental rules: Longest Match (Greedy Match) Rule and Keyword Priority Rule.",
    coreIdea: "Longest Match selects the longest prefix string; Keyword Priority favors reserved keywords over generic identifiers.",
    differences: [
      { feature: "Longest Match Rule", valA: "Selects longest matching lexeme prefix (e.g. `number_of_users` is 1 ID, not `number` + `_of_users`)", valB: "Greedy scanning behavior" },
      { feature: "Keyword Priority Rule", valA: "If string matches Keyword AND Identifier pattern (e.g. `'if'`), Keyword is chosen", valB: "Reserved keywords take precedence" },
    ],
    examPoints: [
      "Explain the 2 conflict resolution rules used by lexical analyzers with clear examples — 5-mark question.",
      "Demonstrate how keyword lookup tables resolve identifier vs keyword ambiguity."
    ],
    memoryTrigger: "Longest Match (Longest wins) + Keyword Priority (Reserved words win over Identifiers).",
    keywords: ["conflict resolution", "longest match rule", "keyword priority", "greedy matching", "reserved words"],
  },
  {
    id: "lex-analyzer-generator",
    unit: "IV",
    title: "The Lexical Analyzer Generator (Lex / Flex)",
    category: "Token Recognition & Lex Tool",
    importance: "HIGH",
    definition:
      "Lex is a Unix tool that automatically generates a C lexical analyzer (`lex.yy.c`) from a specification file (`.l`) containing regular expression pattern-action rules.",
    coreIdea: "Lex specification file structure consists of 3 sections separated by `%%`: Declarations, Rules, and User Subroutines.",
    steps: [
      "1. Section 1 (Declarations): C includes `%{ #include <stdio.h> %}`, regex definitions.",
      "2. Section 2 (Rules): Pattern-action pairs (`pattern { action_C_code; }`).",
      "3. Section 3 (User Code): `main()`, `yywrap()` auxiliary C functions.",
      "4. Build Workflow: `flex lexer.l` → generates `lex.yy.c` → `gcc lex.yy.c -lfl` → `./a.out`.",
    ],
    differences: [
      { feature: "`yylex()`", valA: "Core scanning function generated by Lex", valB: "Called by parser to return next token" },
      { feature: "`yytext`", valA: "Character array holding matched lexeme text", valB: "e.g., `printf(\"Found: %s\", yytext);`" },
      { feature: "`yyleng` & `yywrap()`", valA: "`yyleng` = length of lexeme string", valB: "`yywrap()` = called when EOF reached (return 1 to exit)" },
    ],
    examPoints: [
      "Write a complete Lex program to count vowels, consonants, lines, words, and characters in an input text file — 10-mark code question.",
      "Explain roles of `yylex()`, `yytext`, `yyleng`, and `yywrap()`."
    ],
    memoryTrigger: "Lex File: Declarations %% Rules %% User Code. Generates lex.yy.c compiled with gcc -lfl.",
    keywords: ["Lex tool", "Flex", "yylex", "yytext", "yyleng", "yywrap", "lex.yy.c"],
  },
];


