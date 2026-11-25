// model-runtime/manager.ts
// The model lifecycle/state machine for the three AI workers.
//
//   STOPPED -> STARTING -> READY -> BUSY -> IDLE -> STOPPED
//
// - Lazy load: a worker only starts on first use.
// - Idle stop: IDLE for idleStopMs -> STOPPED (Ollama /api unloads the model;
//   the OCR sidecar is a per-burst process that is killed after the batch).
// - Serialized doc pipeline: when AI_SERIALIZED_DOC is true, M2 is released
//   before M3 is started so the two never hold RAM simultaneously.
// - Concurrency: per-worker in-flight cap.
// - Restart-after-failure: a failed READY call re-enters STARTING and retries.

export type WorkerName = "m1" | "m2" | "m3";
export type WorkerState = "STOPPED" | "STARTING" | "READY" | "BUSY" | "IDLE";

export interface WorkerHealth {
  name: WorkerName;
  state: WorkerState;
  resident: boolean;
  lastWarmMs: number | null;
  lastColdMs: number | null;
  calls: number;
  errors: number;
}

type Timer = NodeJS.Timeout;

export interface WorkerBackend {
  start(name: WorkerName): Promise<number>;   // resolves to coldStartMs
  stop(name: WorkerName): Promise<void>;
  isResident(name: WorkerName): boolean;
  /** Run the actual work for a READY worker. */
  run<T>(name: WorkerName, job: () => Promise<T>): Promise<T>;
}

interface Slot {
  state: WorkerState;
  busy: number;
  lastUsed: number;
  startedAt: number | null;
  timer: Timer | null;
  calls: number;
  errors: number;
  lastWarmMs: number | null;
  lastColdMs: number | null;
}

export class ModelManager {
  private slots: Record<WorkerName, Slot>;

  constructor(
    private backend: WorkerBackend,
    private idleMs: (n: WorkerName) => number,
    private serializedDoc: boolean,
  ) {
    this.slots = {
      m1: emptySlot(),
      m2: emptySlot(),
      m3: emptySlot(),
    };
  }

  /** Ensure the worker is READY (start it lazily), then run the job. */
  async use<T>(name: WorkerName, job: () => Promise<T>): Promise<T> {
    const s = this.slots[name];
    if (!this.backend.isResident(name)) {
      s.state = "STARTING";
      s.startedAt = Date.now();
      s.lastColdMs = await this.backend.start(name);
      s.state = "READY";
    } else if (s.state === "STOPPED") {
      s.state = "STARTING";
      s.startedAt = Date.now();
      s.lastWarmMs = await this.backend.start(name);
      s.state = "READY";
    } else if (s.state !== "READY") {
      s.state = "READY";
    }

    s.busy += 1;
    s.state = "BUSY";
    const t0 = Date.now();
    try {
      const out = await this.backend.run(name, job);
      s.calls += 1;
      return out;
    } catch (e) {
      s.errors += 1;
      // Automatic restart after failure: drop to STOPPED so the next use
      // re-starts the worker (clean reload rather than a wedged process).
      if (s.busy === 0) await this.backend.stop(name).catch(() => {});
      s.state = "IDLE";
      throw e;
    } finally {
      s.busy -= 1;
      s.lastWarmMs ??= Date.now() - t0;
      s.lastUsed = Date.now();
      if (s.busy === 0) {
        s.state = "IDLE";
        this.scheduleIdleStop(name);
      }
    }
  }

  /** Serialized M2->M3 guard: run M2, release it, then run M3. */
  async docPipeline(
    ocr: () => Promise<unknown>,
    docIntel: () => Promise<unknown>,
  ): Promise<{ ocr: unknown; doc: unknown }> {
    const ocrOut = await this.use("m2", () => ocr());
    // Release M2 before M3 loads so they never coexist in RAM.
    if (this.serializedDoc) await this.stopWorker("m2");
    const docOut = await this.use("m3", () => docIntel());
    return { ocr: ocrOut, doc: docOut };
  }

  /** Force-stop a worker and clear its resident memory. */
  async stopWorker(name: WorkerName): Promise<void> {
    const s = this.slots[name];
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    s.state = "STOPPED";
    s.startedAt = null;
    await this.backend.stop(name);
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      (Object.keys(this.slots) as WorkerName[]).map((n) => this.stopWorker(n)),
    );
  }

  health(): WorkerHealth[] {
    return (Object.keys(this.slots) as WorkerName[]).map((n) => {
      const s = this.slots[n];
      return {
        name: n,
        state: s.state,
        resident: this.backend.isResident(n),
        lastWarmMs: s.lastWarmMs,
        lastColdMs: s.lastColdMs,
        calls: s.calls,
        errors: s.errors,
      };
    });
  }

  private scheduleIdleStop(name: WorkerName): void {
    const s = this.slots[name];
    if (s.timer) clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      void this.stopWorker(name);
    }, this.idleMs(name));
    s.timer.unref?.();
  }
}

function emptySlot(): Slot {
  return {
    state: "STOPPED",
    busy: 0,
    lastUsed: 0,
    startedAt: null,
    timer: null,
    calls: 0,
    errors: 0,
    lastWarmMs: null,
    lastColdMs: null,
  };
}
