/**
 * Command Center — the shape of the /api/admin/overview payload.
 *
 * This is the authoritative type for the sysadmin Command Center dashboard.
 * The payload is a flat, sectioned envelope: every category carries just the
 * few numbers a cockpit tile needs so the page can render KPIs, a service
 * topology, and an attention queue without a per-category fetch.
 */
export interface CommandCenterData {
  command: {
    /** Service health strings: "ok" | "warn" | "error" | "offline" | "degraded". */
    health: string[];
  };
  identity: {
    active: number;
    suspended: number;
    deprovisioned: number;
  };
  access: {
    /** 0..100 MFA enrollment coverage. */
    mfaCoverage: number;
  };
  gates: {
    /** Per-gate status strings, e.g. "online" | "offline". */
    status: string[];
  };
  monitoring: {
    /** 24 hourly error-rate samples (percent). */
    errorRate24h: number[];
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  automation: {
    /** 14 daily run counts. */
    runs14d: number[];
  };
  data: {
    /** 0..1 backup freshness (1 = just backed up). */
    backupFreshness: number;
  };
  reference: {
    departments: number;
    courses: number;
    sections: number;
  };
  platform: {
    envDrift: number;
    schemaDrift: number;
  };
  governance: {
    /** 7 daily audit-event counts. */
    events7d: number[];
  };
  /**
   * Per-page live counts, keyed by page id (e.g. "access" → pending
   * approvals, "alerts" → open alerts). The sidebar renders these as live
   * badges next to each page row.
   */
  counts: Record<string, number>;
}
