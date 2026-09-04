import type { AiCheatTopic } from "./types";

// UNIT-II · Knowledge-Based Agents & Propositional Logic
export const unit2cTopics: AiCheatTopic[] = [
  {
    id: "knowledge-agents",
    title: "Knowledge-Based Agents",
    unit: "II",
    category: "Logic",
    importance: "MEDIUM",
    definition:
      "Agents whose behaviour is driven by a knowledge base (KB): a set of sentences in a knowledge representation language, updated by TELL and queried by ASK, with an inference engine in between.",
    coreIdea: "TELL the KB what's true, ASK it what to do — reasoning replaces hard-coded behaviour.",
    steps: [
      "TELL the KB facts about the world (percepts, laws).",
      "ASK the KB what action to take.",
      "Inference derives which actions are logically entailed.",
      "Execute the chosen action; add the new percept via TELL.",
    ],
    keyPoints: [
      "KB = sentences + inference mechanism.",
      "Knowledge level (what it knows) vs implementation level (sentences/data structures).",
      "Declarative approach: build sentences; procedural: encode behaviour directly.",
    ],
    examPoints: [
      "TELL/ASK interface and knowledge vs implementation level — short-note favourites.",
      "A KB agent is declarative: change the KB, change the behaviour — no recompiling.",
    ],
    memoryTrigger: "KB agent = librarian: TELL it facts, ASK it questions, it reasons in between.",
    keywords: ["knowledge base", "TELL", "ASK", "inference engine"],
  },
  {
    id: "wumpus",
    title: "Wumpus World",
    unit: "II",
    category: "Logic",
    importance: "MEDIUM",
    definition:
      "A grid cave: the agent perceives stench (Wumpus adjacent), breeze (pit adjacent), glitter (gold) and must grab the gold and return without dying — the standard showcase for logical inference under partial observability.",
    coreIdea: "Percepts are local; the KB infers global truths (where pits/Wumpus are NOT, hence where to step).",
    keyPoints: [
      "PEAS: performance (gold, death), environment (4×4 grid), actuators (move, grab, shoot), sensors (stench, breeze, glitter, scream, bump).",
      "Agent reasons over possible worlds — counting models decides safe moves.",
      "Wumpus world demonstrates: incomplete info requires reasoning, not search alone.",
    ],
    examPoints: [
      "Describe PEAS for Wumpus world — the standard environment question.",
      "Show a breeze/stench inference: ¬breeze ⇒ neighbouring squares pit-free.",
    ],
    memoryTrigger: "Breeze ⇒ pit nearby; no breeze ⇒ pit impossible. Logic turns percepts into safety.",
    keywords: ["stench", "breeze", "percept", "possible worlds"],
  },
  {
    id: "propositional-logic",
    title: "Propositional Logic: Syntax & Semantics",
    unit: "II",
    category: "Logic",
    importance: "HIGH",
    definition:
      "Sentences built from proposition symbols with ¬, ∧, ∨, ⇒, ⇔. Semantics: a model assigns true/false to symbols; an entailment KB ⊨ α holds when α is true in ALL models of KB.",
    coreIdea: "Entailment = truth in every model. Valid = true in all models; satisfiable = true in some.",
    visual: {
      type: "vtable",
      data: {
        headers: ["P", "Q", "P⇒Q", "¬P∨Q", "P⇔Q", "¬(P∧Q)", "¬P∨¬Q"],
        rows: [
          ["T", "T", "T", "T", "T", "F", "F"],
          ["T", "F", "F", "F", "F", "T", "T"],
          ["F", "T", "T", "T", "F", "T", "T"],
          ["F", "F", "T", "T", "T", "T", "T"],
        ],
        note: "P⇒Q ≡ ¬P∨Q; ¬(P∧Q) ≡ ¬P∨¬Q (De Morgan). ⇒ is F only when P=T, Q=F.",
      },
    },
    keyPoints: [
      "KB ⊨ α iff KB ∧ ¬α is unsatisfiable (proof by contradiction).",
      "Valid (tautology): true in all models; satisfiable: true in some.",
      "Model checking = enumerate all models — TT-ENTAILS.",
    ],
    examPoints: [
      "Build the truth table for a compound sentence — guaranteed marks.",
      "Prove entailment by showing KB ∧ ¬α unsatisfiable.",
      "De Morgan + implication elimination must be automatic.",
    ],
    memoryTrigger: "⊨ means 'true in every model'. ⇒ is just ¬P ∨ Q in disguise.",
    keywords: ["entailment", "model", "truth table", "valid", "satisfiable"],
  },
  {
    id: "inference-rules",
    title: "Inference Rules & Equivalences",
    unit: "II",
    category: "Logic",
    importance: "HIGH",
    definition:
      "Sound rules derive only entailed sentences; complete rules derive all entailed ones. Modus Ponens, And-Elimination, Unit Resolution, plus standard equivalences form the working toolkit.",
    coreIdea: "Rule of inference = a pattern: from sentences of this shape, conclude that shape.",
    visual: {
      type: "vtable",
      data: {
        headers: ["Rule", "From", "Conclude"],
        rows: [
          ["Modus Ponens", "α⇒β, α", "β"],
          ["Modus Tollens", "α⇒β, ¬β", "¬α"],
          ["And-Elimination", "α∧β", "α"],
          ["Unit Resolution", "α∨β, ¬α", "β"],
          ["Resolution", "α∨β, ¬β∨γ", "α∨γ"],
          ["De Morgan", "¬(α∧β)", "¬α∨¬β"],
        ],
        note: "Modus Ponens = the workhorse; Resolution = the complete single rule for CNF.",
      },
    },
    keyPoints: [
      "Soundness: every derived sentence is entailed. Completeness: every entailed sentence is derivable.",
      "Implication elimination: α⇒β ≡ ¬α∨β — the bridge into CNF.",
      "Resolution is refutation-complete for propositional logic.",
    ],
    examPoints: [
      "Apply 2–3 inference rules to derive a conclusion step by step.",
      "Distinguish soundness from completeness with one example each.",
    ],
    memoryTrigger: "MP needs the implication AND its antecedent; Resolution needs complements to collide.",
    keywords: ["modus ponens", "modus tollens", "resolution", "soundness", "completeness"],
  },
];