import type { AcaCheatTopic } from "./types";

export const unit3Topics: AcaCheatTopic[] = [
  {
    id: "mesi-protocol",
    unit: "III",
    title: "MESI & MOESI Cache Coherence Protocols",
    category: "Cache Coherence",
    importance: "HIGH",
    definition:
      "Snooping-based cache coherence protocols maintain consistency across private caches connected to a shared bus.",
    coreIdea: "MESI States: Modified (M), Exclusive (E), Shared (S), Invalid (I). MOESI adds Owner (O) to eliminate memory writes on sharing.",
    differences: [
      { feature: "Modified (M)", valA: "Dirty, Exclusive", valB: "Only this cache has block; modified relative to memory." },
      { feature: "Exclusive (E)", valA: "Clean, Exclusive", valB: "Only this cache has block; matches memory." },
      { feature: "Shared (S)", valA: "Clean, Shared", valB: "Multiple caches may have block." },
      { feature: "Owner (O - MOESI)", valA: "Dirty, Shared", valB: "Owns modified block and serves read requests to other caches without writing to RAM." },
    ],
    examPoints: [
      "Draw state transition diagram for MESI protocol on Read/Write Hits and Misses.",
      "Explain advantage of MOESI Owner state over MESI.",
    ],
    memoryTrigger: "MESI = M(Dirty-Solo), E(Clean-Solo), S(Clean-Multi), I(Invalid).",
    keywords: ["MESI", "MOESI", "cache coherence", "snooping protocol", "bus invalidate"],
  },
  {
    id: "directory-coherence",
    unit: "III",
    title: "Directory-Based Cache Coherence",
    category: "Cache Coherence",
    importance: "HIGH",
    definition:
      "Directory-based protocols maintain centralized or distributed bit-vectors tracking which nodes share each memory block, scaling beyond bus limits.",
    coreIdea: "Avoids bus broadcasting! Point-to-point messages sent only to caches holding the block.",
    steps: [
      "1. Home Node receives Read/Write request from Requesting Node.",
      "2. Directory checks presence bit-vector for block.",
      "3. Send point-to-point Invalidates / Interrogations only to sharer nodes.",
      "4. Sharers acknowledge Home Node → Data sent to Requesting Node.",
    ],
    examPoints: [
      "Compare Snooping vs Directory Coherence scalability.",
      "Calculate directory overhead memory footprint: N nodes × block count.",
    ],
    memoryTrigger: "Directory = Central/Distributed Bit-Vector of Sharers (Scales to 1000s of cores).",
    keywords: ["directory coherence", "home node", "point to point", "scalability", "sharer vector"],
  },
  {
    id: "memory-consistency-models",
    unit: "III",
    title: "Sequential Consistency & Weak Consistency",
    category: "Memory Models",
    importance: "MEDIUM",
    definition:
      "Memory consistency defines the legal ordering of memory operations (Reads/Writes) across multiple processors.",
    coreIdea: "Sequential Consistency (SC) requires all operations to appear in some sequential order consistent with program order.",
    examPoints: [
      "Define Leslie Lamport's Sequential Consistency definition.",
      "Explain how store buffers and out-of-order execution violate SC without Memory Barriers (Fences).",
    ],
    memoryTrigger: "SC = Interleaved Global Order matching Program Order.",
    keywords: ["sequential consistency", "weak consistency", "memory barrier", "fence", "program order"],
  },
];
