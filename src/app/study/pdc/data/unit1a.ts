import type { PdcCheatTopic } from "./types";

// UNIT-I · Theory of Parallelism & Models
export const unit1aTopics: PdcCheatTopic[] = [
  {
    id: "parallel-models",
    title: "Parallel Computer Models",
    unit: "I",
    category: "Theory of Parallelism",
    importance: "HIGH",
    definition:
      "Classification frameworks that organise parallel machines by the streams they execute and the memory they share. The two dominant groupings: Flynn's taxonomy (instruction × data streams) and the memory-shared/distributed split.",
    coreIdea: "Model = instruction streams × data streams × memory scheme. Get those three right and every machine fits a box.",
    visual: {
      type: "flynn",
      data: {
        title: "Flynn's Taxonomy (1966)",
        quadrants: [
          { id: "sisd", label: "SISD", blurb: "Single instruction, single data — classic uniprocessor" },
          { id: "simd", label: "SIMD", blurb: "Single instruction, multiple data — vector/compute arrays" },
          { id: "misd", label: "MISD", blurb: "Multiple instruction, single data — fault-tolerant/redundant" },
          { id: "mimd", label: "MIMD", blurb: "Multiple instruction, multiple data — modern multicore/clusters" },
        ],
        note: "Tap a quadrant to see its typical machine.",
        detail: {
          sisd: "Classic sequential PC. One CU, one PE, one data stream. No parallelism.",
          simd: "Illiac-IV, Cray vector machines, GPU SIMT lanes. One instruction applied to many data elements at once.",
          misd: "Rare — used in safety-critical / redundant fault-tolerant systems (e.g. flight control). Leftover classification box.",
          mimd: "Modern processors, SMPs, computer clusters, multi-cores. Each PE runs its own instruction stream.",
        },
      },
    },
    keyPoints: [
      "Flynn (1966): SISD / SIMD / MISD / MIMD — based on number of instruction vs data streams.",
      "SIMD has 3 subtypes: array processor, pipelined (vector), associative.",
      "MIMD is the mainstream today (multicore + clusters).",
    ],
    examPoints: [
      "Flynn's 4-way split is the classic 2-mark / 5-mark diagram question.",
      "MISD is largely theoretical — cite redundancy/fault-tolerance.",
      "GPU = SIMT (array under SIMD umbrella) on Flynn; host CPU + GPU = MIMD system.",
    ],
    memoryTrigger: "Flynn = 2×2 grid. Think 'what executes' (instruction) × 'what it chews on' (data).",
  },
  {
    id: "state-of-computing",
    title: "The State of Computing",
    unit: "I",
    category: "Theory of Parallelism",
    importance: "MEDIUM",
    definition:
      "Historical trajectory from single serial CPUs toward inherently parallel machines, driven by transistor budgets that outgrew single-core frequency scaling — the move to multiple cores, accelerators, and distributed systems.",
    coreIdea: "Moore's law kept adding transistors, but power + clock walls ended the race to GHz. Parallelism is now the only way forward.",
    keyPoints: [
      "1960s–90s: serial speedup via clock frequency + instruction-level parallelism.",
      "Power wall (~100W/cm²) and ILP plateau stopped single-core scaling ≈ 2004.",
      "Multicore: multiple cores per die share memory bandwidth; thread-level parallelism.",
      "Accelerators: GPU / TPU / FPGA do bulk data-parallel work far faster.",
      "Distributed: clusters and cloud scale-out on commodity nodes.",
    ],
    examPoints: [
      "Know: power wall, memory wall, ILP wall → forced the multicore era.",
      "Trend question: 'Why did clock frequency plateau?' → heat / power, not transistor size alone.",
    ],
    memoryTrigger: "GHz stalled → go wide (parallel), not fast.",
  },
  {
    id: "multiprocessors-multicomputers",
    title: "Multiprocessors vs Multicomputers",
    unit: "I",
    category: "Theory of Parallelism",
    importance: "HIGH",
    definition:
      "Multiprocessors (tightly coupled) share a single physical address space; multicomputers (loosely coupled) are independent nodes each with private memory, linked by a network.",
    coreIdea: "Shared memory = one address space, easy programming, coherence cost. Private memory = explicit message passing, scales better.",
    visual: {
      type: "prm",
      data: {
        title: "Tightly vs Loosely Coupled",
        leftTitle: "Multiprocessor",
        rightTitle: "Multicomputer",
        left: "Shared memory bus · one address space · UMA/NUMA/CC-NUMA",
        right: "Private RAM per node · message passing (MPI) · no global physical memory",
      },
    },
    differences: [
      { feature: "Address space", valA: "Shared (single global)", valB: "Private (per node)" },
      { feature: "Communication", valA: "Shared memory / cache", valB: "Message passing (network)" },
      { feature: "Cost", valA: "Higher per node", valB: "Cheaper commodity nodes" },
      { feature: "Scalability", valA: "Limited (~tens of CPUs)", valB: "Can scale to thousands" },
      { feature: "Coherence", valA: "Cache coherence needed", valB: "None — explicit sync" },
    ],
    examPoints: [
      "Multiprocessor = symmetric (SMP, UMA), asymmetric, NUMA, CC-NUMA.",
      "Multicomputer = MPP, clusters, Beowulf, COW (cluster of workstations).",
      "Memory architecture is THE defining axis for exam questions.",
    ],
    memoryTrigger: "multiPROCESSOR = shared brain; multiCOMPUTER = a team of separate brains.",
  },
{
    id: "multivector-simd",
    title: "Multivector & SIMD Computers",
    unit: "I",
    category: "Theory of Parallelism",
    importance: "HIGH",
    definition:
      "Machines exploiting data parallelism: SIMD arrays operate on parallel data elements in lockstep, while vector (multivector) machines pipeline operations across arrays of operands under a single instruction.",
    coreIdea: "One instruction, whole vectors at once — parallelism inside the data path rather than across CPUs.",
    visual: {
      type: "pipeline",
      data: {
        title: "Vector Operation: C = A + B (elementwise in parallel)",
        stages: ["Load A[i]", "Load B[i]", "ALU +", "Store C[i]"],
        note: "SIMD does many lanes per instruction; vector pipelines stream elements in lockstep.",
      },
    },
    keyPoints: [
      "SIMD processors: processing elements (PEs) execute the same instruction on distinct data.",
      "Vector processors: instruction-level vector length N, pipelined functional units, chaining.",
      "Multivector systems couple multiple vector processors (e.g. Cray X-MP, IBM GF-11).",
      "Associative processors: comparison/search-based, masked SIMD.",
    ],
    examPoints: [
      "Differentiate SIMD array (many PEs) vs SIMD pipelined (vector) vs associative.",
      "Vector length / vector registers are favourite short-note questions.",
    ],
    memoryTrigger: "SIMD = many workers doing the same task, each on their own pile.",
  },
  {
    id: "pram-vlsi",
    title: "PRAM & VLSI Models",
    unit: "I",
    category: "Theory of Parallelism",
    importance: "MEDIUM",
    definition:
      "PRAM is an idealised shared-memory model assuming any processor can read/write any global cell in unit time (real cost of network abstracted away). The VLSI model measures chip area × time for parallel algorithms.",
    coreIdea: "PRAM = ideal abstraction for designing parallel algorithms; VLSI adds the physical cost of wires (area) and time.",
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "PRAM variants", value: "EREW · CREW · CRCW (exclusive vs concurrent R/W)" },
          { label: "Stages of a PRAM step", value: "Read → compute → write (all in unit time)" },
          { label: "VLSI metric", value: "AT² (area × time²) — wire cost matters" },
        ],
        note: "CREW = weakest-but-realistic read; CRCW strongest. EREW weakest overall.",
      },
    },
    keyPoints: [
      "PRAM abstracts away network latency — assume O(1) access to any shared cell.",
      "Submodels vary on concurrent access: EREW (none), CREW (concurrent read only), CRCW (both).",
      "CRCW has 3 write policies: Common, Arbitrary, Priority.",
      "VLSI model: A·T² complexity; wires dominate area on modern chips.",
      "BSP / LogP models add realistic latency & bandwidth that PRAM ignores.",
    ],
    examPoints: [
      "Ranking by strength: EREW < CREW < CRCW.",
      "VLSI AT² best-case lower bound is a classic result.",
    ],
    memoryTrigger: "PRAM = fairy-tale memory (instant). VLSI = the bill for the wires.",
  },
];