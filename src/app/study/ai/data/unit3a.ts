import type { AiCheatTopic } from "./types";

// UNIT-III · First-Order Logic
export const unit3aTopics: AiCheatTopic[] = [
  {
    id: "fol-syntax",
    title: "FOL Syntax: Constants, Variables, Predicates, Functions, Quantifiers",
    unit: "III",
    category: "FOL Foundations",
    importance: "HIGH",
    definition:
      "FOL objects and relations: constant symbols (objects), predicate symbols (relations), function symbols (map objects→objects), variables, and quantifiers ∀ (universal), ∃ (existential). Terms refer to objects; atomic sentences are predicates applied to terms.",
    coreIdea: "Terms name objects; predicates make sentences; quantifiers talk about whole collections.",
    visual: {
      type: "vtable",
      data: {
        headers: ["Element", "Example", "Refers to / means"],
        rows: [
          ["Constant", "John, A₁, 2", "A specific object"],
          ["Variable", "x, y", "Ranging over objects"],
          ["Predicate", "Brother(John, Mike)", "A relation among objects → sentence"],
          ["Function", "Father(John)", "An object (term), NOT a sentence"],
          ["Atomic sentence", "Likes(x, IceCream)", "Predicate(term, …)"],
          ["Complex sentence", "∀x Likes(x, IC) ⇒ ¬Likes(x, Broccoli)", "Connectives + quantifiers"],
        ],
        note: "Function symbols build TERMS (objects); predicates build SENTENCES (truth-valued).",
      },
    },
    keyPoints: [
      "Quantifier duality: ¬∀x P ≡ ∃x ¬P and ¬∃x P ≡ ∀x ¬P.",
      "∀x ∃y vs ∃y ∀x: order matters — 'everyone has a mother' vs 'one mother of all'.",
      "Brother(John) is a term (function); BrotherOf(John) as predicate would be a sentence.",
    ],
    examPoints: [
      "Translate English to FOL: 'Everyone loves someone' → ∀x ∃y Loves(x, y).",
      "'Everyone is loved by John' → ∀x Loves(John, x) — quantifier scope is the trap.",
      "State the two quantifier duality laws — short-mark certainty.",
    ],
    memoryTrigger: "Function → noun (object). Predicate → sentence. ∀ = and over everything; ∃ = or over everything.",
    keywords: ["constant", "predicate", "function symbol", "universal", "existential"],
  },
  {
    id: "fol-semantics",
    title: "FOL Semantics & Models",
    unit: "III",
    category: "FOL Foundations",
    importance: "MEDIUM",
    definition:
      "A model of FOL is a non-empty domain plus an interpretation mapping constants→objects, functions→functions on the domain, predicates→relations. Sentences are true/false relative to a model and an interpretation.",
    coreIdea: "No more truth tables — a single model can hide infinitely many objects; truth is defined recursively over the interpretation.",
    visual: {
      type: "tableau",
      data: {
        note: "Quantifier reduction over the domain: ∀ = true if every element satisfies P; ∃ = true if at least one does.",
        mode: "quantifiers",
      },
    },
    keyPoints: [
      "Truth of ∀x P(x): P must hold for every object in the domain.",
      "Truth of ∃x P(x): P holds for at least one object.",
      "FOL entailment KB ⊨ α defined exactly as in PL: α true in all models of KB.",
      "Models can be infinite → entailment is semi-decidable (no termination guarantee).",
    ],
    examPoints: [
      "Define a model for FOL precisely (domain + interpretation).",
      "Why is FOL entailment only semi-decidable? Infinite domains — no truth table.",
    ],
    memoryTrigger: "PL truth-tables blow up to interpretations over a domain — same ⊨, bigger world.",
    keywords: ["interpretation", "domain", "entailment", "semi-decidable"],
  },
  {
    id: "fol-vs-pl",
    title: "Propositional vs FOL & Knowledge Engineering",
    unit: "III",
    category: "FOL Foundations",
    importance: "MEDIUM",
    definition:
      "PL has only whole-proposition symbols (truth-table semantics); FOL adds objects, relations and quantifiers (interpretation semantics). Knowledge engineering is the craft of encoding a domain into a KB.",
    coreIdea: "PL = statements are atoms. FOL = statements have internal structure worth exploiting.",
    visual: {
      type: "comparison",
      data: {
        note: "The exam contrast table.",
        headers: ["Aspect", "Propositional", "First-Order"],
        rows: [
          ["Symbols", "Propositions (P, Q)", "Objects, predicates, functions"],
          ["Quantifiers", "None", "∀, ∃"],
          ["Semantics", "Truth table", "Domain + interpretation"],
          ["Expressiveness", "Weak (explosive)", "Rich, compact"],
          ["Inference", "Resolution, TT", "Unification + lifted resolution"],
          ["Decidability", "Decidable", "Semi-decidable"],
        ],
      },
    },
    keyPoints: [
      "FOL expresses 'every student passed' in one sentence; PL needs one per student.",
      "Knowledge engineering process: identify task → assemble knowledge → decide vocabulary → encode → debug.",
      "The Kingsley/kinship domain and electronic circuits are the standard examples.",
    ],
    examPoints: [
      "Give the PL↔FOL contrast table — repeat exam question.",
      "List the knowledge-engineering steps in order.",
    ],
    memoryTrigger: "PL counts worlds; FOL describes worlds.",
    keywords: ["expressiveness", "knowledge engineering", "quantification"],
  },
];