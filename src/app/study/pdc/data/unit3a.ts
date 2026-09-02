import type { PdcCheatTopic } from "./types";

// UNIT-III · Memory Organizations
export const unit3aTopics: PdcCheatTopic[] = [
  {
    id: "shared-memory-organizations",
    title: "Shared-Memory Organizations",
    unit: "III",
    category: "Memory Organizations",
    importance: "HIGH",
    definition:
      "How a multiprocessor wires processors to a shared address space: UMA (uniform — all memory equidistant), NUMA (non-uniform — local faster), and COMA (cache-only memory), plus the cache-coherence protocols that keep private caches in line.",
    coreIdea: "Sharing a single address space is easy to program but forces memory + coherence architecture decisions.",
    visual: {
      type: "comparison",
      data: {
        note: "Three shared-memory organisations.",
        rows: [
          { feature: "Access time", valA: "Uniform (UMA)", valB: "Local<remote (NUMA)", valC: "Attraction only (COMA)" },
          { feature: "Memory location", valA: "Centralised", valB: "Distributed but shared", valC: "Distributed cache-only" },
          { feature: "Coherence", valA: "Bus snooping", valB: "Directory / NUMA-aware", valC: "Directory " },
          { feature: "Scalability", valA: "Limited", valB: "Good", valC: "Very good (cache coast)" },
        ],
      },
    },
    keyPoints: [
      "UMA/SMP: symmetric processors + shared bus + snooping; simple but bus-bound.",
      "NUMA: memory distributed among nodes, global address space; local access faster.",
      "CC-NUMA: cache-coherent NUMA (e.g. distributed shared memory).",
      "COMA: caches are the only memory — data migrates toward use.",
      "Write-invalidate / write-update protocols + MESI keep coherence.",
    ],
    examPoints: [
      "Draw & contrast UMA / NUMA / COMA — a very common diagram question.",
      "MESI (Modified-Exclusive-Shared-Invalid) states are classic short-notes.",
    ],
    memoryTrigger: "UMA = one big shared mall; NUMA = your local shops are closer; COMA = stuff sleighs to you.",
  },
  {
    id: "consistency-models",
    title: "Sequential & Weak Consistency Models",
    unit: "III",
    category: "Memory Organizations",
    importance: "HIGH",
    definition:
      "The contract for how memory reads/writes appear ordered to multiple processors: sequential consistency (strict program-order, one interleaving), weak consistency (only synchronisation operations are ordered), and release/acquire variants.",
    coreIdea: "Caches relax strict ordering to gain speed — the software contract must define which orderings you're allowed to see.",
    visual: {
      type: "consistency",
      data: {
        note: "From strictest to loosest — and the price each pays.",
        rows: {
          sequential:
            "Sequential consistency: all processors see a single global order; slow but intuitive.",
          weak:
            "Weak consistency: only explicit sync (lock/unlock) points are ordered; caches free to reorder ordinary ops.",
          release:
            "Release consistency: acquire (before) and release (after) fence the critical section.",
        },
      },
    },
    keyPoints: [
      "Cache coherence (same cache-line value) is NOT the same as memory consistency (global ordering).",
      "Sequential consistency: there exists an interleaving matching program order at every processor.",
      "Weak consistency relaxes data access ordering, keeping only sync ordering.",
      "Release consistency: acquire/acquire-release/release — finer control, higher performance.",
    ],
    examPoints: [
      "Coherence vs consistency — the classic 'don't confuse these two' question.",
      "Order: sequential → processor → weak → release, each sacrifices some ordering for speed.",
    ],
    memoryTrigger: "Coherence = one copy each. Consistency = ONE agreed story for everyone.",
  },
];