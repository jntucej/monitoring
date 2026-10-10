import { GateStatus } from "@/context/GlassContext";
import { MockDataGenerator, GateStatusChangePayload, AlertPayload } from "./mockData";

type TrafficCallback = (traffic: number) => void;
type StatusCallback = (data: GateStatusChangePayload) => void;
type AlertCallback = (data: AlertPayload) => void;
type ConnectionCallback = (connected: boolean, isMock?: boolean) => void;

export type WSEvent = "traffic" | "status" | "alert" | "connection";

export class GateMonitorWS {
  private url: string;
  private socket: WebSocket | null = null;
  private mockGenerator: MockDataGenerator | null = null;
  public isConnected: boolean = false;
  public mockMode: boolean;
  public isMockFallback: boolean = false;

  private trafficListeners: Set<TrafficCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private alertListeners: Set<AlertCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();

  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 8;
  private baseReconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitlyClosed: boolean = false;

  constructor(url?: string, mockMode?: boolean) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    this.mockMode = mockMode ?? process.env.NEXT_PUBLIC_WS_MOCK === "true";
  }

  public connect(): void {
    this.isExplicitlyClosed = false;

    if (this.mockMode) {
      this.startMockMode();
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch {
          // Ignore invalid payload
        }
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyConnectionChange(false);
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.isConnected = false;
      this.notifyConnectionChange(false);
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    // Close SSE fallback if active
    if ((this as any)._sseSource) {
      (this as any)._sseSource.close();
      (this as any)._sseSource = null;
    }
    if (this.mockGenerator) {
      this.mockGenerator.stop();
      this.mockGenerator = null;
    }
    this.isConnected = false;
    this.notifyConnectionChange(false);
  }

  public setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
    if (enabled) {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this.startMockMode();
    } else {
      if (this.mockGenerator) {
        this.mockGenerator.stop();
        this.mockGenerator = null;
      }
      this.connect();
    }
  }

  /** Generic subscribe method */
  public subscribe(event: WSEvent, callback: (...args: any[]) => void): () => void {
    if (event === "traffic") {
      this.trafficListeners.add(callback as TrafficCallback);
      return () => this.trafficListeners.delete(callback as TrafficCallback);
    }
    if (event === "status") {
      this.statusListeners.add(callback as StatusCallback);
      return () => this.statusListeners.delete(callback as StatusCallback);
    }
    if (event === "alert") {
      this.alertListeners.add(callback as AlertCallback);
      return () => this.alertListeners.delete(callback as AlertCallback);
    }
    if (event === "connection") {
      this.connectionListeners.add(callback as ConnectionCallback);
      callback(this.isConnected);
      return () => this.connectionListeners.delete(callback as ConnectionCallback);
    }
    return () => {};
  }

  public onTrafficUpdate(callback: TrafficCallback): () => void {
    this.trafficListeners.add(callback);
    return () => {
      this.trafficListeners.delete(callback);
    };
  }

  public onGateStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public onAlert(callback: AlertCallback): () => void {
    this.alertListeners.add(callback);
    return () => {
      this.alertListeners.delete(callback);
    };
  }

  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private handleIncomingMessage(data: any): void {
    if (data.type === "traffic" && typeof data.traffic === "number") {
      this.trafficListeners.forEach((fn) => fn(data.traffic));
    } else if (data.type === "status" && data.gateId && data.status) {
      this.statusListeners.forEach((fn) =>
        fn({ gateId: data.gateId, status: data.status, timestamp: data.timestamp || Date.now() })
      );
    } else if (data.type === "alert" && data.gateId && data.message) {
      this.alertListeners.forEach((fn) =>
        fn({
          gateId: data.gateId,
          message: data.message,
          severity: data.severity || "warning",
          timestamp: data.timestamp || Date.now(),
        })
      );
    }
  }

  private startMockMode(): void {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ALLOW_MOCK_WS !== "true") {
      console.error("[ws] Mock WebSocket mode blocked in production environment.");
      return;
    }
    if (this.mockGenerator) {
      this.mockGenerator.stop();
    }
    this.isConnected = true;
    this.notifyConnectionChange(true);
    this.mockGenerator = new MockDataGenerator(
      (traffic) => this.trafficListeners.forEach((fn) => fn(traffic)),
      (statusData) => this.statusListeners.forEach((fn) => fn(statusData)),
      (alertData) => {
        // Tag mock alert and skip critical escalation in production
        const taggedAlert = { ...alertData, isMock: true };
        this.alertListeners.forEach((fn) => fn(taggedAlert));
      }
    );
    this.mockGenerator.start();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Fallback gracefully to SSE stream when WebSocket fails
      this.connectSSEFallback();
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /** Fallback to Server-Sent Events when WebSocket is unavailable */
  private connectSSEFallback(): void {
    if (this.mockMode) return; // Don't fallback if mock mode is forced
    
    const sseUrl = this.url.replace(/^ws:\/\//i, 'http://').replace(/^wss:\/\//i, 'https://');
    const eventSource = new EventSource(sseUrl);
    
    eventSource.onopen = () => {
      this.isConnected = true;
      this.isMockFallback = true;
      this.notifyConnectionChange(true, true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleIncomingMessage(data);
      } catch {
        // Ignore invalid payload
      }
    };
    
    eventSource.onerror = () => {
      this.isConnected = false;
      eventSource.close();
      this.notifyConnectionChange(false);
    };
    
    // Store reference for cleanup
    (this as any)._sseSource = eventSource;
  }

  private notifyConnectionChange(connected: boolean, isMock?: boolean): void {
    const isMockData = isMock !== undefined ? isMock : (this.mockMode || this.isMockFallback);
    this.connectionListeners.forEach((fn) => fn(connected, isMockData));
  }
}
