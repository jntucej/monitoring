import type { AcaCheatTopic } from "./types";

export const unit4Topics: AcaCheatTopic[] = [
  {
    id: "interconnection-topologies",
    unit: "IV",
    title: "Interconnection Topologies: Mesh, Torus, Hypercube & Crossbar",
    category: "Network Topologies",
    importance: "HIGH",
    definition:
      "Interconnection networks connect processor nodes, caches, and memory modules in parallel architectures.",
    coreIdea: "Trade-off: Network Diameter vs Bisection Bandwidth vs Degree (node cost).",
    differences: [
      { feature: "Crossbar", valA: "Diameter = 1", valB: "Cost = O(N²)", valC: "Non-blocking, non-scalable" },
      { feature: "2D Mesh", valA: "Diameter = 2(√N - 1)", valB: "Degree = 4", valC: "Scalable 2D layout" },
      { feature: "2D Torus", valA: "Diameter = √N", valB: "Degree = 4", valC: "Wrap-around edges reduce diameter" },
      { feature: "n-Hypercube", valA: "Diameter = n = log₂N", valB: "Degree = n", valC: "High bisection bandwidth" },
    ],
    examPoints: [
      "Calculate Diameter, Bisection Width, and Node Degree for N-node Mesh, Torus, and Hypercube.",
    ],
    memoryTrigger: "Hypercube: N = 2ⁿ nodes, Degree = n, Diameter = n.",
    keywords: ["mesh topology", "torus", "hypercube", "bisection bandwidth", "diameter"],
  },
  {
    id: "wormhole-routing",
    unit: "IV",
    title: "Wormhole Routing & Virtual Channels",
    category: "Routing Methods",
    importance: "HIGH",
    definition:
      "Wormhole routing divides packets into small flow-control units (flits) that pipeline through intermediate routers without buffering the whole packet.",
    coreIdea: "Header flit opens path; Body flits follow; Tail flit closes path. Reduces router buffer size!",
    steps: [
      "1. Header Flit contains destination address and establishes route.",
      "2. Body Flits follow sequentially through established virtual channels.",
      "3. Tail Flit releases reserved router buffers.",
      "4. Virtual Channels prevent head-of-line blocking and deadlocks.",
    ],
    examPoints: [
      "Explain Store-and-Forward vs Virtual Cut-Through vs Wormhole Routing.",
      "Show how Virtual Channels eliminate routing deadlocks.",
    ],
    memoryTrigger: "Wormhole: Flits pipelined like a snake through routers. Header opens, Tail closes.",
    keywords: ["wormhole routing", "flits", "virtual channels", "head of line blocking", "router deadlock"],
  },
];
