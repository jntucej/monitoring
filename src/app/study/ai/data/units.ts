import type { AiUnit } from "./types";

export const AI_UNITS: Record<"I" | "II" | "III", AiUnit> = {
  I: {
    id: "I",
    title: "Unit I — Agents & Problem Solving",
    subtitle: "Agents · Informed/Uninformed Search · Local Search",
    description:
      "Intelligent agents and environments, problem-solving agents, uninformed search (BFS, UCS, DFS, IDDFS, bidirectional), informed search (greedy, A*), heuristics, and local search (hill climbing, simulated annealing).",
    categories: [
      {
        name: "Agents & Problem Solving",
        topicIds: ["intelligent-agents", "problem-solving-agents", "search-problem"],
      },
      {
        name: "Uninformed Search",
        topicIds: ["bfs", "ucs", "dfs", "iddfs", "bidirectional", "search-comparison"],
      },
      {
        name: "Informed Search & Heuristics",
        topicIds: ["greedy", "astar", "heuristic-functions"],
      },
      {
        name: "Local Search",
        topicIds: ["hill-climbing", "simulated-annealing", "continuous-local"],
      },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Games, CSP & Propositional Logic",
    subtitle: "Minimax · Alpha-Beta · CSP · Logic & Inference",
    description:
      "Game playing with optimal decisions, alpha-beta pruning, imperfect real-time decisions, constraint satisfaction, knowledge-based agents, Wumpus world, propositional logic and inference, resolution, Horn clauses, forward/backward chaining, model checking.",
    categories: [
      {
        name: "Game Playing",
        topicIds: ["games-minimax", "alpha-beta", "real-time-decisions"],
      },
      {
        name: "Constraint Satisfaction",
        topicIds: ["csp", "csp-backtracking", "csp-local-structure"],
      },
      {
        name: "Logic & Inference",
        topicIds: ["knowledge-agents", "wumpus", "propositional-logic", "inference-rules"],
      },
      {
        name: "Resolution & Chaining",
        topicIds: ["resolution-pl", "horn-chaining", "model-checking"],
      },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — First-Order Logic",
    subtitle: "FOL Syntax · Unification · Inference",
    description:
      "First-order logic representation, syntax and semantics, using FOL, knowledge engineering, unification and lifting, generalized forward chaining, backward chaining, and resolution refutation.",
    categories: [
      {
        name: "FOL Foundations",
        topicIds: ["fol-syntax", "fol-semantics", "fol-vs-pl"],
      },
      {
        name: "FOL Inference",
        topicIds: ["unification", "fol-forward-chaining", "fol-backward-chaining", "fol-resolution"],
      },
    ],
  },
};