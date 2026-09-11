import type { AiCheatTopic } from "./types";

export const unit5Topics: AiCheatTopic[] = [
  {
    id: "acting-under-uncertainty",
    unit: "V",
    title: "Acting Under Uncertainty",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "Agents act under uncertainty due to partial observability, non-determinism, laziness (too many rules to specify), and ignorance (missing domain knowledge).",
    coreIdea: "Probabilistic reasoning replaces strict true/false logic with degrees of belief ranging from 0 to 1.",
    keyPoints: [
      "Logical rules fail in real-world domains due to qualification & ramification problems.",
      "Probability provides a summaries of ignorance, combining available evidence.",
      "Decision Theory = Probability Theory + Utility Theory (Rational agents maximize expected utility).",
    ],
    examPoints: [
      "State the 3 main causes of uncertainty in AI systems (partial observability, non-determinism, ignorance).",
      "Explain Maximum Expected Utility (MEU) principle.",
    ],
    memoryTrigger: "Uncertainty = beliefs under evidence. Probability replaces fragile logical rules.",
    keywords: ["acting under uncertainty", "degree of belief", "decision theory", "utility"],
  },
  {
    id: "basic-probability-notation",
    unit: "V",
    title: "Basic Probability Notation & Axioms",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "Mathematical foundation of probability describing prior (unconditional) probability P(A) and posterior (conditional) probability P(A|B) governed by Kolmogorov's Axioms.",
    coreIdea: "Conditional P(A|B) = P(A ∧ B) / P(B). Axioms: P ∈ [0,1], P(True)=1, P(A ∨ B) = P(A)+P(B)-P(A ∧ B).",
    formula: {
      expression: "P(A | B) = P(A ∧ B) / P(B)   •   P(A ∨ B) = P(A) + P(B) - P(A ∧ B)",
      symbols: { "P(A|B)": "conditional probability of A given B", "P(A ∧ B)": "joint probability of A and B" },
      examNote: "Kolmogorov Axioms guarantee consistency across belief updates.",
    },
    examPoints: [
      "State Kolmogorov's 3 Axioms of Probability — classic 5-marker.",
      "Derive Product Rule P(A ∧ B) = P(A|B)P(B) from conditional probability definition.",
    ],
    memoryTrigger: "Conditional P(A|B) = joint / evidence. Sum of mutually exclusive events = 1.",
    keywords: ["probability axioms", "Kolmogorov", "conditional probability", "product rule"],
  },

  {
    id: "full-joint-distributions",
    unit: "V",
    title: "Full Joint Probability Distributions",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "An exhaustive probability table specifying the probability of every possible combination of atomic events across all random variables in the domain.",
    coreIdea: "Full Joint Distribution allows answering any probabilistic query via Marginalization (Summing Out).",
    formula: {
      expression: "P(Y) = ∑_z P(Y, Z = z)",
      symbols: { Y: "query variable", Z: "unobserved (hidden) variables summed out" },
      examNote: "Full joint table size for n boolean variables is 2^n (exponential space explosion).",
    },
    keyPoints: [
      "Marginalization: P(Y) = ∑_z P(Y, z) sums out unwanted variables.",
      "Conditioning: P(Y|e) = P(Y, e) / P(e) = α P(Y, e).",
      "Limitations: exponential 2^n entries makes full joint tables computationally intractable for large n.",
    ],
    examPoints: [
      "Explain Marginalization (Summing Out) and Conditioning with a 3-variable probability table.",
      "Why does Full Joint Distribution suffer from the curse of dimensionality?",
    ],
    memoryTrigger: "Full Joint Table = 2^n entries. Marginalization = sum out hidden variables Z.",
    keywords: ["full joint distribution", "marginalization", "summing out", "conditioning"],
  },
  {
    id: "independence",
    unit: "V",
    title: "Independence & Conditional Independence",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "Independence simplifies joint distributions: Absolute Independence P(A, B) = P(A)P(B); Conditional Independence P(A, B | C) = P(A|C) P(B|C).",
    coreIdea: "Conditional Independence P(A|B, C) = P(A|C) decomposes complex joint tables into smaller local tables.",
    formula: {
      expression: "Absolute: P(A, B) = P(A)P(B)   •   Conditional: P(A, B | C) = P(A|C) P(B|C)",
      symbols: { "P(A,B|C)": "A and B are conditionally independent given C" },
      examNote: "Conditional independence is the core principle enabling scalable Bayesian Networks.",
    },
    examPoints: [
      "Differentiate Absolute Independence vs Conditional Independence.",
      "Show how conditional independence reduces 2^n joint entries to linear/polynomial scale.",
    ],
    memoryTrigger: "Independent = P(A,B) = P(A)P(B). Conditional = P(A|B,C) = P(A|C).",
    keywords: ["independence", "conditional independence", "factorization", "joint decomposition"],
  },
  {
    id: "bayes-rule",
    unit: "V",
    title: "Bayes' Rule & Worked Numerical",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "Bayes' Rule calculates posterior probability P(Cause|Effect) from causal likelihood P(Effect|Cause) and prior probability P(Cause).",
    coreIdea: "P(H|E) = [P(E|H) · P(H)] / P(E). Turn causal likelihood into diagnostic posterior.",
    steps: [
      "1. Identify Priors: P(Meningitis) = 0.00005, P(StiffNeck) = 0.01.",
      "2. Identify Likelihood: P(StiffNeck | Meningitis) = 0.70.",
      "3. Substitute into Bayes' Rule: P(M|S) = (0.70 × 0.00005) / 0.01.",
      "4. Compute Posterior: P(M|S) = 0.000035 / 0.01 = 0.0035 (0.35%).",
    ],
    examPoints: [
      "State Bayes' Rule formula and compute medical diagnosis posterior — guaranteed 10-mark numerical.",
    ],
    memoryTrigger: "Bayes: Posterior = Likelihood × Prior / Evidence. P(M|S) = P(S|M)P(M)/P(S).",
    keywords: ["bayes rule", "likelihood", "prior", "posterior", "worked numerical"],
  },

  {
    id: "representing-knowledge-uncertain",
    unit: "V",
    title: "Representing Knowledge in Uncertain Domains",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "Structuring uncertain knowledge using network graphs that explicitly assert conditional independence relations to prevent exponential state space explosion.",
    coreIdea: "Network topology encodes conditional independence assertions among domain variables.",
    keyPoints: [
      "Causal chains: X → Y → Z.",
      "Common Cause: Y → X and Y → Z (X and Z independent given Y).",
      "Common Effect: X → Y and Z → Y (X and Z dependent given Y).",
    ],
    examPoints: [
      "Explain Causal Chains, Common Cause, and Common Effect d-separation structures.",
    ],
    memoryTrigger: "Causal chain (X→Y→Z), Common cause (Y→X,Y→Z), Common effect (X→Y←Z).",
    keywords: ["uncertain domain", "causal chain", "common cause", "common effect"],
  },
  {
    id: "bayesian-networks-semantics",
    unit: "V",
    title: "Bayesian Network Semantics & DAG Topology",
    category: "Bayesian Networks",
    importance: "HIGH",
    definition:
      "A Bayesian Network is a Directed Acyclic Graph (DAG) where nodes represent random variables, directed links represent direct influence, and each node has a Conditional Probability Table (CPT).",
    coreIdea: "Full joint distribution factorizes as product of local node CPTs: P(X₁…Xₙ) = ∏ P(Xᵢ | Parents(Xᵢ)).",
    formula: {
      expression: "P(X₁, …, Xₙ) = ∏_{i=1}^{n} P(X_i | Parents(X_i))",
      symbols: { "Parents(X_i)": "direct parent nodes in the DAG" },
      examNote: "Markov Blanket of node X consists of its parents, children, and children's other parents.",
    },
    keyPoints: [
      "Topological Semantics: each node is conditionally independent of non-descendants given its parents.",
      "CPT size: node with k boolean parents requires 2^k probability entries.",
    ],
    examPoints: [
      "Draw the classic Burglary-Earthquake Alarm 5-node Bayesian network and write its joint factorization.",
      "Define Markov Blanket and state why it d-separates a node from the rest of the network.",
    ],
    memoryTrigger: "DAG + CPT = Bayes Net. Joint P = Product P(node | parents).",
    keywords: ["bayesian network", "DAG", "CPT", "markov blanket", "factorization"],
  },
  {
    id: "efficient-conditional-distributions",
    unit: "V",
    title: "Efficient Representation of Conditional Distributions",
    category: "Bayesian Networks",
    importance: "MEDIUM",
    definition:
      "Compacting large CPT tables using canonical parameterized distributions such as Noisy-OR for boolean variables.",
    coreIdea: "Noisy-OR reduces CPT parameter complexity from O(2^k) to linear O(k) for k parents.",
    formula: {
      expression: "P(Y = false | X₁, …, X_k) = ∏_{i: X_i = true} q_i",
      symbols: { "q_i": "probability that parent X_i alone fails to cause Y" },
      examNote: "Noisy-OR assumes all causes are independent in their ability to trigger the effect.",
    },
    examPoints: [
      "Explain the Noisy-OR canonical distribution and its parameter savings.",
    ],
    memoryTrigger: "Noisy-OR = linear O(k) CPT entries instead of exponential O(2^k).",
    keywords: ["noisy OR", "canonical distribution", "CPT compression"],
  },
  {
    id: "approximate-inference-bbn",
    unit: "V",
    title: "Approximate Inference in Bayesian Networks",
    category: "Bayesian Networks",
    importance: "HIGH",
    definition:
      "Monte Carlo sampling algorithms for large Bayesian networks where exact inference is NP-hard: Direct Sampling, Rejection Sampling, Likelihood Weighting, and MCMC (Gibbs Sampling).",
    coreIdea: "Sample full network assignments using CPT probabilities → fraction of matching samples estimates P(Q|e).",
    differences: [
      { feature: "Rejection Sampling", valA: "Discards samples inconsistent with evidence e", valB: "Extremely slow if evidence e is rare" },
      { feature: "Likelihood Weighting", valA: "Fixes evidence variables, weights each sample by P(e | parents)", valB: "Keeps all samples, highly efficient" },
    ],
    steps: [
      "Topological Order Sampling: generate values for root nodes, then sample children given parents.",
      "Fix evidence variables to observed values.",
      "Weight each sample by w = ∏ P(e_j | parents(e_j)).",
      "Estimate P(Q|e) as normalized sum of weights of matching samples.",
    ],
    examPoints: [
      "Contrast Rejection Sampling vs Likelihood Weighting — classic 5-mark comparison.",
      "Explain Gibbs Sampling (MCMC) state transitions.",
    ],
    memoryTrigger: "Rejection throws bad samples away; Likelihood Weighting keeps all samples with weights.",
    keywords: ["sampling", "likelihood weighting", "rejection sampling", "MCMC", "Gibbs sampling"],
  },
  {
    id: "relational-fol-probability",
    unit: "V",
    title: "Relational & First-Order Probability",
    category: "Uncertainty & Probability",
    importance: "LOW",
    definition:
      "Combining First-Order Logic (objects, relations, quantifiers) with Probabilistic Models into Relational Probabilistic Models (RPMs) and Markov Logic Networks (MLNs).",
    coreIdea: "First-Order Logic handles multi-object relations; Probability handles uncertainty.",
    keyPoints: [
      "Propositional Bayesian Networks cannot scale when object counts vary or are unknown.",
      "Relational probability models define parameterized random variables over domain objects (e.g., Loves(x, y)).",
      "Markov Logic Networks assign weights to First-Order Logic formulas.",
    ],
    examPoints: [
      "Explain why propositional Bayes Nets fail for variable object counts and how FOL probability resolves it.",
    ],
    memoryTrigger: "FOL expressiveness + Bayes net uncertainty = Relational Probabilistic Models.",
    keywords: ["relational probability", "Markov logic network", "RPM"],
  },
  {
    id: "dempster-shafer-theory",
    unit: "V",
    title: "Dempster-Shafer Theory & Worked Numerical",
    category: "Uncertainty & Probability",
    importance: "HIGH",
    definition:
      "A mathematical framework for reasoning with uncertainty that distinguishes between uncertainty and ignorance using Basic Probability Assignment (mass function m), Belief (Bel), and Plausibility (Pl).",
    coreIdea: "Belief Bel(A) = lower bound (proven support); Plausibility Pl(A) = upper bound (unrefuted support).",
    steps: [
      "1. Mass Assignment: m({Flu}) = 0.6, m({Cold}) = 0.2, m({Flu, Cold}) = 0.2.",
      "2. Compute Belief Bel({Flu}) = sum of mass of all subsets of {Flu} = 0.6.",
      "3. Compute Plausibility Pl({Flu}) = sum of mass of sets intersecting {Flu} = 0.6 + 0.2 = 0.8.",
      "4. Form Belief Interval [Bel, Pl] = [0.6, 0.8]. Gap (0.2) represents ignorance.",
    ],
    examPoints: [
      "Define Mass function m, Belief Bel, and Plausibility Pl in Dempster-Shafer theory — classic 10-marker.",
      "Execute Dempster's Rule of Combination for two independent mass assignments m₁ and m₂.",
    ],
    memoryTrigger: "D-S: Mass m(A), Bel(A) = lower bound, Pl(A) = upper bound. Ignorance = [Bel, Pl] gap.",
    keywords: ["dempster shafer", "mass function", "belief", "plausibility", "dempsters rule"],
  },
  {
    id: "exact-inference-variable-elimination",
    unit: "V",
    title: "Exact Inference: Variable Elimination",
    category: "Bayesian Networks",
    importance: "HIGH",
    definition:
      "Dynamic programming algorithm for exact BBN inference that computes marginal probabilities by summing out unobserved hidden variables one by one.",
    coreIdea: "Push summations inside factor products: O(n · 2^w) where w is tree-width.",
    steps: [
      "Form initial factors from CPTs.",
      "Order hidden variables Y₁, …, Y_k for elimination.",
      "Multiply factors containing Y_i and sum out Y_i.",
      "Normalize resulting factor vector for query variable X.",
    ],
    examPoints: [
      "Execute Variable Elimination on a 4-node network.",
    ],
    memoryTrigger: "Push sums inside factors to eliminate hidden variables.",
    keywords: ["variable elimination", "exact inference", "factors"],
  }
];
