import type { DccnCheatTopic } from "./types";

export const unit4Topics: DccnCheatTopic[] = [
  {
    id: "tcp-vs-udp-handshake",
    unit: "IV",
    title: "TCP 3-Way Handshake vs UDP",
    category: "Transport Protocols",
    importance: "HIGH",
    definition:
      "TCP is connection-oriented and reliable with flow/congestion control; UDP is connectionless and low-latency for real-time traffic.",
    differences: [
      { feature: "TCP", valA: "Connection-Oriented (3-Way Handshake)", valB: "Reliable, Ordered, Flow Control (Sliding Window), Congestion Control" },
      { feature: "UDP", valA: "Connectionless (No Handshake)", valB: "Unreliable, Unordered, No Flow Control, Minimal 8-byte header" },
    ],
    steps: [
      "TCP 3-Way Handshake:",
      "1. Client → Server: SYN (seq = x).",
      "2. Server → Client: SYN-ACK (seq = y, ack = x + 1).",
      "3. Client → Server: ACK (seq = x + 1, ack = y + 1). Connection ESTABLISHED!",
    ],
    examPoints: [
      "Draw sequence diagram for TCP 3-Way Handshake and 4-Way Connection Termination (FIN/ACK).",
      "Compare TCP vs UDP header size (20-60 bytes vs 8 bytes).",
    ],
    memoryTrigger: "3-Way Handshake: SYN → SYN-ACK → ACK. TCP = Reliable, UDP = Fast.",
    keywords: ["TCP", "UDP", "3 way handshake", "SYN", "ACK", "connection-oriented"],
  },
  {
    id: "leaky-vs-token-bucket",
    unit: "IV",
    title: "Leaky Bucket vs Token Bucket Traffic Shaping",
    category: "Traffic Shaping",
    importance: "HIGH",
    definition:
      "Traffic shaping algorithms smooth out bursty traffic to prevent network congestion.",
    differences: [
      { feature: "Leaky Bucket", valA: "Constant Output Rate", valB: "Packets leak at a fixed rate regardless of input burstiness. Drops excess packets when bucket full." },
      { feature: "Token Bucket", valA: "Allows Controlled Burst Output", valB: "Tokens added at fixed rate. Packets transmit by consuming tokens. Permits bursts up to bucket capacity." },
    ],
    examPoints: [
      "Compare Leaky Bucket vs Token Bucket for handling bursty video/voice traffic.",
      "Calculate max burst duration for Token Bucket.",
    ],
    memoryTrigger: "Leaky Bucket = Constant Output Rate (No Bursts). Token Bucket = Allows Bursts when tokens available.",
    keywords: ["leaky bucket", "token bucket", "traffic shaping", "congestion control", "bursty traffic"],
  },
];
