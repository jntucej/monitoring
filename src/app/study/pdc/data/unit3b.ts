import type { PdcCheatTopic } from "./types";

// UNIT-III · Pipelining Techniques
export const unit3bTopics: PdcCheatTopic[] = [
  {
    id: "pipelining-superscalar-intro",
    title: "Pipelining & Superscalar Techniques",
    unit: "III",
    category: "Pipelining Techniques",
    importance: "HIGH",
    definition:
      "Pipelining breaks a task into k stages and overlaps them so k tasks are in flight at once. Superscalar execution takes it further by issuing multiple independent instructions each cycle to parallel units.",
    coreIdea: "Throughput = time per task ÷ k (pipeline), then × issue width (superscalar).",
    visual: {
      type: "pipeline",
      data: {
        title: "Classic 5-stage RISC pipeline (temporal parallelism)",
        stages: ["IF — fetch", "ID — decode", "EX — execute", "MEM — access", "WB — write back"],
        note: "One instruction leaves the pipe every cycle once full.",
      },
    },
    keyPoints: [
      "Pipeline depth k: increases throughput, single-task latency stays ~k cycles.",
      "Hazards: structural (resource), data (RAW/WAR/WAW), control (branches).",
      "Superscalar issues >1 instr/cycle — needs multiple ALUs + dependency detection.",
      "CPI = 1/k for ideal pipeline; superscalar pushes CPI below 1 (IPC > 1).",
    ],
    examPoints: [
      "Define the three hazard types and one fix for each.",
      "Pipeline throughput vs latency — the fundamental trade-off to state.",
    ],
    memoryTrigger: "Pipeline = assembly line. Superscalar = two assembly lines at once.",
  },
  {
    id: "linear-pipeline",
    title: "Linear Pipeline Processors",
    unit: "III",
    category: "Pipelining Techniques",
    importance: "HIGH",
    definition:
      "A linear (unifunctional) pipeline is one straight line of stages with no feedback or branching. Work flows in one direction — used for a single fixed function like floating-point add or multiply.",
    coreIdea: "Strictly one-way flow: every data item visits every stage exactly once, in order.",
    visual: {
      type: "spacetime",
      data: {
        title: "Space–Time Diagram — Linear Pipeline",
        note: "Step through cycles to watch tasks flow (tap Next/Prev).",
        stages: ["S1", "S2", "S3", "S4"],
      },
    },
    keyPoints: [
      "Throughput of a k-stage linear pipe: one result per cycle after the fill time.",
      "First output at cycle k (fill), then one every beat.",
      "No feedback edge → no scheduling/collision problem (unlike non-linear).",
      "Used for vector ops: add, multiply, and floating-point pipelines.",
    ],
    examPoints: [
      "Draw the space-time diagram — almost guaranteed long question.",
      "Time to first output = k, steady throughput = 1/cycle.",
    ],
    memoryTrigger: "Linear = one-way street. Everything rides straight through.",
  },
  {
    id: "nonlinear-pipeline",
    title: "Non-Linear Pipeline Processors",
    unit: "III",
    category: "Pipelining Techniques",
    importance: "HIGH",
    definition:
      "A non-linear (multifunctional) pipeline has feedback and feed-forward edges and can implement several functions. Scheduling uses a reservation table to avoid collisions when recursive/iterative tasks revisit stages.",
    coreIdea: "Recursion means tasks jump back to earlier stages — you must schedule to avoid two tasks colliding on one stage.",
    visual: {
      type: "reservation",
      data: {
        title: "Reservation table — mark stage-busy cells per time step",
        note: "Tap cells to build/clear reservations; collision-free start times must not overlap busy marks.",
        stages: ["S1", "S2", "S3", "S4"],
        timeSteps: 6,
      },
    },
    keyPoints: [
      "Reservation table: rows = stages, columns = time; 'X' marks a stage busy at that beat.",
      "Collision vector = which start-time delays would cause an overlap → legal start times.",
      "Latency analysis minimises average initiation interval.",
      "Multifunctional pipes can recycle stages to different function units.",
    ],
    examPoints: [
      "Build a reservation table / find collision-free initiation intervals — classic long answer.",
      "Collision vector & forbidden latencies are the standard exam formulas.",
    ],
    memoryTrigger: "Non-linear = roundabout, not a one-way street. Watch for collisions at the merge.",
  },
];