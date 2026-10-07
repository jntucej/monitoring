import { GateStatus } from "@/context/GlassContext";

export interface GateStatusChangePayload {
  gateId: string;
  status: GateStatus;
  timestamp: number;
}

export interface AlertPayload {
  gateId: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: number;
}

const GATES = ["gate-1", "gate-2", "gate-3", "gate-4"];

/** Return random int in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomTraffic(): number {
  return randInt(15, 95);
}

/** Status patterns per spec:
 *  gate-1: idle ↔ entry
 *  gate-2: idle ↔ exit
 *  gate-3: idle ↔ entry
 *  gate-4: idle (mostly), occasionally warning
 */
export function getStatusForGate(gateId: string, _currentStatus?: GateStatus): GateStatus {
  if (gateId === "gate-4") {
    // 15% chance of warning, otherwise idle
    return Math.random() < 0.15 ? "warning" : "idle";
  }

  const r = Math.random();
  if (gateId === "gate-1" || gateId === "gate-3") {
    // Toggle between idle and entry
    return r < 0.5 ? "entry" : "idle";
  }
  // gate-2: toggle between idle and exit
  return r < 0.5 ? "exit" : "idle";
}

export function getRandomGateId(): string {
  return GATES[Math.floor(Math.random() * GATES.length)];
}

export class MockDataGenerator {
  private trafficTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private alertTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    private onTraffic: (traffic: number) => void,
    private onStatus: (data: GateStatusChangePayload) => void,
    private onAlert: (data: AlertPayload) => void
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Traffic updates every 2–4 seconds (range 15–95)
    const scheduleTraffic = () => {
      if (!this.isRunning) return;
      const traffic = getRandomTraffic();
      this.onTraffic(traffic);
      const nextDelay = randInt(2000, 4000);
      this.trafficTimer = setTimeout(scheduleTraffic, nextDelay);
    };

    // Status updates every 2–5 seconds
    const scheduleStatus = () => {
      if (!this.isRunning) return;
      const gateId = getRandomGateId();
      const status = getStatusForGate(gateId);
      this.onStatus({
        gateId,
        status,
        timestamp: Date.now(),
      });

      if (status === "warning") {
        this.onAlert({
          gateId,
          message: `Security warning triggered at ${gateId.toUpperCase()}`,
          severity: "warning",
          timestamp: Date.now(),
        });
      }

      const nextDelay = randInt(2000, 5000);
      this.statusTimer = setTimeout(scheduleStatus, nextDelay);
    };

    // Periodic alerts every 10–15 seconds
    const scheduleAlerts = () => {
      if (!this.isRunning) return;
      const gateId = getRandomGateId();
      this.onAlert({
        gateId,
        message: `High traffic load pulse registered at ${gateId.toUpperCase()}`,
        severity: "info",
        timestamp: Date.now(),
      });
      const nextDelay = randInt(10000, 15000);
      this.alertTimer = setTimeout(scheduleAlerts, nextDelay);
    };

    scheduleTraffic();
    scheduleStatus();
    scheduleAlerts();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.trafficTimer) clearTimeout(this.trafficTimer);
    if (this.statusTimer) clearTimeout(this.statusTimer);
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.trafficTimer = null;
    this.statusTimer = null;
    this.alertTimer = null;
  }
}
