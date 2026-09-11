import type { AutomataCheatTopic } from "./types";

export const unit4Topics: AutomataCheatTopic[] = [
  {
    id: "turing-machine-definition",
    unit: "IV",
    title: "Turing Machine Model & Instantaneous Descriptions",
    category: "Turing Machines",
    importance: "HIGH",
    definition:
      "A Turing Machine (TM) is a 7-tuple mathematical model of computation consisting of an infinite tape, a read/write head, and a state control.",
    coreIdea: "Transition δ(q, X) = (p, Y, L/R): Read X, write Y, change state to p, move head Left or Right.",
    formula: {
      expression: "TM M = (Q, Σ, Γ, δ, q₀, B, F)   •   δ: Q × Γ → Q × Γ × {L, R}",
      symbols: { Q: "States", Σ: "Input alphabet", Γ: "Tape alphabet (Σ ⊂ Γ)", B: "Blank symbol", F: "Final states" },
    },
    examPoints: [
      "State 7-tuple formal definition of Turing Machine.",
      "Design Turing Machine for unary addition, multiplication, or L = {aⁿbⁿcⁿ | n ≥ 1}.",
    ],
    memoryTrigger: "TM = Infinite Tape + Read/Write Head + Left/Right movement. Ultimate computing model!",
    keywords: ["Turing Machine", "7 tuple", "read write head", "tape symbol", "L R move"],
  },
  {
    id: "universal-turing-machine",
    unit: "IV",
    title: "Universal Turing Machine (UTM) & Church-Turing Thesis",
    category: "Turing Machines",
    importance: "MEDIUM",
    definition:
      "A Universal Turing Machine (UTM) can simulate any arbitrary Turing Machine M on input w by reading an encoded description ⟨M, w⟩.",
    coreIdea: "Church-Turing Thesis: Any algorithmically computable function can be computed by a Turing Machine.",
    examPoints: [
      "Explain how UTM acts as a stored-program computer.",
      "State Church-Turing Thesis and its implications for undecidability.",
    ],
    memoryTrigger: "UTM = Programmed TM simulator (Original concept of general-purpose computer).",
    keywords: ["UTM", "Universal Turing Machine", "Church Turing Thesis", "encoded machine", "computation"],
  },
];
