import type { AcaCheatTopic } from "./types";

export const unit2Topics: AcaCheatTopic[] = [
  {
    id: "tomasulo-algorithm",
    unit: "II",
    title: "Tomasulo's Algorithm & Reservation Stations",
    category: "Dynamic Scheduling",
    importance: "HIGH",
    definition:
      "Tomasulo's algorithm enables out-of-order execution by tracking data dependencies dynamically using reservation stations and Common Data Bus (CDB).",
    coreIdea: "Dynamic Register Renaming using Reservation Station tags eliminates WAR and WAW hazards.",
    steps: [
      "1. Issue: Fetch instruction. If reservation station free, issue and rename operands to tags.",
      "2. Execute: Monitor CDB for pending operands. When both ready, execute.",
      "3. Write Result: Broadcast result and tag over CDB to all waiting reservation stations & register file.",
    ],
    examPoints: [
      "Trace reservation station states (Vj, Vk, Qj, Qk, Busy) step-by-step for instruction sequences.",
      "Explain how CDB broadcasting eliminates WAR/WAW hazards.",
    ],
    memoryTrigger: "Tomasulo = Reservation Stations + CDB Broadcast + Register Renaming.",
    keywords: ["Tomasulo", "reservation station", "CDB", "out of order execution", "register renaming"],
  },
  {
    id: "register-renaming",
    unit: "II",
    title: "Hardware Register Renaming",
    category: "Dynamic Scheduling",
    importance: "MEDIUM",
    definition:
      "Register renaming maps architectural registers (e.g. R0-R31) to a larger pool of physical registers to eliminate false dependencies (WAR/WAW).",
    coreIdea: "Architectural registers hold programmer state; Physical registers eliminate false name dependencies.",
    examPoints: [
      "Distinguish True (RAW) vs False (WAR/WAW) dependencies.",
      "Show how RAT (Register Alias Table) maps architectural to physical registers.",
    ],
    memoryTrigger: "WAR/WAW are name hazards, fixed by mapping architectural → physical registers.",
    keywords: ["register renaming", "RAT", "physical registers", "false dependency"],
  },
  {
    id: "reorder-buffer",
    unit: "II",
    title: "Reorder Buffer (ROB) & In-Order Commit",
    category: "Speculation & Branching",
    importance: "HIGH",
    definition:
      "A Reorder Buffer (ROB) holds speculative instruction results out-of-order and commits them in-order to maintain precise exceptions.",
    coreIdea: "Execute Out-of-Order, Commit In-Order!",
    steps: [
      "1. Issue: Allocate entry at tail of ROB.",
      "2. Execute: Compute result and store in ROB entry.",
      "3. Write Result: Broadcast value to ROB and reservation stations.",
      "4. Commit: Update architectural register file only when instruction reaches head of ROB.",
    ],
    examPoints: [
      "Explain how ROB enables precise exception handling during speculative execution.",
      "Trace ROB head/tail pointers and instruction states.",
    ],
    memoryTrigger: "Out-of-Order Execution + In-Order Commit = Precise Exceptions via ROB.",
    keywords: ["ROB", "reorder buffer", "in-order commit", "precise exception", "speculative execution"],
  },
  {
    id: "branch-prediction-hardware",
    unit: "II",
    title: "Branch Target Buffer (BTB) & 2-Bit Predictor",
    category: "Speculation & Branching",
    importance: "HIGH",
    definition:
      "Dynamic branch prediction predicts outcome (Taken/Not-Taken) and target address during IF stage using BTB and saturation counters.",
    coreIdea: "2-bit saturating counter (Strongly Taken, Weakly Taken, Weakly Not-Taken, Strongly Not-Taken) prevents false flips on loop exits.",
    examPoints: [
      "State 4 states of 2-bit branch predictor and draw state transition graph.",
      "Explain BTB structure (Branch PC → Target Address).",
    ],
    memoryTrigger: "2-Bit Counter: Needs 2 consecutive mispredictions to flip state.",
    keywords: ["BTB", "branch target buffer", "2 bit predictor", "saturating counter", "branch penalty"],
  },
];
