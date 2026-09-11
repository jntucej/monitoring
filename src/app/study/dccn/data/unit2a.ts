import type { DccnCheatTopic } from "./types";

export const unit2Topics: DccnCheatTopic[] = [
  {
    id: "csma-cd-vs-ca",
    unit: "II",
    title: "CSMA/CD (Ethernet) vs CSMA/CA (Wi-Fi)",
    category: "MAC Protocols",
    importance: "HIGH",
    definition:
      "Carrier Sense Multiple Access protocols manage shared medium access to minimize or handle packet collisions.",
    differences: [
      { feature: "CSMA/CD (Wired)", valA: "Collision Detection", valB: "Aborts transmission immediately upon collision and sends Jam Signal." },
      { feature: "CSMA/CA (Wireless)", valA: "Collision Avoidance", valB: "Uses RTS/CTS handshake & IFS backoff timers because wireless nodes cannot detect collisions while transmitting (hidden terminal problem)." },
    ],
    formula: {
      expression: "Min Frame Length L_min = 2 · T_prop · Bandwidth",
      symbols: { T_prop: "Max propagation delay across physical cable length" },
      examNote: "Minimum frame size ensures sender stays transmitting long enough to detect collision!",
    },
    examPoints: [
      "Derive minimum Ethernet frame size formula L_min = 2 × T_prop × B (64 bytes for 10 Mbps Ethernet).",
      "Explain Binary Exponential Backoff algorithm.",
    ],
    memoryTrigger: "CSMA/CD = Detect & Jam (Ethernet). CSMA/CA = Avoid & RTS/CTS (Wi-Fi).",
    keywords: ["CSMA CD", "CSMA CA", "collision detection", "jam signal", "RTS CTS", "minimum frame size"],
  },
];
