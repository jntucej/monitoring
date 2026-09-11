import type { AiCheatTopic } from "./types";

export const unit4Topics: AiCheatTopic[] = [
  {
    id: "ontological-engineering",
    unit: "IV",
    title: "Ontological Engineering",
    category: "Knowledge Representation",
    importance: "HIGH",
    definition:
      "The process of constructing upper-level ontologies that represent general concepts—such as Actions, Time, Physical Objects, Beliefs, and Measurements—that apply across multiple specific domains.",
    coreIdea: "Upper-level ontology = general taxonomy (Objects, Time, Actions) reusable across all AI domain models.",
    keyPoints: [
      "Upper Ontology: organizes high-level categories (e.g. Particulars vs Abstract Objects).",
      "Domain Ontology: specializes upper categories for specific tasks (e.g. Medical diagnosis, E-commerce).",
      "Solves the Knowledge Acquisition bottleneck by enabling cross-domain interoperability.",
    ],
    examPoints: [
      "Define Ontological Engineering and draw a general Upper-Ontology Hierarchy.",
      "Explain the distinction between General Ontologies vs Domain-Specific Ontologies.",
    ],
    memoryTrigger: "Ontological Engineering = blueprint for general concepts (Objects, Time, Events).",
    keywords: ["ontological engineering", "upper ontology", "categories", "taxonomy"],
  },
  {
    id: "categories-and-objects",
    unit: "IV",
    title: "Categories and Objects",
    category: "Knowledge Representation",
    importance: "HIGH",
    definition:
      "Category representation organizes individual objects into sets/classes using relations such as Subclass (Inheritance), Disjointness, Exhaustive Decomposition, and Partitioning.",
    coreIdea: "Subclass (A ⊂ B), Disjoint (A ∩ B = ∅), Partition = Disjoint + Exhaustive Decomposition.",
    formula: {
      expression: "Partition(S, C₁, C₂) ≡ Disjoint(C₁, C₂) ∧ ExhaustiveDecomposition(S, C₁, C₂)",
      symbols: { "Subclass(C₁, C₂)": "C₁ is a subset of C₂", "Disjoint(C₁, C₂)": "no object belongs to both C₁ and C₂" },
      examNote: "A Partition divides category S into mutually exclusive and exhaustive sub-categories.",
    },
    keyPoints: [
      "Subclass relation: MemberOf(x, Apple) ⟹ MemberOf(x, Fruit).",
      "Disjoint Categories: Disjoint({Apples, Oranges}).",
      "Exhaustive Decomposition: Subclasses cover every element of the super-category.",
      "Measurements & Physical Quantities: represented as functions (e.g. Length(x) = Inches(10)).",
    ],
    examPoints: [
      "Define Subclass, Disjointness, Exhaustive Decomposition, and Partitioning in First-Order Logic.",
    ],
    memoryTrigger: "Subclass = Subset; Disjoint = no overlap; Partition = disjoint + covers all.",
    keywords: ["categories", "subclass", "disjoint", "partition", "measurements"],
  },
  {
    id: "events-and-processes",
    unit: "IV",
    title: "Events, Time and Event Calculus",
    category: "Knowledge Representation",
    importance: "HIGH",
    definition:
      "Representing temporal change where fluents (state variables) change values over time intervals via events using Event Calculus.",
    coreIdea: "Fluents (states) hold at time t. Events initiate or terminate fluents at specific time points.",
    formula: {
      expression: "HoldsAt(f, t) ⇐ InitiatedAt(f, t₁) ∧ (t₁ < t) ∧ ¬ Clipped(f, t₁, t)",
      symbols: { "HoldsAt(f, t)": "fluent f is true at time t", "InitiatedAt(f, t₁)": "event at t₁ makes f true", "Clipped(f, t₁, t)": "f was terminated between t₁ and t" },
      examNote: "Event Calculus avoids the Frame Problem by stating what changes rather than what stays constant.",
    },
    keyPoints: [
      "Fluents: time-varying relations (e.g. At(Robot, Room1, t)).",
      "Intervals: time periods bounded by start and end points.",
      "Processes vs Events: processes are continuous activity; events are discrete state transitions.",
    ],
    examPoints: [
      "Write down the core axiom of Event Calculus (HoldsAt equation).",
      "Contrast Fluents vs Events vs Processes.",
    ],
    memoryTrigger: "Fluent = dynamic state; Event = initiates/terminates fluent; Clipped = interrupted.",
    keywords: ["event calculus", "fluents", "time intervals", "HoldsAt", "frame problem"],
  },

  {
    id: "mental-events-objects",
    unit: "IV",
    title: "Mental Events and Mental Objects",
    category: "Knowledge Representation",
    importance: "MEDIUM",
    definition:
      "Representing knowledge about agents' mental states (Beliefs, Desires, Intentions) using Modal Logic and Propositional Attitudes.",
    coreIdea: "Believes(Agent, Proposition) represents internal agent mental state without requiring proposition truth.",
    keyPoints: [
      "Propositional Attitudes: relations between agents and propositions (e.g., Believes, Knows, Wants).",
      "Referential Opacity: substituting co-referential terms inside mental attitudes may change truth value.",
      "Syntactic Theory of Mental Objects: represents propositions as string sentences inside an agent's knowledge base.",
    ],
    examPoints: [
      "Explain Referential Opacity with the classic Superman / Clark Kent example.",
      "Contrast Modal Logic B(x, P) vs Standard FOL.",
    ],
    memoryTrigger: "Mental Objects = Beliefs/Wants. Referential Opacity: Lois knows Superman flies, but not Clark Kent.",
    keywords: ["mental objects", "propositional attitudes", "referential opacity", "modal logic"],
  },
  {
    id: "reasoning-systems-categories",
    unit: "IV",
    title: "Reasoning Systems for Categories",
    category: "Knowledge Representation",
    importance: "HIGH",
    definition:
      "Specialized inference engines designed for category hierarchies: Semantic Networks (graph-based inheritance) and Description Logics (formal concept definitions).",
    coreIdea: "Semantic Networks = visual graph inheritance. Description Logics = formal subsumption taxonomy logic.",
    differences: [
      { feature: "Semantic Networks", valA: "Graphical nodes (categories) & edges (IS-A, Has-A)", valB: "Intuitive, but lacks formal semantics" },
      { feature: "Description Logics", valA: "Formal syntax with Concepts, Roles, Individuals", valB: "Decidable subset of FOL for taxonomy classification" },
    ],
    steps: [
      "Define Primitive Concepts and Roles (relations).",
      "Construct Complex Concepts using conjunction, disjunction, and quantifiers (∀, ∃).",
      "Subsumption Reasoning: test if Concept A is a sub-concept of Concept B.",
      "Classification: place a new concept in its correct position in the TBox taxonomy.",
    ],
    examPoints: [
      "Differentiate Semantic Networks vs Description Logics — 5-marker.",
      "Explain TBox (Terminology) vs ABox (Assertions) in Description Logics.",
    ],
    memoryTrigger: "Semantic Net = graph nodes/edges; Description Logic = TBox (concepts) + ABox (facts).",
    keywords: ["semantic networks", "description logic", "subsumption", "TBox", "ABox"],
  },
  {
    id: "default-information",
    unit: "IV",
    title: "Default Information & Non-Monotonic Reasoning",
    category: "Knowledge Representation",
    importance: "HIGH",
    definition:
      "Reasoning under incomplete knowledge using default assumptions that can be retracted when new counter-evidence arrives (Non-Monotonic Logic).",
    coreIdea: "Standard Logic is Monotonic (adding facts never invalidates proofs). Non-Monotonic Logic retracts defaults when retracted.",
    formula: {
      expression: "Default Rule: α : β / γ   (If α is known and β is consistent, infer γ)",
      symbols: { α: "prerequisite", β: "justification", γ: "consequent" },
      examNote: "Classic example: Bird(x) : Flies(x) / Flies(x). Exceptions (Penguin) override the default.",
    },
    keyPoints: [
      "Closed-World Assumption (CWA): assumes any unstated atomic sentence is false.",
      "Circumscription: minimizes predicates so only specified objects satisfy them.",
      "Default Logic: explicitly adds default rules with justifications.",
    ],
    examPoints: [
      "Distinguish Monotonic vs Non-Monotonic Reasoning.",
      "Explain the Closed-World Assumption (CWA) and Default Rules syntax.",
    ],
    memoryTrigger: "Monotonic = append-only facts; Non-Monotonic = default assumptions can be cancelled (Penguins don't fly).",
    keywords: ["default information", "non-monotonic logic", "closed world assumption", "circumscription"],
  },

  {
    id: "exact-inference",
    unit: "IV",
    title: "Exact Inference in Bayesian Networks",
    category: "Uncertainty",
    importance: "MEDIUM",
    definition:
      "Computes posterior P(Query | Evidence) by summing over hidden (unobserved) variables. Enumeration evaluates the joint sum; Variable Elimination caches intermediate factors.",
    coreIdea: "Variable Elimination pushes summations inward over CPT factors to avoid redundant math.",
    formula: {
      expression: "P(X | e) = α ∑_y P(X, e, y)",
      symbols: { X: "query variable", e: "observed evidence", y: "hidden variables" },
      examNote: "Exact inference in general Bayesian networks is NP-hard (#P-complete).",
    },
    steps: [
      "Write query as P(X|e) = α ∑_y ∏ᵢ P(xᵢ | parents(xᵢ)).",
      "Order hidden variables y₁, …, yₖ for elimination.",
      "Group factors containing y_i and sum it out to produce a new factor.",
      "Repeat until only query variable remains, then normalize.",
    ],    examPoints: [
      "Execute Variable Elimination on a 4-node network — typical numerical 10-marker.",
      "State why variable ordering matters for elimination factor size.",
    ],
    memoryTrigger: "Push sums inside factors! Tree-width controls exponent. Poly for polytrees.",
    keywords: ["variable elimination", "factor", "enumeration", "polytree"],
  },
  {
    id: "approximate-inference",
    unit: "IV",
    title: "Approximate Inference & Sampling",
    category: "Uncertainty",
    importance: "MEDIUM",
    definition:
      "When exact inference is intractable, Monte Carlo algorithms estimate probabilities by generating random samples: Direct Sampling, Rejection Sampling, Likelihood Weighting, and MCMC (Gibbs Sampling).",
    coreIdea: "Sample full assignments using CPT probabilities → ratio of matches approximates P(Q|e).",    keyPoints: [
      "Direct Sampling: top-down sampling following topological order.",
      "Rejection Sampling: discards samples inconsistent with evidence e (slow if e is rare).",
      "Likelihood Weighting: fixes evidence variables and weights each sample by P(evidence | parents).",
      "Gibbs Sampling (MCMC): random walk through state space, updating one variable at a time given its Markov Blanket.",
    ],
    examPoints: [
      "Contrast Rejection Sampling vs Likelihood Weighting — classic theory question.",
      "Explain why Likelihood Weighting avoids wasting samples.",
    ],
    memoryTrigger: "Rejection throws bad samples away; Likelihood Weighting keeps all samples with weights.",
    keywords: ["sampling", "MCMC", "Gibbs sampling", "likelihood weighting", "rejection sampling"],
  },
  {
    id: "first-order-probability",
    unit: "IV",
    title: "Relational & First-Order Probability",
    category: "Uncertainty",
    importance: "LOW",
    definition:
      "Combines First-Order Logic (objects, relations) with Probabilistic Models (Bayesian Networks) into Relational Probabilistic Models (RPMs) and Markov Logic Networks (MLNs).",
    coreIdea: "First-Order Logic handles complex multi-object domains; Probability handles uncertainty.",
    keyPoints: [
      "Propositional Bayesian networks fail when the number of objects is unknown or variable.",
      "Relational probability models use parameterized random variables (e.g. Loves(x, y)).",
      "Markov Logic Networks assign weights to First-Order Logic formulas.",
    ],
    examPoints: [
      "Explain why propositional Bayes nets struggle with variable object counts.",
    ],
    memoryTrigger: "FOL expressiveness + Bayes net uncertainty = Relational Probabilistic Models.",
    keywords: ["relational probability", "Markov logic network", "RPM"],
  },
];

