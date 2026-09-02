import type { PdcUnit } from "./types";

export const PDC_UNITS: Record<"I" | "II" | "III", PdcUnit> = {
  I: {
    id: "I",
    title: "Unit I — Parallel & System Architecture",
    subtitle: "Models, Program/Network Properties, Interconnects",
    description:
      "Parallel computer models (Flynn, PRAM, VLSI), multiprocessors vs multicomputers, conditions of parallelism, partitioning & scheduling, program flow and interconnect architectures.",
    categories: [
      {
        name: "Theory of Parallelism & Models",
        topicIds: ["parallel-models", "state-of-computing", "multiprocessors-multicomputers", "multivector-simd", "pram-vlsi"],
      },
      {
        name: "Program & Network Properties",
        topicIds: ["arch-tracks", "program-network-properties", "conditions-of-parallelism", "partitioning-scheduling"],
      },
      {
        name: "System Architecture",
        topicIds: ["program-flow-mechanisms", "interconnect-architectures"],
      },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Scalable Performance & Processors",
    subtitle: "Metrics, Amdahl/Gustafson, Hardware & Pipelining Fundamentals",
    description:
      "Scalable performance principles, metrics, Amdahl's & Gustafson's laws, scalability analysis, hardware technologies, memory hierarchy, and advanced/superscalar/vector processors.",
    categories: [
      {
        name: "Scalable Performance & Analysis",
        topicIds: ["scalable-performance", "performance-metrics", "parallel-applications", "amdahl-law", "gustafson-law", "scalability-analysis"],
      },
      {
        name: "Hardware & Processors",
        topicIds: ["hardware-technologies", "memory-hierarchy", "advanced-processor-tech", "superscalar-vector"],
      },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Memory & Pipelining",
    subtitle: "Shared Memory, Consistency, Pipeline Processors",
    description:
      "Shared-memory organisations, sequential & weak consistency, pipelining and superscalar techniques, linear/non-linear pipeline processors, and instruction/arithmetic/superscalar pipeline design.",
    categories: [
      {
        name: "Memory Organizations",
        topicIds: ["shared-memory-organizations", "consistency-models"],
      },
      {
        name: "Pipelining Techniques",
        topicIds: ["pipelining-superscalar-intro", "linear-pipeline", "nonlinear-pipeline"],
      },
      {
        name: "Pipeline Design",
        topicIds: ["instruction-pipeline-design", "arithmetic-pipeline-design", "superscalar-pipeline-design"],
      },
    ],
  },
};