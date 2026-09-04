import type { AiCheatTopic } from "./types";

// UNIT-I · Informed Search & Local Search
export const unit1bTopics: AiCheatTopic[] = [
  {
    id: "greedy",
    title: "Greedy Best-First Search",
    unit: "I",
    category: "Informed Search",
    importance: "MEDIUM",
    definition:
      "Expands the node that appears closest to the goal, using only the heuristic h(n) in a priority queue.",
    coreIdea: "All intuition, no memory of the cost already paid.",
    formula: {
      expression: "f(n) = h(n)",
      symbols: { "h(n)": "estimated cost from n to goal" },
      examNote: "Not optimal, not complete (can loop); worst-case O(b^m) but good h makes it fast.",
    },
    keyPoints: [
      "h(n) = straight-line distance in route finding.",
      "Can be led astray by an optimistic-looking but expensive-to-reach node.",
      "Fast in practice; worst case no better than DFS.",
    ],
    differences: [
      { feature: "Greedy", valA: "f = h only", valB: "Ignores g" },
      { feature: "UCS", valA: "f = g only", valB: "Ignores h" },
      { feature: "A*", valA: "f = g + h", valB: "Uses both" },
    ],
    examPoints: [
      "Greedy = UCS with h swapped for g; A* = their union.",
      "Romania example: Greedy takes Arad→Sibiu→Fagaras→Bucharest (non-optimal).",
    ],
    memoryTrigger: "Greedy is blind to what it already spent — only dreams about the goal.",
    keywords: ["h(n)", "best-first", "straight-line distance"],
  },
  {
    id: "astar",
    title: "A* Search",
    unit: "I",
    category: "Informed Search",
    importance: "HIGH",
    definition:
      "Expands the node with the lowest estimated total solution cost f(n) = g(n) + h(n). Optimal when h is admissible (tree search) or consistent (graph search).",
    coreIdea: "g = what it really cost to get here; h = honest guess of what remains; f = fair estimate of the whole trip.",
    formula: {
      expression: "f(n) = g(n) + h(n)",
      symbols: { "g(n)": "cost so far", "h(n)": "estimated cost to goal", "f(n)": "estimated total cost" },
      examNote: "Admissible: h(n) ≤ true cost, never overestimates. Consistent: h(n) ≤ c(n,n') + h(n').",
    },
    visual: {
      type: "search",
      data: { note: "Switch to A* in the search visual — watch f = g + h decide which node expands." },
    },
    steps: [
      "Priority queue keyed on f = g + h.",
      "Pop lowest-f node; goal-test on expansion.",
      "Update a child's entry if a cheaper g is found (graph search).",
      "First expanded goal is optimal.",
    ],
    keyPoints: [
      "Complete & optimal with admissible h (tree) / consistent h (graph).",
      "Optimal efficiency: no other optimal algorithm expands fewer nodes with the same h.",
      "Space is still exponential — the practical weakness (fix: IDA*, SMA*).",
    ],
    pros: ["Optimal + complete", "Best possible with a given heuristic"],
    cons: ["Exponential memory", "h quality dominates performance"],
    examPoints: [
      "Admissible vs consistent — graph search needs consistency; the #1 A* theory question.",
      "Prove optimality: every expanded node has f ≤ C*; an inconsistent h can hide a cheaper path.",
      "h = 0 makes A* identical to UCS; h = h* makes it near-perfect.",
    ],
    memoryTrigger: "A* = UCS's g + Greedy's h. Admissible h keeps it honest → optimal.",
    keywords: ["f(n)", "admissible", "consistent", "optimal efficiency"],
  },
  {
    id: "heuristic-functions",
    title: "Heuristic Functions",
    unit: "I",
    category: "Informed Search",
    importance: "HIGH",
    definition:
      "h(n) estimates the cheapest path cost from n to a goal. Dominance lets us compare heuristics: if h₂(n) ≥ h₁(n) for all n (both admissible), h₂ dominates and A* with h₂ expands fewer nodes.",
    coreIdea: "Better heuristic = closer to true cost while staying ≤ it.",
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "Admissible", value: "h(n) ≤ h*(n) — never overestimates" },
          { label: "Consistent", value: "h(n) ≤ c(n, n') + h(n') — triangle inequality" },
          { label: "Dominance", value: "h₂ ≥ h₁ everywhere ⇒ h₂ dominates ⇒ fewer expansions" },
          { label: "Relaxed problems", value: "h = exact cost of a simplified problem ⇒ admissible" },
        ],
        note: "Consistent ⇒ admissible, but not vice-versa.",
      },
    },
    keyPoints: [
      "8-puzzle heuristics: h₁ = misplaced tiles, h₂ = Manhattan distance; h₂ dominates h₁.",
      "Effective branching factor b* measures heuristic quality empirically.",
      "h from relaxed problems is automatically admissible.",
      "Combining: h(n) = max(h₁(n), h₂(n), …) stays admissible if components are.",
    ],
    examPoints: [
      "Show h₂ dominates h₁ on 8-puzzle — standard numerical question.",
      "Why does an admissible h guarantee A* optimality? (f never exceeds C* on the optimal path).",
    ],
    memoryTrigger: "Dominance: taller admissible tower = smarter search.",
    keywords: ["admissible", "dominance", "Manhattan", "relaxed problem", "b*"],
  },
  {
    id: "hill-climbing",
    title: "Hill Climbing",
    unit: "I",
    category: "Local Search",
    importance: "HIGH",
    definition:
      "A loop that moves to the best neighbouring state if it improves the objective; stops when no neighbour is better. Keeps no frontier — constant space.",
    coreIdea: "Climb uphill one step at a time; no memory of where you came from.",
    visual: {
      type: "menu",
      data: {
        title: "Hill Climbing Failure Modes",
        chips: [
          "Local maximum — better than all neighbours, not the global best",
          "Plateau — flat neighbourhood, no direction",
          "Ridge — ascent direction ≠ any single-axis step",
        ],
        note: "Random-restart hill climbing retries from random states — complete with probability → 1.",
      },
    },
    steps: [
      "Start from an initial (often random) state.",
      "Evaluate all neighbours.",
      "Move to the strictly best neighbour if it improves the objective.",
      "Else stop — return current state.",
    ],
    keyPoints: [
      "Constant space O(1) — no frontier at all.",
      "Not complete (traps); not optimal (local maxima).",
      "Variants: steepest-ascent, stochastic, first-choice, random-restart.",
    ],
    examPoints: [
      "Draw the local-maximum / plateau / ridge landscape — classic diagram.",
      "Random-restart: success probability 1−(1−p)^k after k restarts.",
    ],
    memoryTrigger: "Hill climbing = Sisyphus with amnesia: strong legs, no map.",
    keywords: ["local maximum", "plateau", "ridge", "random-restart"],
  },
  {
    id: "simulated-annealing",
    title: "Simulated Annealing",
    unit: "I",
    category: "Local Search",
    importance: "MEDIUM",
    definition:
      "Hill climbing that occasionally accepts WORSE moves with probability e^(ΔE/T), where temperature T gradually decreases. Escapes local maxima early, converges later.",
    coreIdea: "Like metallurgy: shake hard while hot, freeze slowly into the good crystal.",
    formula: {
      expression: "P(accept bad move) = e^(ΔE / T)",
      symbols: { "ΔE": "how much worse the move is (ΔE < 0)", "T": "current temperature" },
      examNote: "T→∞: random walk. T→0: pure hill climbing. The schedule matters.",
    },
    steps: [
      "Pick a random neighbour.",
      "If it improves the objective, move to it.",
      "If worse, move anyway with probability e^(ΔE/T).",
      "Reduce T per the cooling schedule; repeat until frozen.",
    ],
    keyPoints: [
      "Complete & converges to the global optimum given a logarithmic cooling schedule (very slow).",
      "Used for VLSI layout, scheduling, routing.",
      "Local beam search keeps k states instead — a related alternative.",
    ],
    examPoints: [
      "Sketch acceptance probability vs T — hot = permissive, cold = strict.",
      "Compare with hill climbing: identical loop + probabilistic bad-move acceptance.",
    ],
    memoryTrigger: "Hot = brave, cold = picky. e^(ΔE/T) is the bravery function.",
    keywords: ["temperature", "cooling schedule", "Metropolis", "escape local maxima"],
  },
  {
    id: "continuous-local",
    title: "Local Search in Continuous Spaces",
    unit: "I",
    category: "Local Search",
    importance: "LOW",
    definition:
      "When states are real-valued vectors (x₁,…,xₙ), gradient methods replace discrete successors: gradient ascent uses ∇f, line search picks a step size α.",
    coreIdea: "Follow the slope; step size is the whole game.",
    formula: {
      expression: "x ← x + α · ∇f(x)",
      symbols: { α: "step size", "∇f": "gradient vector" },
      examNote: "Newton–Raphson: x ← x − H⁻¹∇f(x) uses the Hessian for quadratic convergence.",
    },
    keyPoints: [
      "Gradient = direction of steepest increase; line search finds the best α.",
      "Newton–Raphson converges faster but needs the Hessian (expensive).",
      "Constrained problems: linear programming (simplex), convex optimisation.",
    ],
    examPoints: [
      "State the gradient-ascent update and the role of α (too big = overshoot, too small = slow).",
      "Local search matters here because successor enumeration is impossible in continuous spaces.",
    ],
    memoryTrigger: "Discrete → neighbours; Continuous → gradients.",
    keywords: ["gradient", "step size", "Newton-Raphson", "convex"],
  },
];