import type { AcaCheatTopic } from "./types";

export const unit1Topics: AcaCheatTopic[] = [
  {
    id: "pipeline-performance",
    unit: "I",
    title: "Pipeline Speedup & Throughput Analysis",
    category: "Pipelining Basics",
    importance: "HIGH",
    definition:
      "Pipelining overlaps instruction execution across multiple stages (IF, ID, EX, MEM, WB) to maximize instruction throughput.",
    coreIdea: "Ideal Speedup = k (number of stages). Real Speedup is reduced by clock overhead and pipeline stalls.",
    formula: {
      expression: "Speedup S_k = (n · k) / (k + n - 1)   •   Throughput = n / T_total",
      symbols: { k: "Number of pipeline stages", n: "Number of instructions", τ: "Clock cycle time" },
      examNote: "As n → ∞, max theoretical speedup S_k → k.",
    },
    steps: [
      "1. Calculate non-pipelined execution time: T_nonpipe = n · k · τ.",
      "2. Calculate pipelined execution time: T_pipe = (k + n - 1) · τ.",
      "3. Compute Speedup ratio: S_k = T_nonpipe / T_pipe.",
      "4. Factor in stall cycles: T_real = (k + n - 1 + Stall_cycles) · τ.",
    ],
    examPoints: [
      "Calculate pipeline speedup, efficiency (S_k / k), and throughput for given stage delays and instruction counts.",
      "Derive the speedup formula for n instructions over k stages.",
    ],
    memoryTrigger: "Speedup = Non-Pipelined Time / Pipelined Time → Max Speedup = k stages.",
    keywords: ["pipeline speedup", "throughput", "clock cycle", "efficiency", "k stage"],
  },
  {
    id: "pipeline-hazards",
    unit: "I",
    title: "Pipeline Hazards: Structural, Data & Control",
    category: "Pipelining Basics",
    importance: "HIGH",
    definition:
      "Hazards are situations that prevent the next instruction in the instruction stream from executing in its designated clock cycle.",
    coreIdea: "3 Hazard Types: Structural (resource conflict), Data (RAW/WAR/WAW), Control (branch decisions).",
    differences: [
      { feature: "RAW (Read-After-Write)", valA: "True Data Dependency", valB: "Instruction tries to read before write completes." },
      { feature: "WAR (Write-After-Read)", valA: "Anti-Dependency", valB: "Instruction tries to write before previous reads it." },
      { feature: "WAW (Write-After-Write)", valA: "Output Dependency", valB: "Instruction tries to write before previous writes it." },
    ],
    steps: [
      "Forwarding (Bypassing): Pass EX/MEM output directly to EX input without waiting for WB.",
      "Stalling (Bubbles): Freeze pipeline stages when data isn't ready.",
      "Branch Prediction: Predict taken/not-taken to eliminate control stalls.",
    ],
    examPoints: [
      "Identify RAW, WAR, and WAW hazards in code assembly sequences.",
      "Calculate stall cycles with and without hardware data forwarding.",
    ],
    memoryTrigger: "RAW = True Data, WAR = Anti, WAW = Output. Forwarding fixes RAW!",
    keywords: ["RAW hazard", "WAR hazard", "WAW hazard", "forwarding", "stall bubble"],
  },
  {
    id: "reservation-tables",
    unit: "I",
    title: "Reservation Tables & Collision Vectors",
    category: "Non-Linear Pipelines",
    importance: "HIGH",
    definition:
      "A Reservation Table represents resource usage across clock evaluation steps for non-linear pipelines with feedback/feedforward paths.",
    coreIdea: "Forbidden Latencies = column distance between X marks in the same row. Collision Vector C = (c_k ... c_1).",
    steps: [
      "1. Mark X in reservation table for stage s at cycle t.",
      "2. Find forbidden latency set F by checking differences between cycles in the same row.",
      "3. Construct initial Collision Vector C = (c_m ... c_1) where c_i = 1 if i ∈ F.",
      "4. Build State Transition Diagram by bitwise OR of shifted collision vector.",
    ],
    examPoints: [
      "Construct Collision Vector and State Diagram from a given Reservation Table.",
      "Determine Minimum Average Latency (MAL) and Greedy Cycles.",
    ],
    memoryTrigger: "Forbidden latency = gap between X's in same row. Collision Vector bit set at forbidden latency.",
    keywords: ["reservation table", "collision vector", "forbidden latency", "state diagram"],
  },
  {
    id: "mal-optimization",
    unit: "I",
    title: "Minimum Average Latency (MAL) & Delay Insertion",
    category: "Non-Linear Pipelines",
    importance: "MEDIUM",
    definition:
      "MAL is the minimum average number of clock cycles between initiating task evaluations into a non-linear pipeline without collisions.",
    coreIdea: "MAL is bounded by: max number of X's in any single row ≤ MAL ≤ number of 1's in collision vector + 1.",
    steps: [
      "1. Find all simple cycles in the State Diagram.",
      "2. Compute average latency for each simple cycle = sum(latencies) / cycle_length.",
      "3. MAL = minimum of all average latencies.",
      "4. Insert non-compute delay stages to achieve theoretical minimum MAL (equal to max X's in a row).",
    ],
    examPoints: [
      "Calculate MAL from State Diagram simple cycles.",
      "Insert delays to reach optimal throughput.",
    ],
    memoryTrigger: "MAL = lowest average latency cycle in state diagram. Max X's in row ≤ MAL.",
    keywords: ["MAL", "minimum average latency", "greedy cycle", "delay insertion"],
  },
];
