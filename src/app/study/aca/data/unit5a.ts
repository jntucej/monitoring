import type { AcaCheatTopic } from "./types";

export const unit5Topics: AcaCheatTopic[] = [
  {
    id: "vector-processing-chaining",
    unit: "V",
    title: "Vector Processors & Chaining",
    category: "Vector Computing",
    importance: "HIGH",
    definition:
      "Vector processors operate on entire 1D data arrays (vectors) in a single instruction using heavily pipelined functional units.",
    coreIdea: "Vector Chaining connects output of one vector pipeline directly into input of another without waiting for full vector completion.",
    formula: {
      expression: "Chaining Time = [s₁ + s₂ + (n - 1)] · τ",
      symbols: { s1: "Pipeline 1 startup latency", s2: "Pipeline 2 startup latency", n: "Vector length" },
      examNote: "Chaining reduces total execution time from (s₁ + n + s₂ + n) to (s₁ + s₂ + n).",
    },
    examPoints: [
      "Calculate speedup gained by Vector Chaining (Cray-1 model).",
      "Explain Vector Register File and Mask Register usage.",
    ],
    memoryTrigger: "Chaining = Forwarding between vector functional pipelines. Stream results immediately!",
    keywords: ["vector processor", "chaining", "Cray-1", "vector registers", "pipelined ALU"],
  },
  {
    id: "gpu-architecture-cuda",
    unit: "V",
    title: "GPU Architectures & SIMT Execution (CUDA)",
    category: "GPU & SIMT",
    importance: "HIGH",
    definition:
      "Graphics Processing Units (GPUs) execute thousands of parallel threads using Single Instruction, Multiple Threads (SIMT) across Streaming Multiprocessors (SM).",
    coreIdea: "Threads grouped into Warps (32 threads). All threads in a warp execute the same instruction in lockstep.",
    steps: [
      "1. Host (CPU) allocates Device (GPU) memory: cudaMalloc().",
      "2. Host transfers data to Device: cudaMemcpy(HostToDevice).",
      "3. Kernel Launch: Execute kernel<<<Blocks, Threads>>> on GPU SMs.",
      "4. Warp Scheduler executes 32 threads in lockstep.",
      "5. Transfer results back to Host: cudaMemcpy(DeviceToHost).",
    ],
    examPoints: [
      "Explain SIMD vs SIMT execution model.",
      "Identify Warp Divergence (branch divergence) penalty in GPU code.",
    ],
    memoryTrigger: "SIMT = 32 threads/warp executing in lockstep. Avoid branch divergence inside warps!",
    keywords: ["GPU architecture", "SIMT", "CUDA", "warp divergence", "streaming multiprocessor"],
  },
];
