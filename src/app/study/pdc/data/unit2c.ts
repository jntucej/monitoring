import type { PdcCheatTopic } from "./types";

// UNIT-II · Hardware & Processors
export const unit2cTopics: PdcCheatTopic[] = [
  {
    id: "hardware-technologies",
    title: "Hardware Technologies",
    unit: "II",
    category: "Hardware & Processors",
    importance: "MEDIUM",
    definition:
      "The semiconductor and packaging realities that shape parallel machines: device scaling (Moore's law), gate/chip density, packaging, and the performance/photolithography curve that determines what a single chip can deliver.",
    coreIdea: "Transistor density kept rising but clock/power froze — that's exactly why cores multiplied instead of jitter.",
    visual: {
      type: "archtree",
      data: {
        root: "VLSI/MOS Technology Drivers",
        branches: [
          { name: "Device scaling", sub: ["Feature size ↓", "Transistors/cm² ↑", "Die size ↑"] },
          { name: "Power / clock", sub: ["~100 W/cm² ceiling", "Clock plateau ~4 GHz", "Multi-core workaround"] },
          { name: "Packaging", sub: ["I/O density", "Heat extraction", "3D stacking"] },
        ],
      },
    },
    keyPoints: [
      "Feature size and chip area set how many logic elements you can place.",
      "Power ∝ C·V²·f — the voltage/frequency wall stopped single-core GHz scaling.",
      "Cost per chip, defect yield, and packaging bound what's economically feasible.",
      "Multi-core, multi-threading, and accelerators are the workaround architectures.",
    ],
    examPoints: [
      "Explain the power/clock wall and why multicore was the industry answer.",
      "Relate device scaling to the A·T² VLSI bounds from Unit I.",
    ],
    memoryTrigger: "Smaller transistors, hotter chips → split work across cores, don't raise the clock.",
  },
  {
    id: "memory-hierarchy",
    title: "Processes & Memory Hierarchy",
    unit: "II",
    category: "Hardware & Processors",
    importance: "HIGH",
    definition:
      "The layered store from on-chip registers/caches through DRAM to disk, plus the process abstraction used to give each thread its own memory view. Latency and cost drop by ~10× per level while capacity rises.",
    coreIdea: "Hierarchy hides DRAM latency behind fast, small SRAM caches; caching works because of locality.",
    visual: {
      type: "pipeline",
      data: {
        title: "Memory hierarchy (top = fastest, smallest)",
        stages: ["Registers", "L1 Cache", "L2 Cache", "DRAM", "Disk"],
        note: "Each step down ≈ 5–10× slower but far larger & cheaper per byte.",
      },
    },
    keyPoints: [
      "Temporal & spatial locality are what make caches effective.",
      "Cache misses: compulsory, capacity, conflict — each needs a different cure.",
      "Virtual memory gives each process a private contiguous address space.",
      "Shared-memory multiprocessors need cache coherence to keep caches consistent.",
      "Memory bandwidth (not just latency) is the parallel-system bottleneck.",
    ],
    examPoints: [
      "List the three cache-miss classes (compulsory/capacity/conflict) — classic.",
      "Why does a multiprocessor need cache coherence? Shared addresses cached in many L1s.",
    ],
    memoryTrigger: "Small+fast at the top, big+slow at the bottom — locality is the glue.",
  },
  {
    id: "advanced-processor-tech",
    title: "Advanced Processor Technology",
    unit: "II",
    category: "Hardware & Processors",
    importance: "MEDIUM",
    definition:
      "The instruction-level techniques that push single-thread speed: pipelining, multiple issue, very long instruction words (VLIW), out-of-order execution, register renaming, and speculation/branch prediction.",
    coreIdea: "Do several instructions per clock by overlapping stages, issuing more than one at a time, and guessing branches.",
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "Pipelining", value: "Overlap stages → ILP via temporal parallelism" },
          { label: "Superscalar", value: "Issue ≥2 instr/cycle to parallel functional units" },
          { label: "VLIW", value: "Compiler packs instructions into wide words" },
          { label: "Speculation", value: "Predict + go, roll back on mispredict" },
        ],
      },
    },
    keyPoints: [
      "ILP = instruction-level parallelism; captured by dynamic (superscalar) or static (VLIW).",
      "Out-of-order + register renaming breaks false dependencies (WAR/WAW).",
      "Branch prediction recovers control-dependence stalls.",
      "Multi-threading (SMT / simultaneous) lets one core hide memory latency across threads.",
    ],
    examPoints: [
      "Superscalar vs VLIW: dynamic hardware scheduling vs compiler scheduling.",
      "Register renaming removes WAR/WAW (name dependencies).",
    ],
    memoryTrigger: "Pipeline the steps, issue several, and don't stop for a mis-guessed branch.",
  },
  {
    id: "superscalar-vector",
    title: "Superscalar & Vector Processors",
    unit: "II",
    category: "Hardware & Processors",
    importance: "HIGH",
    definition:
      "Superscalar processors issue multiple scalar instructions per cycle to parallel functional units using dynamic scheduling; vector processors apply a single instruction to a whole array of data in pipelined fashion with chaining.",
    coreIdea: "Superscalar = more instructions at once (ILP); vector = more data at once (data parallelism).",
    visual: {
      type: "comparison",
      data: {
        note: "Two routes to high throughput.",
        rows: [
          { feature: "Units", valA: "Several scalar execution units", valB: "Pipelined functional units" },
          { feature: "Parallelism", valA: "Instruction-level (ILP)", valB: "Data-level (vector length N)" },
          { feature: "Scheduling", valA: "Dynamic hardware", valB: "Vector controller / static" },
          { feature: "Efficiency", valA: "Fixpoint issue, hazard-prone", valB: "Streams data, chaining" },
        ],
      },
    },
    keyPoints: [
      "Issue rate = CPI inverse; IPC up to several per clock with multiple ALUs.",
      "Vector processors use vector registers & length; pipeline + chaining for throughput.",
      "Superscalar complexity (dependency logic) grows fast — why GPUs went SIMT instead.",
      "Hybrids: vector extensions (AVX/SVE) inside superscalar cores.",
    ],
    examPoints: [
      "CPI = cycles per instruction; IPC = instructions per cycle (reciprocal).",
      "Chaining = feed a vector pipeline's output into another — key vector trick.",
    ],
    memoryTrigger: "Superscalar juggles many different instructions; vector pours a flood through one pipe.",
  },
];