import type { AiCheatTopic } from "./types";

// UNIT-III · Unification, Lifting, FOL Chaining & Resolution
export const unit3bTopics: AiCheatTopic[] = [
  {
    id: "unification",
    title: "Unification & Substitution",
    unit: "III",
    category: "FOL Inference",
    importance: "HIGH",
    definition:
      "Unification finds a substitution θ making two logical expressions identical: UNIFY(p, q) = θ where pθ = qθ. Standardising apart renames variables so the two expressions share none.",
    coreIdea: "Lift Modus Ponens to FOL: find the θ that lines two expressions up, then reason as in propositional.",
    formula: {
      expression: "UNIFY(Knows(John, x), Knows(John, Jane)) = {x/Jane}",
      symbols: { θ: "substitution — binding variables to terms", "pθ": "apply θ to p" },
      examNote: "Most General Unifier (MGU): the least-committal θ; unique up to renaming.",
    },
    visual: {
      type: "tableau",
      data: { note: "Tap pairs to unify and see the MGU computed step by step.", mode: "unify" },
    },
    steps: [
      "Standardise apart: rename variables so the two sentences share none.",
      "Walk the expressions left to right; collect disagreements.",
      "If one side is a variable, bind it: θ ∪ {var/term}.",
      "Fail if a constant clashes or a variable is bound to a term containing itself.",
    ],
    keyPoints: [
      "Knows(John, x) unifies with Knows(John, Jane) via {x/Jane}.",
      "Knows(John, x) vs Knows(y, Mother(y)) → {x/Mother(y), y/John} (after standardising apart).",
      "Unification of predicates (relations) only — not of sentences with ⇔, ⇒ inside.",
    ],
    differences: [
      { feature: "Substitution", valA: "{x/Jane} binding set", valB: "Applied to terms/sentences" },
      { feature: "MGU", valA: "Most general", valB: "Composable; unique up to renaming" },
      { feature: "Standardise apart", valA: "Rename first", valB: "Prevents false variable clashes" },
    ],
    examPoints: [
      "Compute the MGU of two given literals — guaranteed numerical.",
      "Why standardise apart? Shared variables would falsely bind.",
      "Unify then apply: show pθ = qθ explicitly.",
    ],
    memoryTrigger: "θ is the translator that makes two sentences say the same thing.",
    keywords: ["unification", "MGU", "substitution", "standardise apart"],
  },
  {
    id: "fol-forward-chaining",
    title: "Forward Chaining in FOL (Generalized Modus Ponens)",
    unit: "III",
    category: "FOL Inference",
    importance: "HIGH",
    definition:
      "Generalised Modus Ponens: from p₁′, …, pₙ′ and p₁∧…∧pₙ ⇒ q with pᵢ′θ = pᵢ, infer qθ. First-order definite clauses + GMP give a lifted, data-driven forward chaining algorithm.",
    coreIdea: "Unify known facts against premises, then conclude the instantiated head — repeat to fixpoint.",
    formula: {
      expression: "GMP: p₁′,…,pₙ′ + (p₁∧…∧pₙ ⇒ q) ⟹ qθ  where pᵢ′θ = pᵢ",
      symbols: { "definite clause": "exactly one positive literal", "GMP": "lifted Modus Ponens" },
      examNote: "FC with GMP is sound & complete for Datalog (functionless) definite clauses.",
    },
    steps: [
      "Standardise apart each rule's variables for every use.",
      "Match (unify) rule premises against known facts.",
      "Add the instantiated conclusion qθ if new.",
      "Repeat until no new facts (fixpoint) or the query appears.",
    ],
    keyPoints: [
      "Incremental: index facts so each new fact only checks rules using it.",
      "Agenda + counters: fire a rule when all premises are satisfied.",
      "Datalog: functionless FOL — decidable, terminating FC.",
    ],
    examPoints: [
      "Given definite clauses + facts, list all derived facts in order — the classic trace.",
      "State GMP formally and show the unification at each step.",
    ],
    memoryTrigger: "GMP = Modus Ponens with a unifier strapped on.",
    keywords: ["GMP", "definite clause", "forward chaining", "Datalog"],
  },
  {
    id: "fol-backward-chaining",
    title: "Backward Chaining in FOL",
    unit: "III",
    category: "FOL Inference",
    importance: "MEDIUM",
    definition:
      "Goal-driven FOL inference: unify the goal with rule conclusions, then recursively prove the (substituted) premises. Used by logic programming languages like Prolog.",
    coreIdea: "Start from what you want to prove; walk backwards through unifiers until only facts remain.",
    visual: {
      type: "flow",
      data: {
        title: "Backward Chaining (Prolog-style) Flow",
        steps: [
          "Goal Q — unify against all rule heads and facts",
          "Rule (P₁ ∧ P₂) ⇒ Q matched with θ → subgoals P₁θ, P₂θ",
          "Recurse on subgoals (AND depth-first)",
          "Facts terminate a branch; all branches close ⇒ proof with combined θ",
        ],
        note: "Prolog: depth-first + left-to-right; needs occurs check & cycle guards.",
      },
    },
    steps: [
      "Unify the goal with a rule's conclusion to get θ.",
      "Replace the goal with the rule's premises θ (subgoals).",
      "Depth-first prove each subgoal; facts close branches.",
      "Compose substitutions along the proof — the answer binding.",
    ],
    keyPoints: [
      "AND-OR proof tree with unifiers on the edges.",
      "May loop on recursive rules — Prolog cuts / cycle detection needed.",
      "Cheaper than FC when there are many facts but one specific goal.",
    ],
    examPoints: [
      "Draw the BC proof tree with θ at each edge for a kinship query.",
      "Prolog's DFS can fail (infinite loop) where a solution exists — know why.",
    ],
    memoryTrigger: "FC asks 'what follows?'; FOL-BC asks 'can I prove it — and with what bindings?'",
    keywords: ["backward chaining", "Prolog", "subgoal", "proof tree"],
  },
  {
    id: "fol-resolution",
    title: "Resolution in FOL (Lifting)",
    unit: "III",
    category: "FOL Inference",
    importance: "HIGH",
    definition:
      "Lifted resolution: propositional resolution with unification. From clauses L∨α and ¬L′∨β with Lθ = L′θ (complementary under θ), infer (α∨β)θ. Sound and refutation-complete for FOL.",
    coreIdea: "Lifting = one FOL proof stands for infinitely many propositional proofs — unifier supplies the instance.",
    formula: {
      expression: "(L ∨ α) ∧ (¬L′ ∨ β), UNIFY(L, L′) = θ  ⟹  (α ∨ β)θ",
      symbols: { L: "complementary literals under θ", lifting: "PL rule + unification = FOL rule" },
      examNote: "FOL resolution is semi-decidable: it will find a proof if one exists, but may not halt if none does.",
    },
    steps: [
      "Eliminate ⇔ and ⇒; move ¬ inward; standardise variables apart.",
      "Skolemise: replace ∃-variables with Skolem functions/constants; drop ∀.",
      "Distribute ∨ over ∧ to reach CNF (clauses).",
      "Resolve with unification until the empty clause □ appears (refutation) or no new clauses.",
    ],
    keyPoints: [
      "Skolemisation: ∀x ∃y P(x,y) → ∀x P(x, F(x)) — y becomes a function of x.",
      "CNF conversion is identical to PL plus skolemisation.",
      "Factoring: remove duplicate literals within one clause after unifying.",
      "Answer extraction: keep the negated goal's variables to read out bindings.",
    ],
    differences: [
      { feature: "PL resolution", valA: "Literal match by identity", valB: "Decidable" },
      { feature: "FOL resolution", valA: "Match via unifier θ", valB: "Semi-decidable" },
      { feature: "Skolem constant", valA: "∃x at top level", valB: "New constant c" },
      { feature: "Skolem function", valA: "∃x under ∀y", valB: "Function F(y)" },
    ],
    examPoints: [
      "Convert a quantified FOL sentence to CNF (skolemise!) — the standard multi-step question.",
      "Carry out one lifted-resolution step showing UNIFY's θ.",
      "State semi-decidability and contrast with PL's decidability.",
    ],
    memoryTrigger: "Lift it: PL rule + UNIFY = FOL rule. Skolemise ∃, standardise, resolve.",
    keywords: ["lifting", "skolemisation", "CNF", "unification", "refutation-complete"],
  },
];