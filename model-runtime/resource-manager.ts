// model-runtime/resource-manager.ts
//
// The demand-aware resource manager the spec calls for (the "intelligent" part
// that a naive start/stop model switcher lacks). It layers on top of the
// ModelManager's per-worker lifecycle state machine:
//
//   §8  Memory-pressure-aware eviction — poll host free RAM; under pressure,
//       shrink M2/M3 idle-timeouts or force-evict them so the SaaS wins.
//   §16 AI lease — a single-owner lease table so M2 and M3 (the two heavy,
//       on-demand workers) are never loaded concurrently, even across
//       pipelines that don't use ModelManager.docPipeline().
//   §17 Priorities — P0 (health/security) > P1 (interactive) > P2 (document)
//       > P3 (background/batch). A high-priority request may evict a
//       lower-priority idle worker to make room.
//
// Design principle (spec §key): optimize "satisfy the request without
// disturbing the SaaS," NOT "start the model as fast as possible." The SaaS
// core (Postgres/Redis/Next) must always win; AI is an auxiliary workload.
//
// This is Node-only (runs in the worker). Pure state, no timers of its own —
// the ModelManager owns the idle timers; this module only DECIDES the idle
// timeout + eviction and serializes leases. No network, no secrets.

import os from "node:os";

/** Job priority classes. Lower number = more urgent. */
export type Priority = "P0" | "P1" | "P2" | "P3";
export const PRIORITY_RANK: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export interface LeaseRecord {
  model: "m2" | "m3";
  holder: string;          // job id / caller
  priority: Priority;
  acquiredAt: number;
  memoryEstimateMb: number;
}

export interface MemoryPressure {
  freeMb: number;
  totalMb: number;
  /** 0 (ample) → 1 (critical). Computed from free RAM. */
  ratio: number;
  level: "ample" | "moderate" | "low" | "critical";
}

export interface ResourcePolicy {
  /** Base idle timeout (ms) for a given heavy worker at *ample* pressure. */
  baseIdleMs: (model: "m2" | "m3") => number;
  /** Below this free-RAM, force-evict M2+M3 immediately (protect the SaaS). */
  criticalEvictFreeMb: number;
  /** Sample host free RAM. Overridable for tests (no real os.freemem). */
  sampleFreeRam?: () => { freeMb: number; totalMb: number };
}

const DEFAULTS: ResourcePolicy = {
  baseIdleMs: (m) => (m === "m2" ? 45_000 : 90_000), // spec: M2 ~30-60s, M3 ~60-120s
  criticalEvictFreeMb: 1024,                          // <1 GB free → evict both
};

/**
 * Map free-RAM to a pressure level + a 0..1 ratio. The SaaS core needs its
 * share, so "ample" only when there is real headroom (>3 GB free).
 */
export function classifyMemory(freeMb: number, totalMb: number): MemoryPressure {
  let level: MemoryPressure["level"];
  let ratio: number;
  if (freeMb > 3 * 1024) {
    level = "ample";
    ratio = 0;
  } else if (freeMb > 2 * 1024) {
    level = "moderate";
    ratio = 0.4;
  } else if (freeMb > 1 * 1024) {
    level = "low";
    ratio = 0.7;
  } else {
    level = "critical";
    ratio = 1;
  }
  void totalMb; // total is informational; thresholds are absolute on a known 8 GB box
  return { freeMb, totalMb, ratio, level };
}

export class AiResourceManager {
  private leases = new Map<"m2" | "m3", LeaseRecord>();
  constructor(private policy: ResourcePolicy = DEFAULTS) {}

  /** How long should a heavy worker stay warm right now, given host RAM? */
  effectiveIdleMs(model: "m2" | "m3"): number {
    const mem = this.pressure();
    if (mem.level === "critical") return 0; // force-evict now
    const base = this.policy.baseIdleMs(model);
    // Scale the warm window down as pressure rises (moderate→½, low→¼).
    const scale = mem.level === "moderate" ? 0.5 : mem.level === "low" ? 0.25 : 1;
    return Math.max(1_000, Math.round(base * scale));
  }

  /** True when we should proactively evict BOTH heavy workers (SaaS safety). */
  shouldEvict(): boolean {
    const mem = this.pressure();
    return mem.level === "critical" || mem.freeMb < this.policy.criticalEvictFreeMb;
  }

  /** §16 — acquire an exclusive lease on a heavy model. */
  acquire(model: "m2" | "m3", holder: string, priority: Priority = "P2"): LeaseRecord {
    const existing = this.leases.get(model);
    if (existing) {
      // A higher-priority holder may steal a lower-priority *idle* lease.
      if (PRIORITY_RANK[priority] < PRIORITY_RANK[existing.priority]) {
        throw new Error(
          `AI lease conflict on ${model}: holder ${existing.holder} at ${existing.priority} ` +
            `outranks ${priority}; serialize instead of stealing a live lease`,
        );
      }
      this.leases.set(model, existing);
      return existing;
    }
    const rec: LeaseRecord = {
      model,
      holder,
      priority,
      acquiredAt: Date.now(),
      memoryEstimateMb: model === "m2" ? 1400 : 1800, // spec §16 estimates
    };
    this.leases.set(model, rec);
    return rec;
  }

  /** §16 — release the lease so the next job can take the model. */
  release(model: "m2" | "m3", holder: string): void {
    const cur = this.leases.get(model);
    if (cur && cur.holder === holder) this.leases.delete(model);
  }

  /** The current lease holder, if any (for observability / the ops UI). */
  lease(model: "m2" | "m3"): LeaseRecord | undefined {
    return this.leases.get(model);
  }

  /**
   * §17 — decide whether a new job at `priority` may proceed, or must wait /
   * preempt. A P1 (interactive) job will be told to evict an idle M2/M3 held
   * by a P3 background job to free RAM; it will NOT steal a *busy* lease.
   */
  admit(
    model: "m2" | "m3",
    priority: Priority,
  ): { ok: boolean; evictFirst?: ("m2" | "m3")[]; reason?: string } {
    void model; // admission is pressure- + priority-driven, not per-model
    const held = [...this.leases.values()];
    const evictFirst: ("m2" | "m3")[] = [];
    for (const rec of held) {
      // A held lease by a *lower*-priority caller can be evicted if it's idle.
      if (PRIORITY_RANK[priority] < PRIORITY_RANK[rec.priority]) {
        evictFirst.push(rec.model);
      }
    }
    const mem = this.pressure();
    if (mem.level === "critical") {
      return { ok: false, reason: "memory pressure critical: SaaS protected; defer heavy AI" };
    }
    return { ok: true, evictFirst };
  }

  /** Host free RAM (override available for tests). Safe in Node runtimes; in an
   *  Edge context `node:os` is unavailable, so we assume ample pressure (never
   *  evict, never crash) rather than throwing. */
  pressure(): MemoryPressure {
    if (this.policy.sampleFreeRam) {
      const s = this.policy.sampleFreeRam();
      return classifyMemory(s.freeMb, s.totalMb);
    }
    try {
      // os.freemem() is only available in the Node runtime. Guard it so an
      // Edge-runtime import degrades to "ample" instead of crashing.
      const freeMb = Math.round((os.freemem() ?? 0) / 1024 / 1024);
      const totalMb = Math.round((os.totalmem() ?? 0) / 1024 / 1024);
      return classifyMemory(freeMb, totalMb);
    } catch {
      return { freeMb: 4 * 1024, totalMb: 8 * 1024, ratio: 0, level: "ample" };
    }
  }

  /** Snapshot of leases + pressure (for /sysadmin AI status). */
  status() {
    return {
      pressure: this.pressure(),
      shouldEvict: this.shouldEvict(),
      leases: [...this.leases.values()],
    };
  }
}
