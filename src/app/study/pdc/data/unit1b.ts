import type { PdcCheatTopic } from "./types";

// UNIT-I · Program & Network Properties
export const unit1bTopics: PdcCheatTopic[] = [
  {
    id: "arch-tracks",
    title: "Architectural Development Tracks",
    unit: "I",
    category: "Program & Network Properties",
    importance: "MEDIUM",
    definition:
      "The historical paths along which parallel architectures evolved — vector/array machines, MIMD multiprocessors, distributed multicomputers, and hybrids — each answering a different performance problem.",
    coreIdea: "Every architectural 'track' is a bet on where the parallelism is: in the data, in the threads, or across a network.",
    visual: {
      type: "archtree",
      data: {
        root: "Parallel Architectures",
        branches: [
          { name: "Data-parallel / Vector", sub: ["SIMD arrays", "Vector & superscalar", "GPU"] },
          { name: "MIMD Shared-memory", sub: ["SMP / UMA", "NUMA", "CC-NUMA"] },
          { name: "MIMD Distributed", sub: ["MPP", "Clusters", "Cloud / Grid"] },
          { name: "Special-purpose", sub: ["Systolic arrays", "Dataflow", "Neural accelerators"] },
        ],
      },
    },
    keyPoints: [
      "Track 1 — vector/arrays: maximal data parallelism, lockstep control (Illiac, Cray).",
      "Track 2 — shared-memory MIMD: uniform/shared view; easy program, hard coherence.",
      "Track 3 — message-passing MIMD: commodity nodes + interconnect; scales far.",
      "Track 4 — special: systolic, dataflow, wavefront — niche but fast.",
    ],
    examPoints: [
      "Trace how each track maps to a Flynn category.",
      "Trend: single architecture blends all tracks today (heterogeneous CPUs + GPUs + fabrics).",
    ],
    memoryTrigger: "Four tracks: Data, Shared, Distributed, Specialised.",
  },
  {
    id: "program-network-properties",
    title: "Program & Network Properties",
    unit: "I",
    category: "Program & Network Properties",
    importance: "HIGH",
    definition:
      "Program-level attributes (task graph, dependency, granularity, concurrency) and network-level attributes (topology, degree, diameter, bisection bandwidth, latency/bandwidth) that together decide how well a parallel program maps onto a machine.",
    coreIdea: "A program has structure (which computations depend on which); a network has shape (who is connected to whom). Match them and speedup follows.",
    keyPoints: [
      "Program properties: task size/granularity, dependency, concurrency, degree of parallelism (DOP).",
      "Critical path length bounds the achievable speedup.",
      "Network properties: degree, diameter, connectivity, bisection bandwidth, cost.",
      "Good mapping minimises communication distance between dependent tasks.",
    ],
    examPoints: [
      "Define diameter, connectivity, bisection bandwidth — very common definitions.",
      "Granularity trade-off: coarse (less sync, more idle) vs fine (more sync, less idle).",
    ],
    memoryTrigger: "Program = the job's skeleton; Network = the machine's skeleton. Both must fit.",
  },
  {
    id: "conditions-of-parallelism",
    title: "Conditions of Parallelism",
    unit: "I",
    category: "Program & Network Properties",
    importance: "HIGH",
    definition:
      "Which 'parallelisms' exist in a program (data, control, resource, temporal) and the correctness conditions — data dependence, control dependence, resource conflicts — that must be satisfied before code can run in parallel.",
    coreIdea: "Parallelism is only safe if all true dependencies are preserved.",
    visual: {
      type: "flow",
      data: {
        steps: [
          "Data parallelism — same op, many data",
          "Control parallelism — independent branches in parallel",
          "Resource parallelism — disjoint hardware units in parallel",
          "Temporal (pipelined) parallelism — overlapping phases",
        ],
        note: "Four ways work can overlap.",
      },
    },
    keyPoints: [
      "Data dependence (RAW), anti (WAR), output (WAW): order must be preserved.",
      "Control dependence: branch result must decide execution.",
      "Resource conflict: two ops wanting the same functional unit.",
      "Bernstein's conditions: sets of written vars must be disjoint to be parallelisable.",
    ],
    examPoints: [
      "RAW / WAR / WAW hazards — classic 2-marker (draw + name).",
      "Bernstein's conditions are usually a 3–5 mark explanation.",
    ],
    memoryTrigger: "RAW (true), WAR (anti), WAW (output) — only RAW is a real dependency.",
  },
  {
    id: "partitioning-scheduling",
    title: "Program Partitioning & Scheduling",
    unit: "I",
    category: "Program & Network Properties",
    importance: "HIGH",
    definition:
      "Partitioning splits a program into tasks that can run concurrently; scheduling assigns those tasks to processors in an order that minimises makespan and respects dependencies.",
    coreIdea: "Partition = cut up the work. Schedule = decide who does what, and when.",
    visual: {
      type: "flow",
      data: {
        steps: [
          "Partitioning → decompose problem into parallel tasks",
          "Assignment → map tasks to processes/processors",
          "Scheduling → order tasks on each processor (respect dependencies)",
          "Synchronisation & communication → glue the pieces",
        ],
        note: "Partition first, then schedule. Scheduling = NP-hard → use heuristics.",
      },
    },
    keyPoints: [
      "Partitioning aims to expose data-parallel + control-parallel work.",
      "Load balancing vs minimising communication — the eternal tension.",
      "List scheduling / critical-path scheduling are classic heuristics.",
      "Locality: keep dependent tasks on the same processor to cut messages.",
    ],
    examPoints: [
      "Static (compile-time) vs dynamic (runtime) scheduling.",
      "Makespan = time to finish the LAST task; bound by critical path.",
    ],
    memoryTrigger: "Cut the work, then book the machines.",
  },
];