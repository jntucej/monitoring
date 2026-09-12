import type { AutomataCheatTopic } from "./types";

export const unit3Topics: AutomataCheatTopic[] = [
  {
    id: "pda-formal-definition",
    unit: "III",
    title: "Pushdown Automata (PDA) Formal 7-Tuple Definition",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "A Pushdown Automaton (PDA) is a 7-tuple P = (Q, Σ, Γ, δ, q₀, Z₀, F) equipped with an infinite LIFO stack memory to accept Context-Free Languages.",
    coreIdea: "PDA transitions depend on (Current State q, Input Symbol a, Top Stack Symbol Z) and replace Z with stack string γ ∈ Γ*.",
    formula: {
      expression: "P = (Q, Σ, Γ, δ, q₀, Z₀, F)   •   δ: Q × (Σ ∪ {ε}) × Γ → 𝒫(Q × Γ*)",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Stack alphabet", Z0: "Initial stack symbol", F: "Final states" },
    },
    examPoints: [
      "State formal 7-tuple definition of Pushdown Automaton.",
      "Design NPDA for L = {aⁿbⁿ | n ≥ 1} or palindromes L = {w w^R}."
    ],
    memoryTrigger: "PDA = NFA + Stack Memory. 7-tuple: (Q, Σ, Γ, δ, q₀, Z₀, F).",
    keywords: ["PDA formal definition", "7-tuple", "stack memory", "LIFO", "push pop"],
  },
  {
    id: "pda-instantaneous-description",
    unit: "III",
    title: "Instantaneous Description (ID) & Transitions of a PDA",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "An Instantaneous Description (ID) represents the complete configuration of a PDA at any step: (q, w, γ) where q is current state, w is remaining unread input string, and γ is full stack contents (top symbol left).",
    coreIdea: "Move step: (q, aw, Zβ) ⊢ (p, w, αβ) if δ(q, a, Z) contains (p, α).",
    formula: {
      expression: "(q, aw, Zβ) ⊢ (p, w, αβ)   when   (p, α) ∈ δ(q, a, Z)",
      symbols: { q: "Current state", a: "Input symbol read", Z: "Top stack symbol popped", α: "New stack string pushed" },
    },
    steps: [
      "1. Push Operation: δ(q, a, Z) = (p, AZ) [Pushes symbol A onto stack].",
      "2. Pop Operation: δ(q, a, Z) = (p, ε) [Pops top symbol Z off stack].",
      "3. Replace Operation: δ(q, a, Z) = (p, B) [Replaces top symbol Z with B].",
    ],
    examPoints: [
      "Write sequence of Instantaneous Descriptions (IDs) tracing PDA processing string `aabb`.",
      "Distinguish Push, Pop, and Skip stack moves in ID notation."
    ],
    memoryTrigger: "PDA ID = (state q, unread input w, stack contents γ). Move notation ⊢.",
    keywords: ["PDA ID", "Instantaneous Description", "stack move", "vdash notation", "push pop replace"],
  },
  {
    id: "pda-languages-final-state",
    unit: "III",
    title: "Acceptance by Final State L(P)",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "The Language accepted by PDA P by Final State, denoted L(P), is the set of all input strings w for which starting at (q₀, w, Z₀) leads to a state q_f ∈ F in zero or more moves, regardless of stack contents.",
    coreIdea: "In L(P) acceptance, when input w is completely consumed, the PDA must halt in an accepting final state q ∈ F. Stack contents do not matter.",
    formula: {
      expression: "L(P) = { w ∈ Σ* | (q₀, w, Z₀) ⊢* (q_f, ε, γ)  where  q_f ∈ F, γ ∈ Γ* }",
      symbols: { "L(P)": "Language accepted by final state", qf: "Final state ∈ F", γ: "Remaining stack string" },
    },
    examPoints: [
      "Define L(P) formally with multi-step move notation ⊢*.",
      "Trace execution of a PDA accepting by final state."
    ],
    memoryTrigger: "L(P) = Land in Final State F when input ends. Stack state ignored.",
    keywords: ["L(P)", "final state acceptance", "accepting state", "PDA language"],
  },
  {
    id: "pda-languages-empty-stack",
    unit: "III",
    title: "Acceptance by Empty Stack N(P)",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "The Language accepted by PDA P by Empty Stack, denoted N(P) or E(P), is the set of all input strings w for which starting at (q₀, w, Z₀) leads to completely clearing the stack (empty stack ε) upon reading w.",
    coreIdea: "In N(P) acceptance, no set of final states F is needed (F = ∅). Acceptance occurs whenever stack becomes completely empty upon consuming input.",
    formula: {
      expression: "N(P) = { w ∈ Σ* | (q₀, w, Z₀) ⊢* (q, ε, ε)  for any q ∈ Q }",
      symbols: { "N(P)": "Language accepted by empty stack", q: "Any state", ε: "Empty stack" },
    },
    examPoints: [
      "Define N(P) formally with Instantaneous Description notation.",
      "Design a PDA accepting L = {aⁿbⁿ | n ≥ 1} by empty stack."
    ],
    memoryTrigger: "N(P) = Stack completely empty when input ends. No final state needed.",
    keywords: ["N(P)", "empty stack acceptance", "cleared stack", "null stack"],
  },
  {
    id: "pda-equivalence-modes",
    unit: "III",
    title: "Equivalence of Acceptance Modes: L(P) ↔ N(P) Conversions",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "Acceptance by Final State L(P) and Acceptance by Empty Stack N(P) are equivalent: given a PDA P₁ with L(P₁), we can construct P₂ such that N(P₂) = L(P₁), and vice versa.",
    coreIdea: "To convert L(P) → N(P): add new start state with bottom marker X₀ and a new clearing state to erase stack upon reaching F.",
    steps: [
      "1. L(P) → N(P): Create start state p₀ pushing initial bottom marker X₀; upon reaching q ∈ F, transition to state p_c that pops all stack symbols.",
      "2. N(P) → L(P): Create start state p₀ pushing initial bottom marker X₀; when X₀ is exposed at stack top, transition to a new final state q_f ∈ F.",
    ],
    examPoints: [
      "Convert a PDA accepting by final state to an equivalent PDA accepting by empty stack step-by-step — 10-mark exam question.",
      "Explain the purpose of adding initial stack marker X₀ during conversion."
    ],
    memoryTrigger: "L(P) ↔ N(P): Add initial bottom marker X₀ + clearing state to erase stack on final state.",
    keywords: ["L(P) to N(P)", "N(P) to L(P)", "PDA equivalence", "bottom stack marker"],
  },
  {
    id: "equivalence-cfg-to-pda",
    unit: "III",
    title: "Equivalence of PDA and CFG: Converting CFG to 1-State PDA",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "Every Context-Free Grammar G = (V, T, P, S) can be converted into an equivalent 1-state PDA P = ({q}, T, V ∪ T, δ, q, S, ∅) accepting by empty stack N(P) = L(G).",
    coreIdea: "1-state PDA uses stack to simulate leftmost derivations top-down. Production A → α pushes RHS α onto stack; terminal symbol matches pop top terminal.",
    steps: [
      "1. For each production A → α ∈ P: add transition δ(q, ε, A) ∋ (q, α) [Replace variable with RHS].",
      "2. For each terminal symbol a ∈ T: add transition δ(q, a, a) ∋ (q, ε) [Pop matching terminal].",
      "3. Start with S on stack. PDA accepts by empty stack N(P) iff input w ∈ L(G).",
    ],
    examPoints: [
      "Convert a given CFG into an equivalent 1-state Pushdown Automaton — guaranteed 10-mark question.",
      "Trace stack steps simulating leftmost derivation of string w."
    ],
    memoryTrigger: "CFG → 1-State PDA: Variable A → Push RHS α; Terminal 'a' → Pop terminal 'a'.",
    keywords: ["CFG to PDA", "1-state PDA", "leftmost derivation simulation", "grammar conversion"],
  },
  {
    id: "equivalence-pda-to-cfg",
    unit: "III",
    title: "Equivalence of PDA and CFG: Converting PDA to CFG",
    category: "Pushdown Automata (PDA)",
    importance: "HIGH",
    definition:
      "Given a PDA P accepting by empty stack N(P), we can construct an equivalent CFG G such that L(G) = N(P) using composite non-terminal variables [q X p].",
    coreIdea: "Variable [q X p] represents a derivation that pops stack symbol X while transitioning PDA state from q to p.",
    steps: [
      "1. Variables V: Start symbol S and triples [q X p] for all states q, p ∈ Q and stack symbols X ∈ Γ.",
      "2. For each state q ∈ Q: add production S → [q₀ Z₀ q].",
      "3. For pop transition δ(q, a, X) ∋ (p, ε): add production [q X p] → a.",
      "4. For push transition δ(q, a, X) ∋ (r, Y₁Y₂...Y_k): add productions [q X p_k] → a [r Y₁ p₁] [p₁ Y₂ p₂] ... [p_{k-1} Y_k p_k].",
    ],
    examPoints: [
      "State the algorithm converting a PDA accepting by empty stack into an equivalent CFG.",
      "Explain the physical meaning of composite variable [q X p]."
    ],
    memoryTrigger: "PDA → CFG: Variables [q X p] represent popping symbol X while moving state from q to p.",
    keywords: ["PDA to CFG", "composite variables", "triple notation", "grammar construction"],
  },
  {
    id: "turing-machine-intro-model",
    unit: "III",
    title: "Introduction to Turing Machine & Physical Computing Model",
    category: "Turing Machines (TM)",
    importance: "HIGH",
    definition:
      "Proposed by Alan Turing in 1936, the Turing Machine (TM) is the ultimate abstract model of general-purpose digital computers. It consists of an infinite 1D tape divided into cells, a read/write head, and a finite control unit.",
    coreIdea: "Unlike Finite Automata or PDAs, a Turing Machine can move both Left (L) and Right (R) on an infinite tape and overwrite symbols at will.",
    differences: [
      { feature: "Finite Automata (FA)", valA: "Read-only input stream; move right only", valB: "Finite memory (states)" },
      { feature: "Pushdown Automata (PDA)", valA: "Read-only input + LIFO stack (top only)", valB: "Memory restricted to top of stack" },
      { feature: "Turing Machine (TM)", valA: "Read/Write infinite tape; move Left and Right", valB: "Random access infinite tape memory" },
    ],
    examPoints: [
      "Describe the physical architecture of a Turing Machine (tape, head, control).",
      "Compare TM memory capabilities with FA and PDA."
    ],
    memoryTrigger: "Turing Machine = Read/Write Infinite Tape + Left/Right Movement.",
    keywords: ["Turing Machine model", "Alan Turing", "infinite tape", "read write head", "computational model"],
  },
  {
    id: "turing-machine-formal-7tuple",
    unit: "III",
    title: "Formal Description of Turing Machine (7-Tuple Model)",
    category: "Turing Machines (TM)",
    importance: "HIGH",
    definition:
      "A Turing Machine is a 7-tuple M = (Q, Σ, Γ, δ, q₀, B, F) where Q is state set, Σ is input alphabet, Γ is tape alphabet (Σ ⊂ Γ), B ∈ Γ \\ Σ is blank symbol, q₀ is start state, F ⊆ Q is final state set, and δ: Q × Γ → Q × Γ × {L, R} is transition function.",
    coreIdea: "Transition δ(q, X) = (p, Y, D): In state q scanning symbol X, write Y, move state to p, and move tape head in direction D ∈ {L, R}.",
    formula: {
      expression: "M = (Q, Σ, Γ, δ, q₀, B, F)   •   δ: Q × Γ → Q × Γ × {L, R}",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Tape alphabet (Σ ⊂ Γ)", B: "Blank symbol", F: "Final states" },
    },
    examPoints: [
      "State formal 7-tuple description of Turing Machine.",
      "Design Turing Machine for unary addition/multiplication or language L = {aⁿbⁿcⁿ | n ≥ 1}."
    ],
    memoryTrigger: "TM 7-Tuple: M = (Q, Σ, Γ, δ, q₀, B, F). δ: Q × Γ → Q × Γ × {L, R}.",
    keywords: ["7-tuple", "tape alphabet", "blank symbol", "transition function", "TM formal definition"],
  },
  {
    id: "turing-machine-instantaneous-description",
    unit: "III",
    title: "Instantaneous Description (ID) of a Turing Machine & Tape Moves",
    category: "Turing Machines (TM)",
    importance: "HIGH",
    definition:
      "An Instantaneous Description (ID) represents the complete configuration of a Turing Machine at any instant: X₁X₂...X_{k-1} q X_k...X_n, capturing current state q, full tape contents, and current head location scanning X_k.",
    coreIdea: "Move notation α q X β ⊢ α' p Y β' traces step-by-step head movements (L or R) and tape modifications.",
    steps: [
      "1. ID format: α q X β (State q placed immediately to the left of scanned symbol X).",
      "2. Right Move: If δ(q, X) = (p, Y, R), then transition is α q X β ⊢ α Y p β.",
      "3. Left Move: If δ(q, X) = (p, Y, L), then transition is Z q X β ⊢ p Z Y β (where Z is symbol left of head).",
    ],
    examPoints: [
      "Write sequence of Instantaneous Descriptions (IDs) tracing execution of a TM on input string w = `aab`.",
      "Explain how tape boundaries and blank symbols (B) are represented in IDs."
    ],
    memoryTrigger: "ID: α q X β (State q placed immediately to the left of scanned tape symbol X).",
    keywords: ["Instantaneous Description", "ID", "TM move", "tape configuration", "transition step"],
  },
  {
    id: "turing-machine-language",
    unit: "III",
    title: "The Language of a Turing Machine: Recursively Enumerable vs Decidable",
    category: "Turing Machines (TM)",
    importance: "HIGH",
    definition:
      "The language accepted by TM M, denoted L(M), is the set of strings w such that q₀w ⊢* α q_f β with q_f ∈ F. TMs can accept, reject (halt in non-final state), or loop infinitely.",
    coreIdea: "Recursively Enumerable (RE) languages are accepted by TMs (may loop on reject). Recursive (Decidable) languages are decided by TMs that ALWAYS halt on ALL inputs.",
    differences: [
      { feature: "Recursive Language (Decidable)", valA: "TM halts on ALL inputs (Accept or Reject)", valB: "True algorithm exists; no infinite loops" },
      { feature: "Recursively Enumerable (RE)", valA: "TM halts & accepts valid strings; MAY LOOP infinitely on invalid strings", valB: "Semi-decidable; no guarantee of halting on reject" },
      { feature: "Complement Closure", valA: "Recursive languages are closed under complementation", valB: "RE languages are NOT closed under complementation" },
    ],
    examPoints: [
      "Differentiate Recursive (Decidable) vs Recursively Enumerable (Semi-decidable) languages — 10-mark guaranteed conceptual question.",
      "State the 3 possible runtime outcomes of running a TM on input string w: Accept, Reject, or Loop."
    ],
    memoryTrigger: "Decidable = Always Halts. Semi-Decidable (RE) = Halts on Accept, May Loop on Reject.",
    keywords: ["Turing Machine Language", "Recursively Enumerable", "Recursive Language", "Halting", "L(M)", "Decidable"],
  },
  {
    id: "decidability-halting-pcp",
    unit: "III",
    title: "Decidability, Undecidability, Halting Problem & PCP",
    category: "Decidability & Undecidability",
    importance: "HIGH",
    definition:
      "A problem is Decidable if there exists a Turing Machine algorithm that halts with a Yes/No answer for every instance. Undecidable problems cannot be solved by any computer program or TM algorithm.",
    coreIdea: "The Halting Problem (determining if an arbitrary TM M halts on input w) is the fundamental UNDECIDABLE problem, proven via Cantor's Diagonalization.",
    steps: [
      "1. Halting Problem H = { <M, w> | M halts on input w }.",
      "2. Assume H is decidable by TM H_decider.",
      "3. Construct adversary TM D that calls H_decider(D, D): if H_decider says D halts on D, D loops forever; if H_decider says D loops, D halts.",
      "4. Contradiction! D halts iff D loops. Conclude Halting Problem is UNDECIDABLE.",
      "5. Other Undecidable Problems: Post Correspondence Problem (PCP), Rice's Theorem (all non-trivial semantic properties of RE languages are undecidable).",
    ],
    examPoints: [
      "State and prove the Undecidability of the Halting Problem using proof by contradiction / diagonalization — 10-mark exam classic.",
      "Define Post Correspondence Problem (PCP) and state Rice's Theorem."
    ],
    memoryTrigger: "Halting Problem = Undecidable! Adversary D halts iff D loops → Contradiction!",
    keywords: ["Decidability", "Undecidability", "Halting Problem", "Diagonalization proof", "PCP", "Rices Theorem"],
  },
];


