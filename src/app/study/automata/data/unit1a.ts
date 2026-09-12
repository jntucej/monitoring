import type { AutomataCheatTopic } from "./types";

export const unit1Topics: AutomataCheatTopic[] = [
  {
    id: "structural-representations",
    unit: "I",
    title: "Structural Representations of Automata & Formal Languages",
    category: "Central Concepts & Foundations",
    importance: "HIGH",
    definition:
      "Structural representations provide mathematical models to express formal languages. The primary representations are Automata (operational state graphs/tables), Grammars (generative rewrite rules), and Regular Expressions (declarative algebraic pattern formulas).",
    coreIdea: "Automata specify language recognition; Grammars specify language generation; Regular Expressions specify language syntax pattern declarations.",
    differences: [
      { feature: "Automata (Machines)", valA: "Operational: processes input strings through state transitions", valB: "Determines string acceptance or rejection" },
      { feature: "Grammars (Rules)", valA: "Generative: derives valid strings using production rules A → α", valB: "Generates language sentential forms" },
      { feature: "Regular Expressions", valA: "Declarative: algebraic expression specifying string patterns", valB: "Used directly in text scanners & lexers" },
    ],
    examPoints: [
      "State and compare the 3 structural representations of formal languages.",
      "Explain how State Transition Graphs and Transition Tables represent finite automata."
    ],
    memoryTrigger: "Automata = Recognizer Machine. Grammar = Generator Rules. Regex = Declarative Formula.",
    keywords: ["structural representations", "state transition graph", "transition table", "automata vs grammars"],
  },
  {
    id: "automata-complexity",
    unit: "I",
    title: "Automata & Computational Complexity",
    category: "Central Concepts & Foundations",
    importance: "HIGH",
    definition:
      "Automata Theory classifies computing machines based on their memory constraints. Finite Automata (DFA/NFA) represent the simplest class with strict finite state memory (O(1) memory).",
    coreIdea: "The Chomsky Hierarchy ranks computational models by memory capability: Finite Automata ⊂ Pushdown Automata ⊂ Linear Bounded Automata ⊂ Turing Machines.",
    differences: [
      { feature: "Finite Automata (FA)", valA: "Finite memory (states only)", valB: "Recognizes Regular Languages" },
      { feature: "Pushdown Automata (PDA)", valA: "Infinite Stack memory (LIFO)", valB: "Recognizes Context-Free Languages" },
      { feature: "Turing Machine (TM)", valA: "Infinite Tape memory (random read/write)", valB: "Recognizes Recursively Enumerable Languages" },
    ],
    examPoints: [
      "Explain the concept of Automata Complexity and finite state memory limitations.",
      "Place Finite Automata within the Chomsky Hierarchy of computing models."
    ],
    memoryTrigger: "Finite Automata = O(1) memory. Cannot count arbitrary numbers of symbols without states!",
    keywords: ["automata complexity", "finite memory", "Chomsky hierarchy", "computational capacity"],
  },
  {
    id: "alphabets-strings-languages",
    unit: "I",
    title: "Alphabets (Σ), Strings (w) & Languages (L)",
    category: "Central Concepts & Foundations",
    importance: "HIGH",
    definition:
      "An Alphabet (Σ) is a non-empty finite set of symbols. A String (w) is a finite sequence of symbols chosen from Σ. Length |w| is the number of symbols in w. Empty string (ε) has length 0. A Language (L) is any subset L ⊆ Σ*.",
    coreIdea: "Kleene Star Σ* is the set of all finite strings over Σ including ε. Kleene Plus Σ+ excludes ε (Σ+ = Σ* \\ {ε}).",
    formula: {
      expression: "Σ = {0, 1}   •   w = 0110 (|w|=4)   •   Σ* = {ε, 0, 1, 00, 01...}   •   L ⊆ Σ*",
      symbols: { Σ: "Input alphabet", w: "String over Σ", "|w|": "String length", ε: "Empty string", "Σ*": "Kleene Star (closure)" },
    },
    differences: [
      { feature: "Empty String ε", valA: "String of length 0 (|ε| = 0)", valB: "ε ∈ Σ* (always an element of closure)" },
      { feature: "Empty Language ∅", valA: "Set containing 0 strings (|∅| = 0)", valB: "L = ∅ is a language with no valid strings" },
    ],
    examPoints: [
      "Define Alphabet Σ, String w, Length |w|, Kleene Star Σ*, and Kleene Plus Σ+.",
      "Distinguish clearly between ε (empty string) and ∅ (empty set)."
    ],
    memoryTrigger: "Alphabet Σ → String w → Language L ⊆ Σ*.",
    keywords: ["alphabet", "string", "language", "Kleene star", "Kleene plus", "empty string"],
  },
  {
    id: "automata-problems",
    unit: "I",
    title: "Decision Problems & Language Membership Problems",
    category: "Central Concepts & Foundations",
    importance: "HIGH",
    definition:
      "A Problem in automata theory is formalized as a Decision Problem: given a string w and a language L, decide whether w ∈ L (outputs YES or NO).",
    coreIdea: "Automata act as decision algorithms for language membership problems w ∈ L(M).",
    steps: [
      "1. Input: A string w ∈ Σ* and formal machine description M.",
      "2. Computation: Machine M processes w character-by-character from start state q₀.",
      "3. Decision: If final configuration is an accept state → Output YES (w ∈ L). Else → Output NO (w ∉ L).",
    ],
    examPoints: [
      "Formulate decision problems as language recognition tasks w ∈ L.",
      "Explain membership, emptiness, and equivalence decision problems for finite automata."
    ],
    memoryTrigger: "Automata Problem = Is string w in Language L? Returns YES or NO.",
    keywords: ["decision problem", "language membership", "automata problem", "acceptance problem"],
  },
  {
    id: "nfa-formal-definition",
    unit: "I",
    title: "Nondeterministic Finite Automata (NFA) Formal 5-Tuple",
    category: "Nondeterministic Finite Automata (NFA)",
    importance: "HIGH",
    definition:
      "An NFA is a 5-tuple M = (Q, Σ, δ, q₀, F) where transition function δ: Q × (Σ ∪ {ε}) → 𝒫(Q) maps a state and input symbol to a set of possible next states (powerset 𝒫(Q)).",
    coreIdea: "An NFA explores parallel state transitions. A string w is accepted if AT LEAST ONE computational path lands in a final state in F.",
    formula: {
      expression: "M = (Q, Σ, δ, q₀, F)   •   δ: Q × (Σ ∪ {ε}) → 𝒫(Q)",
      symbols: { Q: "Finite state set", Σ: "Input alphabet", δ: "Transition to powerset 𝒫(Q)", q0: "Start state", F: "Final accepting states" },
    },
    examPoints: [
      "State formal 5-tuple definition of NFA and state transition function δ.",
      "Compare NFA vs DFA: NFA allows multiple next states and ε-transitions; DFA allows exactly 1."
    ],
    memoryTrigger: "NFA = Choice tree of parallel states. At least 1 path in F = ACCEPT.",
    keywords: ["NFA", "formal 5-tuple", "powerset transition", "nondeterminism", "state choices"],
  },
  {
    id: "nfa-text-search-app",
    unit: "I",
    title: "NFA Application: Text Search Algorithms & Pattern Matching",
    category: "Nondeterministic Finite Automata (NFA)",
    importance: "HIGH",
    definition:
      "NFAs power fast keyword pattern search engines (such as grep and string matching libraries) by maintaining a state for each character of the target keyword and an initial self-loop.",
    coreIdea: "An NFA with a self-loop on start state q₀ for all symbols in Σ allows scanning arbitrary text prefixes until keyword match occurs.",
    steps: [
      "1. Construct sequential NFA states for keyword characters (e.g. 'w', 'e', 'b').",
      "2. Add self-loop on start state q₀ for all alphabet symbols Σ (scans text prefix).",
      "3. Sequential transitions advance state on matching keyword characters: δ(q₀, 'w') = {q₁}, δ(q₁, 'e') = {q₂}, δ(q₂, 'b') = {q₃}.",
      "4. Final state q₃ signals keyword match detection.",
    ],
    examPoints: [
      "Illustrate text search NFA construction with an example keyword.",
      "Explain how self-loop at start state enables searching substrings within long text files."
    ],
    memoryTrigger: "Text Search NFA = Self-loop at q₀ + sequential keyword state chain.",
    keywords: ["text search", "pattern matching", "grep application", "keyword NFA", "substring search"],
  },
  {
    id: "epsilon-nfa-definition",
    unit: "I",
    title: "Finite Automata with ε-Transitions (ε-NFA) & ε-Closure",
    category: "Nondeterministic Finite Automata (NFA)",
    importance: "HIGH",
    definition:
      "An ε-NFA extends an NFA by allowing transitions without consuming any input symbol (ε-moves). ε-closure(q) is the set of all states reachable from state q by following 0 or more ε-transitions.",
    coreIdea: "ε-closure(q) represents 'free teleportation' reachable from q without consuming input symbols. Always includes state q itself.",
    formula: {
      expression: "ε-closure(q) = { p ∈ Q | q ⊢* p via ε-moves }   •   q ∈ ε-closure(q)",
      symbols: { "ε-closure(q)": "Set of states reachable via ε-moves", q: "Base state" },
    },
    examPoints: [
      "Compute ε-closure for every state in a given state transition diagram.",
      "Explain the role of ε-transitions in simplifying modular automata design."
    ],
    memoryTrigger: "ε-closure = set of all states reachable following only ε arrows.",
    keywords: ["epsilon NFA", "ε-closure", "epsilon transitions", "silent moves"],
  },
  {
    id: "conversion-epsilon-nfa-to-nfa",
    unit: "I",
    title: "Conversion of ε-NFA to NFA without ε-Transitions",
    category: "Nondeterministic Finite Automata (NFA)",
    importance: "HIGH",
    definition:
      "Eliminates silent ε-moves from an ε-NFA by computing ε-closures before and after symbol transitions, producing an equivalent NFA without ε-transitions.",
    coreIdea: "New transition function δ'(q, a) = ε-closure( δ( ε-closure(q), a ) ).",
    steps: [
      "1. Compute ε-closure(q) for every state q ∈ Q.",
      "2. For each state q and input symbol a ∈ Σ: δ'(q, a) = ε-closure( ∪_{r ∈ ε-closure(q)} δ(r, a) ).",
      "3. Update Final States: F' = F ∪ {q₀ if ε-closure(q₀) ∩ F ≠ ∅}.",
      "4. Erase all ε-transitions from the transition table.",
    ],
    examPoints: [
      "Convert a given ε-NFA into an equivalent NFA without ε-transitions step-by-step — 10-mark exam numerical.",
      "Verify final state inclusion rule when ε-closure of start state contains a final state."
    ],
    memoryTrigger: "δ'(q, a) = closure( δ( closure(q), a ) ). Apply closure BEFORE and AFTER symbol.",
    keywords: ["ε-NFA conversion", "eliminate ε-transitions", "equivalent NFA", "closure algorithm"],
  },
  {
    id: "dfa-formal-definition",
    unit: "I",
    title: "Deterministic Finite Automata (DFA) Formal 5-Tuple Definition",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "A Deterministic Finite Automaton (DFA) is a 5-tuple M = (Q, Σ, δ, q₀, F) where transition function δ: Q × Σ → Q assigns EXACTLY ONE deterministic next state for every state and input symbol pair.",
    coreIdea: "DFA is strict and deterministic: no state choices, no parallel branches, and no ε-transitions allowed.",
    formula: {
      expression: "M = (Q, Σ, δ, q₀, F)   •   δ: Q × Σ → Q",
      symbols: { Q: "Finite set of states", Σ: "Input alphabet", δ: "Deterministic transition function", q0: "Start state", F: "Set of final accept states" },
    },
    differences: [
      { feature: "DFA Transition Function δ", valA: "δ: Q × Σ → Q", valB: "Exactly 1 deterministic next state for every (state, symbol) pair" },
      { feature: "NFA Transition Function δ", valA: "δ: Q × (Σ ∪ {ε}) → 𝒫(Q)", valB: "Set of next states; allows choice of state branches & ε-moves" },
    ],
    examPoints: [
      "State formal 5-tuple definition of DFA and transition function δ.",
      "Contrast DFA transition function δ: Q × Σ → Q with NFA transition function δ: Q × (Σ ∪ {ε}) → 𝒫(Q)."
    ],
    memoryTrigger: "DFA = Exactly 1 arrow per symbol per state. Strictly deterministic.",
    keywords: ["DFA", "formal 5-tuple", "deterministic transition", "DFA definition", "5-tuple"],
  },
  {
    id: "dfa-process-strings",
    unit: "I",
    title: "How A DFA Processes Strings & Extended Transition Function δ*",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "A DFA processes an input string w = a₁a₂...aₙ character-by-character starting at state q₀. The Extended Transition Function δ*: Q × Σ* → Q defines the final state reached after consuming entire string w.",
    coreIdea: "Inductive definition of extended transition function: δ*(q, ε) = q; δ*(q, wa) = δ(δ*(q, w), a).",
    formula: {
      expression: "δ*(q, ε) = q   •   δ*(q, wa) = δ( δ*(q, w), a )",
      symbols: { "δ*": "Extended transition function", w: "String prefix", a: "Last input symbol" },
    },
    steps: [
      "1. Start at q₀ with input string w.",
      "2. For each character aᵢ in w: compute next_state = δ(current_state, aᵢ).",
      "3. Continue iteratively until all symbols in w are read.",
      "4. Final state q_{final} = δ*(q₀, w).",
    ],
    examPoints: [
      "Define the extended transition function δ* inductively.",
      "Trace step-by-step state sequence for string processing on a given DFA."
    ],
    memoryTrigger: "δ*(q, wa) = δ( δ*(q, w), a ). Process string character by character.",
    keywords: ["string processing", "extended transition function", "delta star", "DFA processing"],
  },
  {
    id: "dfa-language",
    unit: "I",
    title: "The Language of a DFA L(M)",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "The Language accepted by DFA M, denoted L(M), is the set of all strings w ∈ Σ* such that processing w starting at q₀ ends in a final accepting state q_f ∈ F.",
    coreIdea: "L(M) = { w ∈ Σ* | δ*(q₀, w) ∈ F }. If δ*(q₀, w) ∉ F, string w is rejected.",
    formula: {
      expression: "L(M) = { w ∈ Σ* | δ*(q₀, w) ∈ F }",
      symbols: { "L(M)": "Language accepted by DFA M", q0: "Start state", F: "Set of final accept states" },
    },
    examPoints: [
      "State formal definition of the language of a DFA using δ*.",
      "Determine if a specific string belongs to L(M) for a given DFA diagram."
    ],
    memoryTrigger: "L(M) = set of all strings that land in a Final State F at the end.",
    keywords: ["language of DFA", "L(M)", "accepting state", "language recognition"],
  },
  {
    id: "conversion-nfa-to-dfa",
    unit: "I",
    title: "Conversion of NFA to DFA (Subset Construction Algorithm)",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "Subset Construction (Powerset Construction) converts any NFA into an equivalent DFA. Each DFA state is a subset S ⊆ Q_NFA of NFA states.",
    coreIdea: "Powerset construction guarantees every NFA can be converted to an equivalent DFA with at most 2^|Q| states.",
    formula: {
      expression: "S₀ = ε-closure({q₀})   •   δ_DFA(S, a) = ε-closure( ∪_{q ∈ S} δ_NFA(q, a) )",
      symbols: { S: "DFA state (subset of NFA states)", S0: "DFA start state", "2^|Q|": "Max possible DFA states" },
    },
    steps: [
      "1. Compute DFA start state S₀ = ε-closure({q₀_NFA}).",
      "2. For each unmarked DFA state subset S and input symbol a ∈ Σ: compute S' = ε-closure( ∪_{q ∈ S} δ_NFA(q, a) ).",
      "3. If S' is a new state subset, add it to DFA state list.",
      "4. Repeat until no new state subsets are discovered.",
      "5. Any DFA subset containing at least one NFA final state becomes a DFA final state.",
    ],
    examPoints: [
      "Convert a given 3 or 4-state NFA/ε-NFA to equivalent DFA — 10-mark exam classic.",
      "Calculate maximum potential states in converted DFA: 2^|Q_NFA|."
    ],
    memoryTrigger: "Subset Construction: DFA state = subset of NFA states. Union transitions + ε-closures.",
    keywords: ["subset construction", "powerset construction", "NFA to DFA", "equivalent DFA"],
  },
  {
    id: "dfa-design-patterns",
    unit: "I",
    title: "Common DFA Design Patterns & State Machine Construction",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "DFA design requires identifying state invariants for target language conditions (e.g. substring matching, symbol counting mod k, prefix/suffix constraints).",
    coreIdea: "State Invariant: Every state q in a DFA must uniquely represent a specific mathematical property of the input prefix read so far.",
    steps: [
      "1. Substring Matching (e.g. containing '101'): State tracks longest prefix of pattern matched so far (q₀='', q₁='1', q₂='10', q₃='101' [Final Trap State]).",
      "2. Modulo Counting (e.g. length |w| mod 3 = 0): State qᵢ represents |w| ≡ i (mod 3). Transitions on any symbol increment state mod 3.",
      "3. Parity Checking (e.g. even 'a's and odd 'b's): Create 4 states for binary product set (Even-Even, Even-Odd, Odd-Even, Odd-Odd).",
    ],
    examPoints: [
      "Construct DFAs for modular arithmetic languages (e.g. binary numbers divisible by 3).",
      "Design DFAs for substring avoidance and prefix/suffix matching."
    ],
    memoryTrigger: "DFA State = Property of input prefix read so far (Modulo, Substring matched, Parity).",
    keywords: ["DFA design patterns", "substring matching", "modulo counting", "parity DFA", "state invariants"],
  },
  {
    id: "dfa-minimization-myhill-nerode",
    unit: "I",
    title: "DFA Minimization (Table Filling & Myhill-Nerode Theorem)",
    category: "Deterministic Finite Automata (DFA)",
    importance: "HIGH",
    definition:
      "DFA Minimization finds the unique minimal-state DFA accepting the exact same language by identifying and merging indistinguishable (equivalent) state pairs using the Table Filling Algorithm based on the Myhill-Nerode Theorem.",
    coreIdea: "Two states p and q are distinguishable if there exists a string w such that exactly one of δ*(p, w) and δ*(q, w) is in F. Indistinguishable state pairs are merged.",
    steps: [
      "1. Eliminate all unreachable states from the start state q₀.",
      "2. Construct an upper triangular table of all state pairs (p, q).",
      "3. Mark all pairs (p, q) where one is Final (F) and the other is Non-Final (Q \\ F) [Base Case].",
      "4. Inductive Step: For each unmarked pair (p, q) and symbol a ∈ Σ: if (δ(p, a), δ(q, a)) is marked, mark (p, q).",
      "5. Repeat step 4 until no new markings occur. Merge all remaining unmarked state pairs into single states.",
    ],
    examPoints: [
      "Minimize a 6-8 state DFA using the Table Filling Algorithm step-by-step — 10-mark guaranteed question.",
      "State Myhill-Nerode Theorem: Number of states in minimal DFA = number of equivalence classes of language L."
    ],
    memoryTrigger: "Table Filling: Mark (F, non-F) → propagate backwards → merge unmarked pairs.",
    keywords: ["DFA minimization", "table filling algorithm", "Myhill-Nerode", "indistinguishable states"],
  },
];


