import type { PdcCheatTopic } from "./types";

// UNIT-I · System Architecture
export const unit1cTopics: PdcCheatTopic[] = [
  {
    id: "program-flow-mechanisms",
    title: "Program Flow Mechanisms",
    unit: "I",
    category: "System Architecture",
    importance: "MEDIUM",
    definition:
      "How a machine drives computation forward. Three families: control-driven (program counter + instructions), data-driven (dataflow — an instruction fires when all inputs arrive), and demand-driven (only compute what a result is requested).",
    coreIdea: "What triggers the next operation? The PC (control), available data (dataflow), or a request (demand).",
    visual: {
      type: "comparison",
      data: {
        note: "Three driving mechanisms.",
        rows: [
          { feature: "Trigger", valA: "Program counter", valB: "Data availability", valC: "Demand for result" },
          { feature: "Model", valA: "Control flow", valB: "Data flow", valC: "Demand / reduction" },
          { feature: "Parallelism", valA: "ILP, limited", valB: "Maximal, implicit", valC: "Lazy — compute on need" },
          { feature: "Example", valA: "Von Neumann, x86", valB: "Dataflow machines", valC: "Functional / lazy langs" },
        ],
      },
    },
    keyPoints: [
      "Control-driven = classic von Neumann; explicit sequencing via PC.",
      "Data-driven = dataflow; no sequencing, fires on operand arrival — high parallelism.",
      "Demand-driven = lazy evaluation; reduces work, but hard to parallelise eagerly.",
      "These tie to stream/thread models in modern accelerators.",
    ],
    examPoints: [
      "List & contrast the three mechanisms — a classic comparison table question.",
      "Dataflow has no need for sequential PCs — a frequent 'explain' prompt.",
    ],
    memoryTrigger: "PC = traffic light (sequential). Dataflow = all-ready-to-go (parallel). Demand = lazy.",
  },
  {
    id: "interconnect-architectures",
    title: "System Interconnect Architectures",
    unit: "I",
    category: "System Architecture",
    importance: "HIGH",
    definition:
      "The networks joining processors and memory: shared-bus, crossbar, multistage networks, and direct (point-to-point) topologies such as mesh, hypercube, tree, and omega networks.",
    coreIdea: "The interconnect is the machine's circulatory system — its topology decides bandwidth, latency, and cost.",
    visual: {
      type: "menu",
      data: {
        note: "Tap through the main interconnect families.",
        items: [
          { label: "Shared Bus", value: "Simple, cheap, BUT bottleneck — one transaction at a time" },
          { label: "Crossbar", value: "N×N switch — full concurrency, cost O(N²)" },
          { label: "Multistage (OMEGA)", value: "log N stages, N log N switches — scalable middle ground" },
          { label: "Direct Mesh/Hypercube", value: "Point-to-point links — high bisection, locality-aware" },
        ],
      },
    },
    keyPoints: [
      "Shared bus: low cost, low scaling — fine for small SMPs.",
      "Crossbar: any-to-any in one step; O(N²) cost limits large N.",
      "Multistage (Banyan/Omega): N log N cost, log N node-route latency; blocking possible on conflicts.",
      "Direct networks: mesh (2D/3D), hypercube (log N diameter), tree — trade diameter/degree/cost.",
      "Connectivity & bisection width capture fault tolerance & throughput.",
    ],
    examPoints: [
      "Crossbar vs bus vs multistage — know cost & bandwidth trade-offs.",
      "Hypercube: N = 2^d nodes, degree d, diameter d.",
      "Omega/multistage networks' blocking property = favourite short note.",
    ],
    memoryTrigger: "Bus = single lane. Crossbar = every lane meets every lane. Mesh/cube = streets.",
  },
];