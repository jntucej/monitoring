import type { DccnCheatTopic } from "./types";

export const unit1Topics: DccnCheatTopic[] = [
  {
    id: "osi-vs-tcpip-model",
    unit: "I",
    title: "OSI 7-Layer Model vs TCP/IP Protocol Suite",
    category: "Layer Models",
    importance: "HIGH",
    definition:
      "OSI is a 7-layer theoretical reference model; TCP/IP is a 4/5-layer practical protocol architecture powering the global Internet.",
    differences: [
      { feature: "Layers", valA: "7 Layers (Physical, DLink, Net, Trans, Sess, Pres, App)", valB: "4 Layers (Net Access, Internet, Transport, App)" },
      { feature: "Design Philosophy", valA: "Strict layer separation before protocol design", valB: "Protocols designed first, layers fitted around them" },
      { feature: "Transport Delivery", valA: "Supports Connectionless & Connection-oriented", valB: "TCP (Connection-oriented) and UDP (Connectionless)" },
    ],
    examPoints: [
      "Draw OSI 7-layer stack and map corresponding TCP/IP protocols at each layer.",
      "Explain functions of Data Link Layer (framing, MAC) vs Network Layer (routing).",
    ],
    memoryTrigger: "OSI = Please Do Not Touch All Physical (Physical, DLink, Net, Trans, Sess, Pres, App).",
    keywords: ["OSI model", "TCP IP", "7 layers", "encapsulation", "PDU"],
  },
  {
    id: "crc-error-detection",
    unit: "I",
    title: "Cyclic Redundancy Check (CRC) Worked Numerical",
    category: "Error & Flow Control",
    importance: "HIGH",
    definition:
      "CRC is a hardware error-detection method based on polynomial modulo-2 division.",
    formula: {
      expression: "Transmitted Frame T(x) = M(x) · 2^k + R(x)   where R(x) = Remainder[ (M(x) · 2^k) / G(x) ]",
      symbols: { M: "Original Message", G: "Generator Polynomial of degree k", R: "CRC Remainder (k bits)" },
    },
    steps: [
      "1. Append k zeros to Message M(x) where k = degree of generator G(x).",
      "2. Perform Modulo-2 binary division of appended message by G(x).",
      "3. Replace appended zeros with the k-bit remainder R(x) to get transmitted frame T(x).",
      "4. Receiver divides T(x) by G(x): If remainder == 0, NO error detected!",
    ],
    examPoints: [
      "Compute 3-bit CRC remainder for given message and generator G(x) = x³ + x + 1.",
      "Explain why CRC catches all single-bit and odd-number bit errors.",
    ],
    memoryTrigger: "CRC: Append k zeros → Modulo-2 XOR division → Replace zeros with remainder.",
    keywords: ["CRC", "cyclic redundancy check", "modulo 2 division", "generator polynomial"],
  },
  {
    id: "sliding-window-arq",
    unit: "I",
    title: "Sliding Window ARQ: Stop & Wait, Go-Back-N, Selective Repeat",
    category: "Error & Flow Control",
    importance: "HIGH",
    definition:
      "Automatic Repeat reQuest (ARQ) flow and error control protocols ensure reliable delivery over noisy channels.",
    differences: [
      { feature: "Sender Window Size (W_S)", valA: "Stop-and-Wait: W_S = 1", valB: "Go-Back-N: W_S = N", valC: "Selective Repeat: W_S = 2^(n-1)" },
      { feature: "Receiver Window (W_R)", valA: "Stop-and-Wait: W_R = 1", valB: "Go-Back-N: W_R = 1", valC: "Selective Repeat: W_R = 2^(n-1)" },
      { feature: "Retransmission", valA: "1 frame on timeout", valB: "All N unACKed frames from corrupted frame", valC: "Only damaged/lost frame" },
    ],
    formula: {
      expression: "Efficiency η = W_S / (1 + 2a)   where a = T_prop / T_trans",
      symbols: { T_prop: "Propagation delay", T_trans: "Transmission delay", a: "Delay ratio" },
    },
    examPoints: [
      "Calculate efficiency η for Stop-and-Wait vs Go-Back-N given bandwidth and propagation distance.",
      "Explain why Selective Repeat requires W_S = W_R ≤ 2^(n-1) to avoid sequence number ambiguity.",
    ],
    memoryTrigger: "Stop-Wait (1,1), GBN (N,1), Selective Repeat (N, N). Efficiency = W / (1 + 2a).",
    keywords: ["sliding window", "ARQ", "Go Back N", "Selective Repeat", "efficiency formula"],
  },
];
