import type { AiCheatTopic } from "./types";

// UNIT-II · Constraint Satisfaction
export const unit2bTopics: AiCheatTopic[] = [
  {
    id: "csp",
    title: "Constraint Satisfaction Problems (CSP)",
    unit: "II",
    category: "CSP",
    importance: "HIGH",
    definition:
      "A CSP is defined by a set of variables Xᵢ, each with a domain Dᵢ of values, and a set of constraints Cⱼ specifying allowable combinations. A state is an assignment; a solution assigns every variable satisfying all constraints.",
    coreIdea: "Search where the STATE is the star: variables + domains + constraints, not a graph of states.",
    visual: {
      type: "csp",
      data: {
        note: "Australia map-colouring: tap variables, run backtracking to watch domains shrink.",
      },
    },
    keyPoints: [
      "Constraint types: unary (one var), binary (pairs — constraint graph), higher-order.",
      "Solution = complete + consistent assignment.",
      "Commute: CSP solvers exploit structure generic search can't.",
    ],
    differences: [
      { feature: "Standard search", valA: "Path to goal matters", valB: "States are black boxes" },
      { feature: "CSP", valA: "Only final assignment matters", valB: "Order mostly irrelevant" },
      { feature: "Advantage", valA: "Big domains pruned early", valB: "Structure = leverage" },
    ],
    examPoints: [
      "Formulate map colouring / Sudoku / cryptarithmetic as CSP (variables, domains, constraints).",
      "Constraint graph: nodes = variables, arcs = constraints.",
    ],
    memoryTrigger: "CSP = variables × domains × constraints. Solve the assignment, forget the path.",
    keywords: ["variables", "domains", "constraints", "constraint graph"],
  },
  {
    id: "csp-backtracking",
    title: "CSP Backtracking & Propagation",
    unit: "II",
    category: "CSP",
    importance: "HIGH",
    definition:
      "Depth-first assignment with backtrack-on-inconsistency, made efficient by MRV (fewest remaining values), degree heuristic, LCV, forward checking and arc consistency (AC-3).",
    coreIdea: "Assign, prune, fail fast. Which variable? MRV. Which value? LCV. Prune with forward checking + AC-3.",
    formula: {
      expression: "AC-3: prune Xᵢ values with no supported Xⱼ value (arc Xᵢ→Xⱼ)",
      symbols: { MRV: "minimum remaining values", LCV: "least constraining value" },
      examNote: "AC-3 complexity O(cd³) for c constraints, domain size d.",
    },
    visual: {
      type: "csp",
      data: { note: "Watch MRV pick the next variable and forward checking slash domains." },
    },
    steps: [
      "Select the next unassigned variable (MRV; ties → degree heuristic).",
      "Try values in LCV order.",
      "Forward check: remove inconsistent values from neighbours' domains.",
      "If any domain empties → backtrack immediately; optionally run AC-3.",
    ],
    keyPoints: [
      "Backtracking = DFS + incremental consistency checks.",
      "MRV: fail fast on constrained variables; degree: break MRV ties.",
      "LCV: keep options open for other variables.",
      "Forward checking propagates one step; AC-3 propagates transitively.",
    ],
    differences: [
      { feature: "Forward checking", valA: "Prunes neighbours of the assigned var", valB: "One-step lookahead" },
      { feature: "Arc consistency", valA: "Every arc kept consistent", valB: "Stronger, transitive" },
      { feature: "MRV", valA: "Chooses variable", valB: "Fails early" },
      { feature: "LCV", valA: "Chooses value order", valB: "Preserves others' options" },
    ],
    examPoints: [
      "Trace backtracking with MRV + forward checking on map colouring — the classic numerical.",
      "AC-3: queue of arcs; re-enqueue neighbours of any variable whose domain shrank.",
      "Min-conflicts = local search for CSP; repairs conflicts, good for n-queens.",
    ],
    memoryTrigger: "MRV picks who, LCV picks what, FC/AC-3 prune the rest. Fail fast, backtrack cheap.",
    keywords: ["MRV", "LCV", "forward checking", "AC-3", "min-conflicts"],
  },
  {
    id: "csp-local-structure",
    title: "Local Structure & Local Search for CSP",
    unit: "II",
    category: "CSP",
    importance: "MEDIUM",
    definition:
      "Constraint-graph shape determines solver difficulty: independent subproblems split; a tree-structured CSP is solvable in O(nd²) by topological arc consistency; cutset conditioning converts loops into trees.",
    coreIdea: "Structure is leverage: trees are easy, loops are hard, cutsets bridge the two.",
    formula: {
      expression: "Tree CSP: O(n·d²) · Cutset: O(d^c · n·d²) for cutset size c",
      symbols: { n: "variables", d: "domain size", c: "cutset size" },
      examNote: "Cycle-cutset conditioning: assign cutset, remaining graph is a tree.",
    },
    keyPoints: [
      "Independent subproblems: divide and conquer — decomposable constraints.",
      "Tree-structured CSP: topological order + backward consistency pass.",
      "Cutset conditioning: enumerate assignments of the cycle cutset, solve the tree.",
      "Min-conflicts local search: pick a conflicted variable, choose the value minimising conflicts.",
    ],
    examPoints: [
      "State the O(nd²) tree-CSP result and the cutset decomposition formula.",
      "Min-conflicts solves million-queens-scale problems — why? Near-solution states are dense.",
    ],
    memoryTrigger: "Tree = easy (nd²). Loops? Cut a few variables (cutset) and it's a tree again.",
    keywords: ["tree-structured CSP", "cutset conditioning", "min-conflicts", "topological order"],
  },
];