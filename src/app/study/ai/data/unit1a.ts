import type { AiCheatTopic } from "./types";

// UNIT-I · Agents & Problem Solving
export const unit1aTopics: AiCheatTopic[] = [
  {
    id: "intelligent-agents",
    title: "Intelligent Agents & Environments",
    unit: "I",
    category: "Agents",
    importance: "HIGH",
    definition:
      "An agent perceives its environment through sensors and acts through actuators. Agent function maps percept sequences to actions; the agent program runs on the architecture. PEAS = Performance, Environment, Actuators, Sensors.",
    coreIdea: "Agent = Perception → Reasoning → Action. Judge it by its percepts, not by its internals.",
    visual: {
      type: "menu",
      data: {
        title: "Environment Properties (PEAS-driven)",
        chips: [
          "Fully vs Partially observable",
          "Single vs Multi-agent",
          "Deterministic vs Stochastic",
          "Episodic vs Sequential",
          "Static vs Dynamic",
          "Discrete vs Continuous",
          "Known vs Unknown",
        ],
        note: "Hardest case: partially observable, multi-agent, stochastic, sequential, dynamic, continuous, unknown.",
      },
    },
    keyPoints: [
      "Types: simple reflex → model-based reflex → goal-based → utility-based → learning.",
      "Rational agent: acts to maximise expected performance measure given the percept sequence so far.",
      "Agent function (abstract mapping) ≠ agent program (concrete implementation).",
      "Table-driven agent is impractical — percept space explodes.",
    ],
    differences: [
      { feature: "Simple reflex", valA: "Condition-action rules only", valB: "Fails in partially observable" },
      { feature: "Model-based", valA: "Keeps internal state", valB: "Handles partial observability" },
      { feature: "Goal-based", valA: "Searches/plans ahead", valB: "Slower but flexible" },
      { feature: "Utility-based", valA: "Maximises expected utility", valB: "Handles conflicting goals" },
    ],
    examPoints: [
      "Define PEAS with a concrete example (self-driving car, medical diagnosis).",
      "'Discuss properties of task environments' — always give the 7 axis pairs.",
      "Rationality ≠ omniscience: it maximises EXPECTED performance with what it knows.",
    ],
    memoryTrigger: "PEAS first, then pick agent type from how messy the environment is.",
    keywords: ["agent", "PEAS", "rationality", "environment", "reflex"],
  },
  {
    id: "problem-solving-agents",
    title: "Problem-Solving Agents",
    unit: "I",
    category: "Agents",
    importance: "MEDIUM",
    definition:
      "A goal-based agent that decides what to do by searching over sequences of actions: form a goal, formulate the problem, search for a solution, then execute the action sequence.",
    coreIdea: "Goal → Problem formulation → Search → Execute. Offline: the solution is computed before acting.",
    steps: [
      "Goal formulation — set the target states based on the current situation.",
      "Problem formulation — decide states/actions to model the goal.",
      "Search — find an action sequence reaching a goal.",
      "Execution — perform the actions (solution is pre-computed = offline).",
    ],
    keyPoints: [
      "Four problem components: initial state, actions (successor function), transition model, goal test.",
      "Path cost g(n) measures how expensive a solution is.",
      "Fully observable + deterministic + known = fully solvable by search alone.",
    ],
    examPoints: [
      "List the 4 components of a problem — guaranteed short question.",
      "Difference between problem-solving (offline) and planning agents (interleaves).",
    ],
    memoryTrigger: "I-A-T-G-C: Initial state, Actions, Transition model, Goal test, Cost.",
    keywords: ["problem formulation", "initial state", "goal test", "path cost"],
  },
  {
    id: "search-problem",
    title: "Searching for Solutions (Tree vs Graph Search)",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "Search algorithms explore the state space via a frontier. Tree search does not track explored states (can revisit); graph search keeps an explored set, avoiding repeated states.",
    coreIdea: "Frontier separates explored from unexplored — the data structure of the frontier DEFINES the algorithm.",
    visual: {
      type: "search",
      data: { note: "Pick an algorithm, then Step/Play to watch visited (✓), frontier (○) and the final path (★)." },
    },
    keyPoints: [
      "Frontier (open list) + explored set (closed list).",
      "Graph search removes duplicates → finite state space terminates.",
      "Evaluation criteria: completeness, optimality, time, space.",
    ],
    differences: [
      { feature: "Tree search", valA: "No repeated-state check", valB: "Can loop infinitely", valC: "Less memory" },
      { feature: "Graph search", valA: "Explored set", valB: "Never revisits", valC: "More memory" },
    ],
    examPoints: [
      "Tree vs graph search trade-off is a classic 5-marker.",
      "Repeated-state checking matters most in graph-like state spaces (e.g. route finding).",
    ],
    memoryTrigger: "Frontier + explored set = the search skeleton; the queue discipline is the algorithm.",
    keywords: ["frontier", "explored set", "state space", "tree search", "graph search"],
  },
  {
    id: "bfs",
    title: "Breadth-First Search (BFS)",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "Expands the shallowest unexpanded node first using a FIFO queue. Finds the shallowest goal; optimal only when all step costs are equal.",
    coreIdea: "Level by level — like ripples in a pond.",
    formula: {
      expression: "Time O(b^d) · Space O(b^d)",
      symbols: { b: "branching factor", d: "depth of shallowest solution" },
      examNote: "Space is the killer — exponential frontier, not time, is what breaks BFS.",
    },
    steps: [
      "Put root in FIFO queue.",
      "Pop the front node; goal-test it.",
      "If not goal, add all children to the BACK of the queue.",
      "Repeat until goal found or frontier empty.",
    ],
    keyPoints: [
      "Complete: yes (if b finite).",
      "Optimal: yes only for unit step costs.",
      "Graph-search BFS: time/space O(b^d).",
    ],
    cons: ["Memory-hungry — O(b^d) frontier", "Wastes time at shallow levels before deep goals"],
    examPoints: [
      "BFS is optimal for equal step costs, NOT in general — common trap.",
      "1 GB ≈ b=10 to depth ~8; memory, not time, is the constraint.",
    ],
    memoryTrigger: "BFS = Big memory, Shallow-first.",
    keywords: ["FIFO", "shallowest", "level order"],
  },
  {
    id: "ucs",
    title: "Uniform-Cost Search (UCS)",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "Expands the node with the lowest path cost g(n) using a priority queue. BFS generalised to unequal step costs; Dijkstra's algorithm in disguise.",
    coreIdea: "Cheapest path first, ignoring direction to the goal.",
    formula: {
      expression: "Expand by g(n); time O(b^(1+⌊C*/ε⌋))",
      symbols: { "g(n)": "cost from start to n", "ε > 0": "minimum edge cost", "C*": "optimal solution cost" },
      examNote: "Requires step costs ≥ ε > 0, else it can loop on zero-cost edges.",
    },
    steps: [
      "Insert root with g = 0 into a priority queue keyed on g.",
      "Pop the lowest-g node; goal-test WHEN EXPANDED (not when generated).",
      "Add children with g = g(parent) + step cost.",
      "Repeat — first expanded goal is optimal.",
    ],
    keyPoints: [
      "Complete & optimal (with positive step costs).",
      "Goal test on expansion, not generation — the classic UCS trap.",
      "Identical to BFS when all costs equal; identical to Dijkstra on graphs.",
    ],
    examPoints: [
      "UCS goal-tests at expansion — BFS can goal-test at generation (unit costs).",
      "Works for any step-cost function ≥ ε.",
    ],
    memoryTrigger: "UCS = Dijkstra wearing a search-agent costume.",
    keywords: ["priority queue", "g(n)", "Dijkstra", "optimal"],
  },
  {
    id: "dfs",
    title: "Depth-First Search (DFS)",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "Expands the deepest unexpanded node first using a LIFO stack. Not optimal; complete only in finite spaces (graph search).",
    coreIdea: "Dive deep, backtrack when stuck.",
    formula: {
      expression: "Time O(b^m) · Space O(b·m)",
      symbols: { m: "maximum depth", b: "branching factor" },
      examNote: "Linear space is DFS's only real advantage — O(bm) stores the current path.",
    },
    steps: [
      "Push root onto stack.",
      "Pop top node; goal-test.",
      "Push its children onto the stack (deepest expansion).",
      "Backtrack when a dead end is reached.",
    ],
    keyPoints: [
      "Complete: NO for tree search with infinite depths; yes for graph search in finite spaces.",
      "Optimal: never (returns first found, not cheapest).",
      "Great when solutions are dense/deep and memory is scarce.",
    ],
    pros: ["Linear memory O(bm)", "Fewer nodes when solution is deep"],
    cons: ["Can dive into wrong infinite branch", "Not optimal"],
    examPoints: [
      "Space O(bm) vs BFS O(b^d) — the standard contrast question.",
      "DFS fails on infinite-depth trees (incomplete).",
    ],
    memoryTrigger: "DFS = Deep, Frugal, Suboptimal.",
    keywords: ["LIFO", "stack", "backtracking"],
  },
  {
    id: "iddfs",
    title: "Iterative Deepening DFS (IDDFS)",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "Runs depth-limited DFS with limit 0, 1, 2, … until the goal is found. Combines BFS completeness/optimality (unit costs) with DFS memory.",
    coreIdea: "Best of both: BFS's order, DFS's memory.",
    formula: {
      expression: "Time O(b^d) · Space O(bd)",
      symbols: { d: "depth of shallowest goal", b: "branching factor" },
      examNote: "Re-expansion overhead is tiny — outer levels dominate the node count.",
    },
    steps: [
      "For limit L = 0, 1, 2, …: run depth-limited DFS.",
      "If cutoff occurred (goal might be deeper), increase L and retry.",
      "Return the goal when found at the current limit.",
    ],
    keyPoints: [
      "Complete & optimal for unit step costs.",
      "Preferred uninformed search on large state spaces with unknown solution depth.",
      "Iterative lengthening = the analogous idea for UCS (increasing cost limits).",
    ],
    examPoints: [
      "Why retrying from scratch isn't wasteful: most nodes live in the deepest layer.",
      "Compare IDDFS vs BFS vs DFS memory — table question favourite.",
    ],
    memoryTrigger: "Deepen one ring at a time — pays almost nothing in re-expansion.",
    keywords: ["depth-limited", "iterative deepening", "cutoff"],
  },
  {
    id: "bidirectional",
    title: "Bidirectional Search",
    unit: "I",
    category: "Uninformed Search",
    importance: "MEDIUM",
    definition:
      "Searches simultaneously forward from the start and backward from the goal, stopping when the frontiers meet in the middle.",
    coreIdea: "Two half-searches are exponentially cheaper than one full search.",
    formula: {
      expression: "O(b^(d/2)) + O(b^(d/2)) ≪ O(b^d)",
      use: "e.g. b=10, d=6: 2,000 nodes vs 1,111,111",
      examNote: "Needs reversible actions & an explicit goal state; meeting-point check costs extra.",
    },
    keyPoints: [
      "Complete & optimal (with BFS on both sides, unit costs).",
      "Requires predecessors computable (invertible operators).",
      "Interleaving strategy matters (alternate, or favour smaller frontier).",
    ],
    examPoints: [
      "The b^d → 2·b^(d/2) saving is the whole point — compute the numeric example.",
      "Fails when actions aren't reversible or goal is described, not given.",
    ],
    memoryTrigger: "Meet in the middle: d becomes d/2 twice.",
    keywords: ["frontier meeting", "reversible", "d/2"],
  },
  {
    id: "search-comparison",
    title: "Uninformed Search — Master Comparison",
    unit: "I",
    category: "Uninformed Search",
    importance: "HIGH",
    definition:
      "The master table: completeness, optimality, time and space for every uninformed strategy. This single table answers most Unit-I objective questions.",
    coreIdea: "b = branching, d = shallowest goal depth, m = max depth, l = depth limit, C* = optimal cost, ε = min edge cost.",
    visual: {
      type: "comparison",
      data: {
        note: "5-column exam table — memorise by columns, not cells.",
        headers: ["Algorithm", "Complete?", "Optimal?", "Time", "Space"],
        rows: [
          ["BFS", "Yes (b finite)", "Only unit costs", "O(b^d)", "O(b^d)"],
          ["UCS", "Yes (ε>0)", "Yes", "O(b^(1+⌊C*/ε⌋))", "same"],
          ["DFS", "No (tree, ∞)", "No", "O(b^m)", "O(bm)"],
          ["DLS", "Yes if d ≤ l", "No", "O(b^l)", "O(bl)"],
          ["IDDFS", "Yes (unit)", "Yes (unit)", "O(b^d)", "O(bd)"],
          ["Bidirectional", "Yes", "Yes (unit)", "O(b^(d/2))", "O(b^(d/2))"],
        ],
      },
    },
    examPoints: [
      "'Compare BFS, DFS and IDDFS' — a guaranteed long question; draw this table.",
      "Only UCS and IDDFS (unit-cost) are optimal among uninformed methods.",
    ],
    memoryTrigger: "Complete+Optimal = UCS, IDDFS (unit), Bidirectional (unit). Everything else fails one.",
    keywords: ["comparison", "complete", "optimal", "complexity"],
  },
];