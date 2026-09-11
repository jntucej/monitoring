import type { AcaUnit, UnitId } from "./types";

export const ACA_UNITS: Record<UnitId, AcaUnit> = {
  I: {
    id: "I",
    title: "Unit I — Pipelining & Performance Fundamentals",
    subtitle: "Instruction Pipelining · Hazards · Reservation Tables · Speedup",
    description: "Linear and non-linear pipelines, structural/data/control hazards, forwarding, branch prediction, reservation tables, and throughput optimization.",
    categories: [
      { name: "Pipelining Basics", topicIds: ["pipeline-performance", "pipeline-hazards"] },
      { name: "Non-Linear Pipelines", topicIds: ["reservation-tables", "mal-optimization"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Instruction-Level Parallelism (ILP)",
    subtitle: "Dynamic Scheduling · Tomasulo · Reorder Buffer · Speculation",
    description: "Hardware instruction-level parallelism, Scoreboarding, Tomasulo's algorithm, Register Renaming, Speculative Execution, and Reorder Buffer (ROB).",
    categories: [
      { name: "Dynamic Scheduling", topicIds: ["tomasulo-algorithm", "register-renaming"] },
      { name: "Speculation & Branching", topicIds: ["reorder-buffer", "branch-prediction-hardware"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Multiprocessors & Cache Coherence",
    subtitle: "Symmetric Multiprocessors · MESI / MOESI · Directory Protocols",
    description: "Shared memory vs message passing architectures, Bus-based snooping protocols (MESI, MOESI), Directory-based cache coherence, and memory consistency models.",
    categories: [
      { name: "Cache Coherence", topicIds: ["mesi-protocol", "directory-coherence"] },
      { name: "Memory Models", topicIds: ["memory-consistency-models"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Multicore & Interconnection Networks",
    subtitle: "Topologies · Routing Algorithms · Network Performance",
    description: "Multicore chip architectures, Mesh/Torus/Hypercube topologies, Wormhole routing, crossbar switches, and latency/bandwidth metrics.",
    categories: [
      { name: "Network Topologies", topicIds: ["interconnection-topologies"] },
      { name: "Routing Methods", topicIds: ["wormhole-routing"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Vector Processing & GPU Architectures",
    subtitle: "Vector Processors · SIMD · GPU Execution Model (CUDA)",
    description: "Vector instruction sets, Chaining, Cray-1 architecture, Graphics Processing Units (GPUs), SIMT execution, and CUDA programming model.",
    categories: [
      { name: "Vector Computing", topicIds: ["vector-processing-chaining"] },
      { name: "GPU & SIMT", topicIds: ["gpu-architecture-cuda"] },
    ],
  },
};
