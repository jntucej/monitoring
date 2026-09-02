import type { PdcCheatTopic } from "./types";

// UNIT-III · Pipeline Design
export const unit3cTopics: PdcCheatTopic[] = [
  {
    id: "instruction-pipeline-design",
    title: "Instruction Pipeline Design",
    unit: "III",
    category: "Pipeline Design",
    importance: "HIGH",
    definition:
      "Designing the fetch-and-execute pipeline: choosing stages, buffers, and handling the two killer complexities — data hazards (dependencies) and control hazards (branches) that stall or flush the pipe.",
    coreIdea: "The instruction pipeline's whole job is keeping the ALU busy; hazards are what steal that.",
    visual: {
      type: "flow",
      data: {
        steps: [
          "Fetch → Decode → Align/rename → Execute → Writeback",
          "Data hazards (RAW): forward/scoreboard the operands instead of stalling",
          "Control hazards (branches): predict + speculate, squash on mispredict",
          "Buffers & interstage latches decouple the stages so a stall doesn't freeze everything",
        ],
        note: "Hazards decide the pipeline's CPI in practice.",
      },
    },
    keyPoints: [
      "RAW hazards dominate: forwarding (bypass) removes most without stalling.",
      "Branches = control hazard; branch prediction + delayed slots recover throughput.",
      "Structural hazards arise when two stages need the same unit (e.g. memory port).",
      "Scoreboard / Tomasulo's algorithm do dynamic scheduling around hazards.",
    ],
    examPoints: [
      "Pipeline hazard explanation + forwarding diagram = very common question.",
      "Branches cost cycles; prediction accuracy determines the average penalty.",
    ],
    memoryTrigger: "Chain the stages, forward the results, and guess the branches right.",
  },
  {
    id: "arithmetic-pipeline-design",
    title: "Arithmetic Pipeline Design",
    unit: "III",
    category: "Pipeline Design",
    importance: "MEDIUM",
    definition:
      "Breaking a numeric operation (add, multiply, divide, FFT) into pipelined sub-steps that each take one cycle, so vector data streams through with one result per cycle.",
    coreIdea: "Split big arithmetic into a production line: each digit/partial-product step is a stage.",
    visual: {
      type: "pipeline",
      data: {
        title: "Pipelined floating-point add",
        stages: ["Compare exp → align", "Add mantissas", "Normalise", "Round"],
        note: "Vector streaming hides the fill latency; steady throughput = 1 add/cycle.",
      },
    },
    keyPoints: [
      "Arithmetic pipelines: add (align→add→normalise→round), multiply (partial products), divide (iterative).",
      "Latency ≈ number of stages; throughput = 1 result per cycle after fill.",
      "FFT pipelines use butterfly stages for sequential log N passes.",
      "Chaining in vector machines strings arithmetic pipelines together.",
    ],
    examPoints: [
      "Draw the floating-point adder pipeline — the canonical arithmetic-pipeline diagram.",
      "Know fill latency vs steady-state throughput.",
    ],
    memoryTrigger: "Align → Add → Normalise → Round: the FP-adder assembly line.",
  },
  {
    id: "superscalar-pipeline-design",
    title: "Superscalar Pipeline Design",
    unit: "III",
    category: "Pipeline Design",
    importance: "HIGH",
    definition:
      "Widening the pipeline to issue multiple independent instructions per cycle: fetch N, decode, rename registers, dispatch to parallel units, retire in order. Dependency detection decides which issues together.",
    coreIdea: "Beyond pipelining: widen it — issue several instructions each cycle, guessing and renaming along the way.",
    visual: {
      type: "formula-chip",
      data: {
        blocks: [
          { label: "Wide fetch", value: "Fetch 2–8 instr/cycle (trace cache / I-cache + predictor)" },
          { label: "Renaming", value: "PRF removes false WAR/WAW dependencies" },
          { label: "Dispatch", value: "Scoreboard/Gantt to multiple functional units" },
          { label: "Retire", value: "In-order commit keeps exceptions architectural" },
        ],
      },
    },
    keyPoints: [
      "IPC is bounded by dependency chains (RAW), issue width, and functional unit mix.",
      "Register renaming (physical register file) defeats WAR/WAW false deps.",
      "Out-of-order execution + in-order retirement = the pragmatic design.",
      "SMT/hyper-threading shares issue slots across threads to hide latency.",
    ],
    examPoints: [
      "Superscalar throughput = issue width × pipeline depth combos.",
      "In-order retire vs out-of-order execute — explain why retire stays in order.",
    ],
    memoryTrigger: "Wide lanes + renaming + guess branches: polish the ILP machine.",
  },
];