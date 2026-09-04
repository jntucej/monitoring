import type { AiCheatTopic } from "./types";

// UNIT-II · Games, CSP & Propositional Logic
export const unit2aTopics: AiCheatTopic[] = [
  {
    id: "games-minimax",
    title: "Games & Optimal Decisions (Minimax)",
    unit: "II",
    category: "Games",
    importance: "HIGH",
    definition:
      "Two-player, zero-sum, perfect-information games are solved by minimax: MAX maximises the utility, MIN minimises it. The value of a node is backed up from terminal states through the game tree.",
    coreIdea: "Assume a perfect opponent: pick the move whose WORST case is best.",
    formula: {
      expression: "Minimax(s) = Utility(s) if terminal; max/min over children otherwise",
      symbols: { MAX: "player maximising utility", MIN: "player minimising it" },
      examNote: "Time O(b^m), space O(bm). Complete & optimal against an optimal opponent.",
    },
    steps: [
      "Generate the game tree down to terminal states.",
      "Apply the utility function at terminals.",
      "Back values up: MAX nodes take the max child; MIN nodes the min.",
      "At the root, MAX picks the move with the highest backed-up value.",
    ],
    keyPoints: [
      "Game defined by: initial state, players, actions, transition model, terminal test, utility.",
      "Properties of games: zero-sum, perfect vs imperfect information, deterministic vs chance.",
      "Depth-limited minimax + evaluation function for real games.",
    ],
    differences: [
      { feature: "Perfect info", valA: "Chess — minimax applies", valB: "No hidden states" },
      { feature: "Imperfect info", valA: "Poker — needs belief states", valB: "Hidden hands/cards" },
      { feature: "Zero-sum", valA: "Win/Lose strictly trade off", valB: "Pure adversarial search" },
    ],
    examPoints: [
      "Compute minimax values on a given 3-level tree — guaranteed numerical.",
      "Why is depth-limited minimax needed? Full tree is exponential in m.",
      "Pruning never changes the ROOT decision — remember this.",
    ],
    memoryTrigger: "MAX hopes, MIN worst-cases it: pick your best worst outcome.",
    keywords: ["minimax", "utility", "backed-up value", "zero-sum"],
  },
  {
    id: "alpha-beta",
    title: "Alpha-Beta Pruning",
    unit: "II",
    category: "Games",
    importance: "HIGH",
    definition:
      "Minimax that prunes branches provably irrelevant to the root decision: α = best value MAX has so far; β = best value MIN has so far. Prune when α ≥ β.",
    coreIdea: "If a move is already worse for you than a previous option, STOP evaluating it — the opponent would never let you get there.",
    formula: {
      expression: "Prune when α ≥ β",
      symbols: { α: "best (highest) value MAX can guarantee so far", β: "best (lowest) value MIN can guarantee so far" },
      examNote: "Best case O(b^(m/2)) — doubles searchable depth with the same time budget.",
    },
    visual: {
      type: "alphabeta",
      data: {
        note: "Step through: α/β update at each node; crossed branches are pruned. Try the ⟲ Reset button to replay.",
      },
    },
    steps: [
      "Descend DFS; at MAX nodes α = max(α, child value); at MIN nodes β = min(β, child value).",
      "At MAX: if value ≥ β → prune remaining children (MIN will never allow this).",
      "At MIN: if value ≤ α → prune remaining children (MAX will never allow this).",
      "Root value = minimax value; pruning only saves work, never the answer.",
    ],
    keyPoints: [
      "Move ordering matters hugely: best-case b^(m/2), worst-case plain b^m.",
      "α never decreases on a MAX path; β never increases on a MIN path.",
      "Effectiveness: same decision as minimax, identical root value.",
    ],
    differences: [
      { feature: "Minimax", valA: "Evaluates every leaf", valB: "O(b^m) always" },
      { feature: "Alpha-Beta", valA: "Skips hopeless branches", valB: "O(b^(m/2)) best case" },
      { feature: "Best ordering", valA: "Try strongest moves first", valB: "Maximises pruning" },
    ],
    examPoints: [
      "Trace α, β and mark pruned edges on a given tree — the classic 8-marker.",
      "Equal-value pruning: at MAX, value ≥ β prunes (≥ vs > matters in textbooks).",
      "State the α ≥ β condition and which player each bound belongs to.",
    ],
    memoryTrigger: "α = MAX's floor, β = MIN's ceiling. When floor ≥ ceiling, cut.",
    keywords: ["alpha", "beta", "pruning", "game tree", "b^(m/2)"],
  },
  {
    id: "real-time-decisions",
    title: "Imperfect, Real-Time Decisions",
    unit: "II",
    category: "Games",
    importance: "MEDIUM",
    definition:
      "When the full game tree cannot be searched, use depth-limited minimax with an evaluation function EVAL(n) on cut-off states, plus quiescence search and forward pruning.",
    coreIdea: "Trade exactness for depth: a shallow search with a good EVAL beats a deep search you can't finish.",
    formula: {
      expression: "EVAL(n) = w₁·f₁(n) + w₂·f₂(n) + … + wₙ·fₙ(n)",
      symbols: { "fᵢ": "weighted features (material, mobility…)", "wᵢ": "feature weights" },
      examNote: "Cutting off at non-quiescent positions causes the horizon effect.",
    },
    keyPoints: [
      "Evaluation features: material (piece counts), mobility, king safety, pawn structure.",
      "Quiescence search: extend search until positions are 'quiet' (no pending captures).",
      "Horizon effect: bad move hidden just beyond the depth limit.",
      "Forward pruning: beam search, MINOR/MAX^ schemes.",
    ],
    examPoints: [
      "Define the horizon effect and quiescence search together — common pair.",
      "Linear weighted evaluation functions are the standard exam formula.",
    ],
    memoryTrigger: "Can't search to the end? Evaluate at the horizon, but only in quiet positions.",
    keywords: ["evaluation function", "quiescence", "horizon effect", "depth limit"],
  },
];