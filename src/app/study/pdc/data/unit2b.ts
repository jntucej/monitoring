import type { PdcCheatTopic } from "./types";

// UNIT-II · Analysis & Laws
export const unit2bTopics: PdcCheatTopic[] = [
  {
    id: "parallel-applications",
    title: "Parallel Processing Applications",
    unit: "II",
    category: "Analysis & Laws",
    importance: "MEDIUM",
    definition:
      "The problem domains that reward parallel execution: numerical/scientific computing, image & signal processing, AI/ML, big-data analytics, simulation, and real-time systems.",
    coreIdea: "Applications parallelise well when the work is embarrassingly parallel or highly data-parallel; structured dependencies need careful decomposition.",
    visual: {
      type: "menu",
      data: {
        note: "Tap each application to see why it parallelises.",
        items: [
          { label: "Scientific computing", value: "Matrix ops, FFT, PDE solvers — data-parallel cores" },
          { label: "Image / signal", value: "Independent pixel/sample work — trivially parallel" },
          { label: "AI / ML", value: "Training loops = vector/matrix cores (GPU)" },
          { label: "Simulation", value: "Particle, weather, molecular — spatial decomposition" },
          { label: "Big data", value: "Map/reduce over partitions — data parallel" },
        ],
      },
    },
    keyPoints: [
      "Grand challenges: weather, molecular modelling, astrophysics — TFlops+ demands.",
      "Embarrassingly parallel: no dependencies → maximal speedup (image pixels).",
      "Communication-bound apps (tight coupling) parallelise worst.",
      "Gustafson's insight: fixed time, growing problem → better scaling.",
    ],
    examPoints: [
      "Give 3–4 application classes and the parallelism they exploit.",
      "Know the difference between embarrassingly-parallel and tightly-coupled workloads.",
    ],
    memoryTrigger: "Image pixels & weather grids parallelise in slices; tightly-bound graphs don't.",
  },
  {
    id: "amdahl-law",
    title: "Amdahl's Law",
    unit: "II",
    category: "Analysis & Laws",
    importance: "HIGH",
    definition:
      "The fraction of a program that cannot be parallelised (the serial fraction f) sets an absolute ceiling on speedup regardless of how many processors you throw at it.",
    coreIdea: "Speedup ≤ 1/f as p→∞. A tiny serial fraction caps your gains hard.",
    visual: {
      type: "amdahl",
      data: {
        title: "Amdahl's Law — interactive speedup",
        formula: "S(p) = 1 / ( f + (1−f)/p )",
        note: "Drag f to feel the ceiling collapse.",
      },
    },
    formula: {
      expression: "S(p) = 1 / ( f + (1 − f) / p )",
      symbols: { f: "serial fraction (0..1)", p: "number of processors", "S(p)": "speedup" },
      use: "Predict upper bound of parallel speedup; find the serial bottleneck.",
      examNote: "For p→∞, S → 1/f. If f = 0.1 (10% serial), max speedup = 10× — only.",
    },
    examPoints: [
      "If 10% of code is serial, infinite CPUs still can't beat 10×.",
      "Applied to optimisation: the speedup of a subsystem is capped by its fraction of total time.",
      "Frequent numeric: compute S(p) given f and p.",
    ],
    memoryTrigger: "Amdahl = the serial sliver rules all.",
  },
  {
    id: "gustafson-law",
    title: "Gustafson's Law (Scaled Speedup)",
    unit: "II",
    category: "Analysis & Laws",
    importance: "HIGH",
    definition:
      "Fixed-time (scaled) speedup: instead of fixing the problem and adding CPUs, fix the time and let the problem grow. Larger problems amortise the serial fraction, so speedup can scale nearly linearly.",
    coreIdea: "Amdahl is pessimistic because real users solve BIGGER problems with more CPUs, not the same one.",
    formula: {
      expression: "S(p) = p + (1 − p) · s",
      symbols: { p: "processors", s: "serial fraction", "S(p)": "scaled speedup" },
      use: "Estimates realistic speedup when the problem size grows with processor count.",
      examNote: "Contrast with Amdahl: Gustafson uses growing workload, Amdahl uses fixed workload.",
    },
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "Amdahl", value: "Fixed problem size → ceiling 1/f" },
          { label: "Gustafson", value: "Fixed time, growing problem → ~linear" },
          { label: "Key difference", value: "Workload fixed vs workload scaled" },
        ],
      },
    },
    keyPoints: [
      "Gustafson (1988): 'more processors ⇒ solve a bigger problem in the same time'.",
      "Amdahl pessimism arises from keeping work constant; Gustafson lifts it.",
      "Underlying assumption: serial fraction does not grow with problem size.",
      "Use Amdahl for latency-critical small tasks, Gustafson for throughput-heavy large runs.",
    ],
    examPoints: [
      "State both laws and the exact assumption that separates them.",
      "Numeric: scaled speedup S(p) = p + (1−p)s — plug and solve.",
    ],
    memoryTrigger: "Amdahl: same pie, more forks. Gustafson: same meal-time, bigger pie.",
  },
  {
    id: "scalability-analysis",
    title: "Scalability Analysis & Approaches",
    unit: "II",
    category: "Analysis & Laws",
    importance: "HIGH",
    definition:
      "Methods to reason about how performance changes as p and the problem size W scale — including isoefficiency analysis, cost/effectiveness, and the distinction between strong and weak scaling.",
    coreIdea: "A system is scalable if you can keep efficiency flat by growing the work alongside the machine.",
    keyPoints: [
      "Strong scaling: fixed total work, add p → want linear speedup (Amdahl-limited).",
      "Weak scaling: work scales with p (per-processor work constant) → Gustafson-friendly.",
      "Isoefficiency: function describing how much W must grow to hold efficiency — defines scalability in one number.",
      "Cost-optimal algorithms: p·T(p) ≈ T(1); overhead must not dominate.",
      "Approaches: measure, model (metrics), simulate & profile.",
    ],
    examPoints: [
      "Define strong vs weak scaling cleanly.",
      "Isoefficiency analysis = the 'scalability in one formula' method — favourite long answer.",
    ],
    memoryTrigger: "Strong = same job, more hands. Weak = each hand does a job, grow the job.",
  },
];