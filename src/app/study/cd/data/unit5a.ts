import type { CdCheatTopic } from "./types";

export const unit5Topics: CdCheatTopic[] = [
  {
    id: "code-optimization-dag",
    unit: "V",
    title: "Basic Blocks, Flow Graphs & DAG Representation",
    category: "Optimization Techniques",
    importance: "HIGH",
    definition:
      "Basic Blocks are maximal sequences of instructions with single entry and single exit points. Directed Acyclic Graphs (DAG) optimize basic blocks by eliminating common subexpressions.",
    coreIdea: "DAG nodes represent operations; leaves represent initial variable values.",
    steps: [
      "Principal Optimizations:",
      "1. Common Subexpression Elimination: Avoid re-evaluating identical expressions.",
      "2. Dead Code Elimination: Remove statements whose results are never read.",
      "3. Constant Folding & Propagation: Evaluate `2 * 3.14` at compile time.",
      "4. Loop Invariant Code Motion: Move code independent of loop iterations outside the loop.",
    ],
    examPoints: [
      "Partition 10 lines of TAC into Basic Blocks and construct Control Flow Graph (CFG).",
      "Construct DAG for basic block and generate optimized TAC.",
    ],
    memoryTrigger: "DAG = Eliminates redundant expressions inside basic block. CFG = Connects basic blocks.",
    keywords: ["basic block", "DAG", "control flow graph", "constant folding", "loop invariant"],
  },
  {
    id: "register-allocation-graph-coloring",
    unit: "V",
    title: "Register Allocation via Graph Coloring (Chaitin's Algorithm)",
    category: "Code Generation",
    importance: "HIGH",
    definition:
      "Register allocation assigns a finite set of K CPU hardware registers to an arbitrary number of code variables using Graph K-Coloring.",
    steps: [
      "1. Build Interference Graph G: Nodes = variables/temporaries. Edges = connected if both are live at the same point.",
      "2. Simplify: Find node v with degree < K. Push v to stack and remove from G.",
      "3. If all nodes pushed: Pop stack and color each node with a color different from neighbors.",
      "4. Spill: If any node has degree ≥ K and cannot be simplified, spill variable to memory.",
    ],
    examPoints: [
      "Construct Interference Graph for code segment and find K-coloring for K=2 or K=3 registers.",
      "Explain Chaitin's heuristic for register spilling.",
    ],
    memoryTrigger: "Graph Coloring: Nodes = variables, Edges = live together. Colors = CPU registers.",
    keywords: ["register allocation", "graph coloring", "interference graph", "spilling", "Chaitin algorithm"],
  },
];
