import type { StudyUnit } from "../../types";

export const AI_UNITS: Record<"I" | "II" | "III" | "IV" | "V", StudyUnit> = {
  I: {
    id: "ai-unit-1",
    unitNumber: "I",
    title: "Unit I — Introduction & Search",
    subtitle: "Intelligent Agents · Uninformed & Informed Search · Local Search",
    description:
      "Intelligent agents and environments, problem-solving agents, BFS, UCS, DFS, IDDFS, bidirectional search, greedy best-first, A*, heuristics, hill climbing, simulated annealing.",
    categories: [
      {
        name: "🎯 Core Syllabus Topics",
        topicIds: [
          "intelligent-agents",
          "problem-solving-agents",
          "search-problem",
          "bfs",
          "ucs",
          "dfs",
          "iddfs",
          "bidirectional",
          "search-comparison",
          "greedy",
          "astar",
          "heuristic-functions",
        ],
      },
      {
        name: "📚 Extended Topics",
        topicIds: ["hill-climbing", "simulated-annealing", "continuous-local"],
      },
    ],
  },
  II: {
    id: "ai-unit-2",
    unitNumber: "II",
    title: "Unit II — Adversarial Search & CSP",
    subtitle: "Minimax · Alpha-Beta · CSP · Supporting Propositional Logic",
    description:
      "Game playing, minimax, alpha-beta pruning, evaluation functions, real-time decisions, constraint satisfaction problems (CSP), arc consistency (AC-3), backtracking search.",
    categories: [
      {
        name: "🎯 Core Syllabus Topics",
        topicIds: [
          "games-minimax",
          "alpha-beta",
          "real-time-decisions",
          "csp",
          "csp-backtracking",
          "csp-local-structure",
        ],
      },
      {
        name: "📚 Supporting Topics",
        topicIds: [
          "knowledge-agents",
          "wumpus",
          "propositional-logic",
          "inference-rules",
          "resolution-pl",
          "horn-chaining",
          "model-checking",
        ],
      },
    ],
  },
  III: {
    id: "ai-unit-3",
    unitNumber: "III",
    title: "Unit III — First-Order Logic & Inference",
    subtitle: "FOL Foundations · Unification · Inference",
    description:
      "First-order logic, syntax & semantics, knowledge engineering, unification (MGU), generalized forward chaining, backward chaining, skolemisation, resolution.",
    categories: [
      {
        name: "🎯 Core Syllabus Topics",
        topicIds: [
          "fol-syntax",
          "fol-semantics",
          "fol-vs-pl",
          "unification",
          "fol-forward-chaining",
          "fol-backward-chaining",
          "fol-resolution",
        ],
      },
    ],
  },
  IV: {
    id: "ai-unit-4",
    unitNumber: "IV",
    title: "Unit IV — Knowledge Representation & Classical Planning",
    subtitle: "Ontological Engineering · Categories · Events · Classical Planning",
    description:
      "Ontological engineering, categories and objects, events, mental events and mental objects, reasoning systems for categories, default information, definition of classical planning, state-space planning, planning graphs.",
    categories: [
      {
        name: "🎯 Core Knowledge Representation",
        topicIds: [
          "ontological-engineering",
          "categories-and-objects",
          "events-and-processes",
          "mental-events-objects",
          "reasoning-systems-categories",
          "default-information",
        ],
      },
      {
        name: "🎯 Core Classical Planning",
        topicIds: [
          "classical-planning-definition",
          "state-space-planning",
          "planning-graphs",
          "planning-analysis",
        ],
      },
      {
        name: "📚 Supporting Planning Techniques",
        topicIds: [
          "strips-pddl",
          "goal-stack-planning",
          "partial-order-planning",
        ],
      },
    ],
  },
  V: {
    id: "ai-unit-5",
    unitNumber: "V",
    title: "Unit V — Uncertainty & Probabilistic Reasoning",
    subtitle: "Probability Notation · Bayes' Rule · Bayesian Networks · Dempster-Shafer",
    description:
      "Acting under uncertainty, basic probability notation, full joint distributions, independence, Bayes' rule, Bayesian network semantics, conditional distributions, approximate inference, Dempster-Shafer theory.",
    categories: [
      {
        name: "🎯 Core Uncertainty & Bayes",
        topicIds: [
          "acting-under-uncertainty",
          "basic-probability-notation",
          "full-joint-distributions",
          "independence",
          "bayes-rule",
          "representing-knowledge-uncertain",
          "bayesian-networks-semantics",
          "efficient-conditional-distributions",
          "approximate-inference-bbn",
          "relational-fol-probability",
          "dempster-shafer-theory",
        ],
      },
      {
        name: "📚 Supporting Inference Techniques",
        topicIds: [
          "exact-inference-variable-elimination",
        ],
      },
    ],
  },
};

