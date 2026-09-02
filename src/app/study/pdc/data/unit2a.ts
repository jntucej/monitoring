import type { PdcCheatTopic } from "./types";

// UNIT-II · Scalable Performance & Metrics
export const unit2aTopics: PdcCheatTopic[] = [
  {
    id: "scalable-performance",
    title: "Principles of Scalable Performance",
    unit: "II",
    category: "Scalable Performance",
    importance: "HIGH",
    definition:
      "A system is scalable if its performance grows predictably as more resources (processors, memory, bandwidth) are added. Scalability is measured by how speedup and efficiency track the number of processors.",
    coreIdea: "Scalable = adding processors actually buys you time, not just headline core-count.",
    visual: {
      type: "scale",
      data: {
        note: "Fixed load (Amdahl) vs growing load (Gustafson): which regime matters?",
        labels: ["Speedup", "Efficiency", "Isoefficiency"],
      },
    },
    keyPoints: [
      "Speedup S(p) = T(1)/T(p) — ideal is linear (p).",
      "Efficiency E(p) = S(p)/p — ideal is 1.0 (100%).",
      "Perfect scaling is rare; overhead (sync + communication) always drags efficiency down.",
      "Two scaling modes: fixed-size (Amdahl) and time-constrained (Gustafson).",
      "Isoefficiency: work must grow with p to keep efficiency constant.",
    ],
    examPoints: [
      "Define speedup & efficiency precisely and give the ideal values.",
      "Explain why efficiency < 1: communication, synchronisation, load imbalance, serial fraction.",
    ],
    memoryTrigger: "Speedup = how much faster. Efficiency = how much of each CPU you actually use.",
  },
  {
    id: "performance-metrics",
    title: "Performance Metrics & Measures",
    unit: "II",
    category: "Scalable Performance",
    importance: "HIGH",
    definition:
      "The numbers used to judge a parallel system: execution time, throughput, MIPS/FLOPS, speedup, efficiency, and the derived metrics of overhead, quality, and redundancy of parallel execution.",
    coreIdea: "Raw clocks and FLOPs mean little alone — speedup, efficiency and cost tell the real story.",
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "Speedup", value: "S(p) = T(1) / T(p)" },
          { label: "Efficiency", value: "E(p) = S(p) / p" },
          { label: "Overhead", value: "T_o = p·T(p) − T(1)" },
          { label: "Redundancy", value: "R = W_par / W_seq" },
        ],
        note: "Quality / utilisation = fraction of resource capacity actually harnessed.",
      },
    },
    keyPoints: [
      "T(p): wall-clock time with p processors.",
      "Throughput & MIPS/MFLOPS — raw rate; FLOPS favour vector/superscalar machines.",
      "Speedup ideal = p; superlinear speedup occasionally appears (cache effects).",
      "Overhead ⊕ redundancy ⊖ quality = the three extra parallel measures.",
      "Scalability relative to both problem size and machine size.",
    ],
    examPoints: [
      "Define redundancy & quality — often tested alongside speedup/efficiency.",
      "Why can apparent superlinear speedup happen? Cache/working-set effects.",
    ],
    memoryTrigger: "Four metrics: Speedup, Efficiency, Overhead, Redundancy.",
  },
];